import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import test from 'node:test'
import { zipSync, strToU8 } from 'fflate'

test('browser mode syncs a Free project snapshot and exposes it through MCP', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-overleaf-browser-'))
  const port = 49000 + Math.floor(Math.random() * 1000)
  const token = 'test-browser-token'
  const projectId = 'project-free'
  const configPath = join(directory, 'config.json')
  const statePath = join(directory, 'state')
  await writeFile(configPath, JSON.stringify({
    transport: 'browser',
    gitToken: '',
    projectIds: [projectId],
    browser: { port, token },
  }))

  const child = spawn(process.execPath, ['mcp.js'], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      DSH_OVERLEAF_CONFIG_PATH: configPath,
      DSH_OVERLEAF_BROWSER_STATE_DIR: statePath,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  try {
    await waitForLine(child.stderr, /browser bridge listening/)
    const archive = zipSync({
      'main.tex': strToU8('\\section{Application Landscapes}\nOriginal text.\n\\subsection{Clinical Detection}\nClinical text.\n\\section{Discussion}\nLater text.\n'),
      'refs.bib': strToU8('@article{example, title={Example}}\n'),
    })
    const response = await fetch(`http://127.0.0.1:${port}/v1/projects/${projectId}/snapshot`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/zip',
        'X-Overleaf-Project-Name': encodeURIComponent('Free project'),
      },
      body: archive,
    })
    assert.equal(response.status, 200)

    const messages = mcpMessages(child)
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: {
      name: 'get_section_content',
      arguments: { projectName: projectId, filePath: 'main.tex', sectionTitle: 'Application Landscapes' },
    } })}\n`)
    const result = await messages.next()
    const payload = JSON.parse(result.value.result.content[0].text)
    assert.match(payload.content, /Original text/)
    assert.match(payload.content, /Clinical text/)
    assert.doesNotMatch(payload.content, /Later text/)

    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: {
      name: 'write_section',
      arguments: {
        projectName: projectId,
        filePath: 'main.tex',
        sectionTitle: 'Application Landscapes',
        newContent: '\\section{Application Landscapes}\nImproved text.\n',
        commitMessage: 'Improve application landscapes',
      },
    } })}\n`)
    const commandsResponse = await waitForCommands(port, projectId, token)
    const [command] = commandsResponse.commands
    assert.equal(command.filePath, 'main.tex')
    assert.match(command.content, /Improved text/)
    const resultResponse = await fetch(`http://127.0.0.1:${port}/v1/commands/${command.id}/result`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    })
    assert.equal(resultResponse.status, 200)
    const writeResult = await messages.next()
    assert.equal(writeResult.value.id, 2)

    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: {
      name: 'read_file',
      arguments: { projectName: projectId, filePath: 'main.tex' },
    } })}\n`)
    const readResult = await messages.next()
    const updated = JSON.parse(readResult.value.result.content[0].text)
    assert.match(updated.content, /Improved text/)
  } finally {
    child.kill()
    await new Promise((resolve) => child.once('exit', resolve))
    await rm(directory, { recursive: true, force: true })
  }
})

function waitForLine(stream, pattern) {
  return new Promise((resolve, reject) => {
    const lines = createInterface({ input: stream })
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${pattern}`)), 5000)
    lines.on('line', (line) => {
      if (!pattern.test(line)) return
      clearTimeout(timer)
      lines.close()
      resolve(line)
    })
  })
}

async function waitForCommands(port, projectId, token) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(`http://127.0.0.1:${port}/v1/projects/${projectId}/commands`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await response.json()
    if (body.commands?.length) return body
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error('Timed out waiting for browser write command')
}

function mcpMessages(child) {
  const lines = createInterface({ input: child.stdout })
  const queue = []
  const waiters = []
  lines.on('line', (line) => {
    const value = JSON.parse(line)
    const waiter = waiters.shift()
    if (waiter) waiter(value)
    else queue.push(value)
  })
  return {
    next() {
      if (queue.length) return Promise.resolve({ value: queue.shift(), done: false })
      return new Promise((resolve) => waiters.push((value) => resolve({ value, done: false })))
    },
  }
}

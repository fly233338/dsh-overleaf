import { createHash, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { createInterface } from 'node:readline'
import { unzipSync } from 'fflate'
import { CONFIG_PATH, PACKAGE_DIRECTORY, readOverleafConfig } from './config.js'

const TEXT_EXTENSIONS = new Set([
  '.tex', '.bib', '.sty', '.cls', '.bst', '.md', '.txt', '.csv', '.json', '.yaml', '.yml',
])
const STATE_DIRECTORY = process.env.DSH_OVERLEAF_BROWSER_STATE_DIR || join(PACKAGE_DIRECTORY, '.dsh-overleaf-browser')
const PROJECTS_DIRECTORY = join(STATE_DIRECTORY, 'projects')
const MANIFEST_FILE = '.dsh-overleaf-manifest.json'
const pendingWrites = new Map()
const config = await readOverleafConfig(process.env.DSH_OVERLEAF_CONFIG_PATH || CONFIG_PATH)

await mkdir(PROJECTS_DIRECTORY, { recursive: true })
startBridge(config)
startMcp(config)

function startBridge(browserConfig) {
  const port = Number(browserConfig.browser?.port) || 47832
  const token = browserConfig.browser?.token
  const server = createServer(async (request, response) => {
    setCors(response)
    if (request.method === 'OPTIONS') {
      response.writeHead(204)
      response.end()
      return
    }

    try {
      if (request.headers.authorization !== `Bearer ${token}`) {
        sendJson(response, 401, { error: 'Invalid browser bridge token.' })
        return
      }

      const url = new URL(request.url, `http://127.0.0.1:${port}`)
      if (request.method === 'GET' && url.pathname === '/v1/health') {
        sendJson(response, 200, { ok: true, service: 'dsh-overleaf-browser' })
        return
      }

      const snapshotMatch = url.pathname.match(/^\/v1\/projects\/([^/]+)\/snapshot$/)
      if (request.method === 'POST' && snapshotMatch) {
        const projectId = decodeURIComponent(snapshotMatch[1])
        assertAllowedProject(projectId, browserConfig)
        const archive = await readBody(request, 512 * 1024 * 1024)
        const projectName = decodeURIComponent(String(request.headers['x-overleaf-project-name'] || projectId))
        const result = await importSnapshot(projectId, projectName, archive)
        sendJson(response, 200, result)
        return
      }

      const commandsMatch = url.pathname.match(/^\/v1\/projects\/([^/]+)\/commands$/)
      if (request.method === 'GET' && commandsMatch) {
        const projectId = decodeURIComponent(commandsMatch[1])
        assertAllowedProject(projectId, browserConfig)
        const commands = [...pendingWrites.values()]
          .filter((item) => item.projectId === projectId && item.status === 'pending')
          .map(({ resolve: _resolve, reject: _reject, ...item }) => item)
        sendJson(response, 200, { commands })
        return
      }

      const resultMatch = url.pathname.match(/^\/v1\/commands\/([^/]+)\/result$/)
      if (request.method === 'POST' && resultMatch) {
        const command = pendingWrites.get(resultMatch[1])
        if (!command) {
          sendJson(response, 404, { error: 'Unknown write command.' })
          return
        }
        const result = JSON.parse((await readBody(request, 1024 * 1024)).toString('utf8'))
        command.status = result.ok ? 'complete' : 'failed'
        command.result = result
        if (result.ok) command.resolve(result)
        else command.reject(new Error(result.error || 'Browser writeback failed.'))
        sendJson(response, 200, { accepted: true })
        return
      }

      sendJson(response, 404, { error: 'Unknown browser bridge endpoint.' })
    } catch (error) {
      sendJson(response, 400, { error: error.message })
    }
  })

  server.listen(port, '127.0.0.1', () => {
    process.stderr.write(`dsh-overleaf browser bridge listening on http://127.0.0.1:${port}\n`)
  })
}

function startMcp(browserConfig) {
  const input = createInterface({ input: process.stdin, terminal: false })
  input.on('line', async (line) => {
    let request
    try {
      request = JSON.parse(line)
      if (!('id' in request)) return
      const result = await handleMcpRequest(request, browserConfig)
      sendMcp({ jsonrpc: '2.0', id: request.id, result })
    } catch (error) {
      sendMcp({
        jsonrpc: '2.0',
        id: request?.id ?? null,
        error: { code: -32000, message: error.message },
      })
    }
  })
}

async function handleMcpRequest(request, browserConfig) {
  if (request.method === 'initialize') {
    return {
      protocolVersion: request.params?.protocolVersion || '2025-03-26',
      capabilities: { tools: {} },
      serverInfo: { name: 'dsh-overleaf-browser', version: '0.2.0' },
      instructions: 'Call list_projects first. Browser mode requires the Chrome extension and an open Overleaf project tab. Writes apply only when the target file is currently open and unchanged.',
    }
  }
  if (request.method === 'ping') return {}
  if (request.method === 'tools/list') return { tools: toolDefinitions() }
  if (request.method === 'tools/call') {
    const value = await callTool(request.params?.name, request.params?.arguments || {}, browserConfig)
    return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }
  }
  throw new Error(`Unsupported MCP method: ${request.method}`)
}

function toolDefinitions() {
  const projectName = { type: 'string', description: 'Configured Overleaf project ID' }
  return [
    tool('list_projects', 'List configured browser-synced Overleaf projects', {}),
    tool('status_summary', 'Show browser sync status for an Overleaf project', { projectName }),
    tool('list_files', 'List files in a browser-synced Overleaf project', {
      projectName,
      extension: { type: 'string' },
    }),
    tool('read_file', 'Read a text file from a browser-synced Overleaf project', {
      projectName,
      filePath: { type: 'string' },
    }, ['filePath']),
    tool('get_sections', 'List LaTeX section headings in a file', {
      projectName,
      filePath: { type: 'string' },
    }, ['filePath']),
    tool('get_section_content', 'Read one LaTeX section', {
      projectName,
      filePath: { type: 'string' },
      sectionTitle: { type: 'string' },
    }, ['filePath', 'sectionTitle']),
    tool('write_file', 'Write the currently open Overleaf text file with stale-content protection', {
      projectName,
      filePath: { type: 'string' },
      content: { type: 'string' },
      commitMessage: { type: 'string', description: 'Human-readable change summary' },
    }, ['filePath', 'content', 'commitMessage']),
    tool('write_section', 'Replace one section in the currently open Overleaf text file', {
      projectName,
      filePath: { type: 'string' },
      sectionTitle: { type: 'string' },
      newContent: { type: 'string' },
      commitMessage: { type: 'string' },
    }, ['filePath', 'sectionTitle', 'newContent', 'commitMessage']),
  ]
}

function tool(name, description, properties, required = []) {
  return { name, description, inputSchema: { type: 'object', properties, required } }
}

async function callTool(name, args, browserConfig) {
  if (name === 'list_projects') {
    return Promise.all((browserConfig.projectIds || []).map(async (projectId) => ({
      projectId,
      ...(await projectStatus(projectId)),
    })))
  }

  const projectId = args.projectName || browserConfig.projectIds?.[0]
  assertAllowedProject(projectId, browserConfig)
  if (name === 'status_summary') return projectStatus(projectId)
  if (name === 'list_files') {
    const files = await listProjectFiles(projectId)
    return args.extension ? files.filter((file) => file.endsWith(args.extension)) : files
  }
  if (name === 'read_file') return { filePath: args.filePath, content: await readProjectFile(projectId, args.filePath) }
  if (name === 'get_sections') {
    const content = await readProjectFile(projectId, args.filePath)
    return findSections(content).map(({ title, level }) => ({ title, level }))
  }
  if (name === 'get_section_content') {
    const content = await readProjectFile(projectId, args.filePath)
    return sectionContent(content, args.sectionTitle)
  }
  if (name === 'write_section') {
    const before = await readProjectFile(projectId, args.filePath)
    const current = sectionContent(before, args.sectionTitle)
    const after = `${before.slice(0, current.start)}${args.newContent}${before.slice(current.end)}`
    return queueWrite(projectId, args.filePath, before, after, args.commitMessage)
  }
  if (name === 'write_file') {
    const before = await readProjectFile(projectId, args.filePath)
    return queueWrite(projectId, args.filePath, before, args.content, args.commitMessage)
  }
  throw new Error(`Unknown Overleaf tool: ${name}`)
}

async function importSnapshot(projectId, projectName, archive) {
  const files = unzipSync(new Uint8Array(archive))
  const directory = projectDirectory(projectId)
  const temporary = `${directory}.incoming-${randomUUID()}`
  await mkdir(temporary, { recursive: true })
  const manifestFiles = []

  try {
    for (const [rawPath, bytes] of Object.entries(files)) {
      if (rawPath.endsWith('/')) continue
      const filePath = safeRelativePath(rawPath)
      const target = resolveInside(temporary, filePath)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, bytes)
      manifestFiles.push({ path: filePath, sha256: sha256(bytes), size: bytes.length })
    }
    await writeFile(join(temporary, MANIFEST_FILE), `${JSON.stringify({
      projectId,
      projectName,
      syncedAt: new Date().toISOString(),
      files: manifestFiles,
    }, null, 2)}\n`)
    await rm(directory, { recursive: true, force: true })
    await mkdir(dirname(directory), { recursive: true })
    await import('node:fs/promises').then(({ rename }) => rename(temporary, directory))
  } catch (error) {
    await rm(temporary, { recursive: true, force: true })
    throw error
  }
  return { projectId, projectName, fileCount: manifestFiles.length, synced: true }
}

async function projectStatus(projectId) {
  const manifestPath = join(projectDirectory(projectId), MANIFEST_FILE)
  if (!existsSync(manifestPath)) return { synced: false, message: 'Open the project in Chrome and click the dsh-overleaf extension.' }
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  return { synced: true, projectName: manifest.projectName, syncedAt: manifest.syncedAt, fileCount: manifest.files.length }
}

async function listProjectFiles(projectId) {
  const root = projectDirectory(projectId)
  if (!existsSync(join(root, MANIFEST_FILE))) throw new Error('Project is not synced from Chrome yet.')
  const result = []
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === MANIFEST_FILE) continue
      const target = join(directory, entry.name)
      if (entry.isDirectory()) await walk(target)
      else result.push(relative(root, target).split(sep).join('/'))
    }
  }
  await walk(root)
  return result.sort()
}

async function readProjectFile(projectId, filePath) {
  const safePath = safeRelativePath(filePath)
  const extension = safePath.slice(safePath.lastIndexOf('.')).toLowerCase()
  if (!TEXT_EXTENSIONS.has(extension)) throw new Error(`File is not a supported text file: ${safePath}`)
  return readFile(resolveInside(projectDirectory(projectId), safePath), 'utf8')
}

async function queueWrite(projectId, filePath, before, after, message) {
  if (before === after) return { changed: false, message: 'No content change.' }
  const id = randomUUID()
  let resolveWrite
  let rejectWrite
  const completion = new Promise((resolvePromise, rejectPromise) => {
    resolveWrite = resolvePromise
    rejectWrite = rejectPromise
  })
  pendingWrites.set(id, {
    id,
    projectId,
    filePath: safeRelativePath(filePath),
    expectedSha256: sha256(before),
    content: after,
    message,
    status: 'pending',
    createdAt: new Date().toISOString(),
    resolve: resolveWrite,
    reject: rejectWrite,
  })
  const timeout = setTimeout(() => rejectWrite(new Error('Timed out waiting for the Chrome extension. Keep the target file open in Overleaf.')), 55_000)
  try {
    await completion
    await writeFile(resolveInside(projectDirectory(projectId), safeRelativePath(filePath)), after, 'utf8')
    return { changed: true, filePath, message }
  } finally {
    clearTimeout(timeout)
    pendingWrites.delete(id)
  }
}

function findSections(content) {
  const expression = /^\\(section|subsection|subsubsection)\*?\{([^}]+)\}/gm
  const sections = []
  const ranks = { section: 1, subsection: 2, subsubsection: 3 }
  let match
  while ((match = expression.exec(content))) {
    sections.push({ level: match[1], rank: ranks[match[1]], title: match[2].trim(), start: match.index })
  }
  return sections.map((section, index) => ({
    ...section,
    end: sections.slice(index + 1).find((candidate) => candidate.rank <= section.rank)?.start ?? content.length,
  }))
}

function sectionContent(content, title) {
  const section = findSections(content).find((item) => item.title.toLowerCase() === String(title).trim().toLowerCase())
  if (!section) throw new Error(`Section not found: ${title}`)
  return { ...section, content: content.slice(section.start, section.end) }
}

function assertAllowedProject(projectId, browserConfig) {
  if (!projectId || !(browserConfig.projectIds || []).includes(projectId)) {
    throw new Error(`Project is not configured: ${projectId || '(missing)'}`)
  }
}

function projectDirectory(projectId) {
  return join(PROJECTS_DIRECTORY, sha256(projectId).slice(0, 24))
}

function safeRelativePath(value) {
  const normalized = String(value || '').replaceAll('\\', '/').replace(/^\/+/, '')
  const segments = normalized.split('/').filter(Boolean)
  if (!segments.length || segments.some((segment) => segment === '.' || segment === '..' || segment.includes('\0'))) {
    throw new Error(`Unsafe project path: ${value}`)
  }
  return segments.join('/')
}

function resolveInside(root, filePath) {
  const target = resolve(root, filePath)
  if (target === root || !target.startsWith(`${resolve(root)}${sep}`)) throw new Error('Project path escaped its workspace.')
  return target
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

async function readBody(request, limit) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > limit) throw new Error('Request body is too large.')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(value))
}

function setCors(response) {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Overleaf-Project-Name')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
}

function sendMcp(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`)
}

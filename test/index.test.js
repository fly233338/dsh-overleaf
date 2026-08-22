import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  OVERLEAF_SYSTEM_PROMPT,
  prepareOverleafConfig,
} from '../index.js'

async function makeTestDirectory() {
  return mkdtemp(join(tmpdir(), 'dsh-overleaf-'))
}

test('creates an empty user config and an empty MCP config', async () => {
  const directory = await makeTestDirectory()

  try {
    const dataDirectory = join(directory, 'dsh-overleaf')
    const configPath = join(dataDirectory, 'dsh-overleaf.config.json')
    const runtimeConfigPath = join(dataDirectory, '.dsh-overleaf.projects.json')

    await prepareOverleafConfig(configPath, runtimeConfigPath)

    assert.deepEqual(JSON.parse(await readFile(configPath, 'utf8')), {
      gitToken: '',
      projectIds: [],
    })
    assert.deepEqual(JSON.parse(await readFile(runtimeConfigPath, 'utf8')), {
      projects: {},
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('converts a shared token and project ID list to OverleafMCP config', async () => {
  const directory = await makeTestDirectory()

  try {
    const configPath = join(directory, 'dsh-overleaf.config.json')
    const runtimeConfigPath = join(directory, '.dsh-overleaf.projects.json')

    await writeFile(configPath, JSON.stringify({
      gitToken: 'test-token',
      projectIds: ['project-a', 'project-b'],
    }))
    await prepareOverleafConfig(configPath, runtimeConfigPath)

    assert.deepEqual(JSON.parse(await readFile(configPath, 'utf8')), {
      gitToken: 'test-token',
      projectIds: ['project-a', 'project-b'],
    })
    assert.deepEqual(JSON.parse(await readFile(runtimeConfigPath, 'utf8')), {
      projects: {
        'project-a': {
          projectId: 'project-a',
          gitToken: 'test-token',
        },
        'project-b': {
          projectId: 'project-b',
          gitToken: 'test-token',
        },
      },
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('guides the model to discover and select a project', () => {
  assert.match(OVERLEAF_SYSTEM_PROMPT, /list_projects/)
  assert.match(OVERLEAF_SYSTEM_PROMPT, /projectName/)
  assert.match(OVERLEAF_SYSTEM_PROMPT, /commitMessage/)
})

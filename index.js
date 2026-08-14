import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apply as applyMcpClient } from '@deepseek-ai/dsh-mcp-client'

const require = createRequire(import.meta.url)
const overleafServer = require.resolve('@mjyoo2/overleaf-mcp')

const SERVER_NAME = 'overleaf'
const TOOL_CALL_TIMEOUT_MS = 60_000
const CONFIG_FILE_NAME = 'dsh-overleaf.config.json'
const RUNTIME_CONFIG_FILE_NAME = '.dsh-overleaf.projects.json'
const PLUGIN_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = join(PLUGIN_DIRECTORY, CONFIG_FILE_NAME)
const RUNTIME_CONFIG_PATH = join(PLUGIN_DIRECTORY, RUNTIME_CONFIG_FILE_NAME)
const EMPTY_CONFIG = { gitToken: '', projectIds: [] }

export const OVERLEAF_SYSTEM_PROMPT =
  'For Overleaf tasks, call mcp__overleaf__list_projects first. Use the returned project id as projectName for subsequent Overleaf tool calls and keep using the selected project id throughout the task. Write operations must include an explicit commitMessage.'

export const name = 'dsh-overleaf'
export const inject = ['tools']

export function buildOverleafMcpConfig(config) {
  return {
    projects: Object.fromEntries(config.projectIds.map((projectId) => [
      projectId,
      {
        projectId,
        gitToken: config.gitToken,
      },
    ])),
  }
}

export async function prepareOverleafConfig(
  configPath = CONFIG_PATH,
  runtimeConfigPath = RUNTIME_CONFIG_PATH,
) {
  if (!existsSync(configPath)) {
    await writeFile(configPath, `${JSON.stringify(EMPTY_CONFIG, null, 2)}\n`, 'utf8')
  }

  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const mcpConfig = buildOverleafMcpConfig(config)
  await writeFile(runtimeConfigPath, `${JSON.stringify(mcpConfig, null, 2)}\n`, 'utf8')
  return runtimeConfigPath
}

export async function apply(ctx) {
  const runtimeConfigPath = await prepareOverleafConfig()

  ctx.inject(['systemPrompt'], (promptCtx) => {
    promptCtx.systemPrompt.section({
      name: 'tool:overleaf',
      order: 115,
      text: OVERLEAF_SYSTEM_PROMPT,
    })
  })

  await applyMcpClient(ctx, {
    transport: 'stdio',
    serverName: SERVER_NAME,
    command: process.execPath,
    args: [overleafServer],
    env: {
      OVERLEAF_PROJECTS_CONFIG: runtimeConfigPath,
    },
    cwd: process.cwd(),
    toolCallTimeoutMs: TOOL_CALL_TIMEOUT_MS,
    failOnStartupError: true,
  })
}

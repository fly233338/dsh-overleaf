import { createRequire } from 'node:module'
import { apply as applyMcpClient } from '@deepseek-ai/dsh-mcp-client'
import { prepareOverleafConfig } from './config.js'

const require = createRequire(import.meta.url)
const overleafServer = require.resolve('@mjyoo2/overleaf-mcp')

const SERVER_NAME = 'overleaf'
const TOOL_CALL_TIMEOUT_MS = 60_000

export const OVERLEAF_SYSTEM_PROMPT =
  'For Overleaf tasks, call mcp__overleaf__list_projects first. Use the returned project id as projectName for subsequent Overleaf tool calls and keep using the selected project id throughout the task. Write operations must include an explicit commitMessage.'

export const name = 'dsh-overleaf'
export const inject = ['tools']

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

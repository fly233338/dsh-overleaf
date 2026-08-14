import { createRequire } from 'node:module'
import { apply as applyMcpClient } from '@deepseek-ai/dsh-mcp-client'

const require = createRequire(import.meta.url)
const overleafServer = require.resolve('@mjyoo2/overleaf-mcp')

const SERVER_NAME = 'overleaf'
const TOOL_CALL_TIMEOUT_MS = 60_000

export const name = 'dsh-loadout'
export const inject = ['tools']

export async function apply(ctx) {
  const projectId = process.env.OVERLEAF_PROJECT_ID?.trim()
  const gitToken = process.env.OVERLEAF_GIT_TOKEN?.trim()

  if (!projectId || !gitToken) {
    throw new Error(
      'dsh-loadout: OVERLEAF_PROJECT_ID and OVERLEAF_GIT_TOKEN must be set before starting DSH',
    )
  }

  await applyMcpClient(ctx, {
    transport: 'stdio',
    serverName: SERVER_NAME,
    command: process.execPath,
    args: [overleafServer],
    env: {
      OVERLEAF_PROJECT_ID: projectId,
      OVERLEAF_GIT_TOKEN: gitToken,
    },
    cwd: process.cwd(),
    toolCallTimeoutMs: TOOL_CALL_TIMEOUT_MS,
    failOnStartupError: true,
  })
}

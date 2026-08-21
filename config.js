import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CONFIG_FILE_NAME = 'dsh-overleaf.config.json'
export const RUNTIME_CONFIG_FILE_NAME = '.dsh-overleaf.projects.json'
export const PACKAGE_DIRECTORY = dirname(fileURLToPath(import.meta.url))
export const CONFIG_PATH = join(PACKAGE_DIRECTORY, CONFIG_FILE_NAME)
export const RUNTIME_CONFIG_PATH = join(PACKAGE_DIRECTORY, RUNTIME_CONFIG_FILE_NAME)
export const EMPTY_CONFIG = {
  transport: 'browser',
  gitToken: '',
  projectIds: [],
  browser: {
    port: 47832,
    token: '',
  },
}

export async function readOverleafConfig(configPath = CONFIG_PATH) {
  if (!existsSync(configPath)) {
    await writeFile(configPath, `${JSON.stringify(EMPTY_CONFIG, null, 2)}\n`, 'utf8')
  }

  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const transport = config.transport || (config.gitToken ? 'git' : 'browser')
  if (transport !== 'git' && transport !== 'browser') {
    throw new Error('transport must be either "git" or "browser"')
  }

  if (transport === 'browser' && !config.browser?.token) {
    config.transport = 'browser'
    config.browser = {
      port: Number(config.browser?.port) || 47832,
      token: randomBytes(24).toString('hex'),
    }
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  }

  return { ...config, transport }
}

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
  const config = await readOverleafConfig(configPath)
  const mcpConfig = buildOverleafMcpConfig(config)
  await writeFile(runtimeConfigPath, `${JSON.stringify(mcpConfig, null, 2)}\n`, 'utf8')
  return runtimeConfigPath
}

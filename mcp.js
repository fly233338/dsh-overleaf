#!/usr/bin/env node

import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { CONFIG_PATH, prepareOverleafConfig, readOverleafConfig } from './config.js'

const require = createRequire(import.meta.url)
const overleafServer = require.resolve('@mjyoo2/overleaf-mcp')

const configPath = process.env.DSH_OVERLEAF_CONFIG_PATH || CONFIG_PATH
const config = await readOverleafConfig(configPath)

if (config.transport === 'browser') {
  await import('./browser-server.js')
} else {
  const runtimeConfigPath = await prepareOverleafConfig(configPath)

  process.env.OVERLEAF_PROJECTS_CONFIG = runtimeConfigPath
  await import(pathToFileURL(overleafServer).href)
}

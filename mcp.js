#!/usr/bin/env node

import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { prepareOverleafConfig } from './config.js'

const require = createRequire(import.meta.url)
const overleafServer = require.resolve('@mjyoo2/overleaf-mcp')

const runtimeConfigPath = await prepareOverleafConfig()

process.env.OVERLEAF_PROJECTS_CONFIG = runtimeConfigPath
await import(pathToFileURL(overleafServer).href)

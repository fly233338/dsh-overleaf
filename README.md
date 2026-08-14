# dsh-overleaf

Connect Overleaf projects to [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) through [OverleafMCP](https://github.com/mjyoo2/overleafmcp).

`dsh-overleaf` installs OverleafMCP as an npm dependency, starts it through MCP stdio, and exposes its tools to DSH. The OverleafMCP source is not copied into this project.

## Features

- Browse and read Overleaf LaTeX files.
- Inspect document sections and section content.
- Write files or sections back to Overleaf through Git.
- Keep the DSH MCP Client provided by the DSH host.

## Requirements

- DSH `0.1.0-rc.5` or a compatible release.
- Node.js `22.19.0` or newer.
- An Overleaf project ID and Git integration token.

## Install

From a DSH source checkout:

```powershell
$dshPath = 'D:\path\to\deepseek-harness'
$pluginPath = 'D:\path\to\dsh-overleaf'
Set-Location $dshPath
pnpm install
pnpm run build
pnpm dsh plugin --profile web add $pluginPath
```

If the DSH CLI is installed and available on `PATH`:

```powershell
dsh plugin --profile web add dsh-overleaf
dsh web
```

The npm installation command becomes available after this package is published.

## Configure

```powershell
$env:OVERLEAF_PROJECT_ID = 'your-project-id'
$env:OVERLEAF_GIT_TOKEN = 'your-git-token'

# Use the command that matches your DSH installation:
pnpm dsh web
# or: dsh web
```

The tools are available under the `mcp__overleaf__` namespace, including file listing, file reading, section inspection, status, and writing. Write operations require an explicit `commitMessage` and push a Git commit to Overleaf.

## Scope

The current version connects one Overleaf project. It does not compile documents, review PDFs, switch between projects, or automate a browser.

Use a dedicated test project for write operations, and never commit Overleaf credentials.

## Links

- [Project repository](https://github.com/fly233338/dsh-overleaf)
- [OverleafMCP](https://github.com/mjyoo2/overleafmcp)
- [DSH plugin guide](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish)

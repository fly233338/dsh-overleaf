# dsh-overleaf

Connect multiple Overleaf projects to [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) through [OverleafMCP](https://github.com/mjyoo2/overleafmcp).

`dsh-overleaf` installs OverleafMCP as an npm dependency, starts it through MCP stdio, and exposes its tools to DSH. The OverleafMCP source is not copied into this project.

## Features

- Browse and read files from multiple Overleaf projects.
- Inspect document sections and section content.
- Write files or sections back to Overleaf through Git.
- Keep the DSH MCP Client provided by the DSH host.

## Requirements

- DSH `0.1.0-rc.5` or a compatible release.
- Node.js `22.19.0` or newer.
- An Overleaf Git integration token.

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

The plugin uses `dsh-overleaf.config.json` next to its `index.js`. If the file is missing, the plugin creates it on startup with this content:

```json
{
  "gitToken": "",
  "projectIds": []
}
```

Fill in one shared token and one project ID per line:

```json
{
  "gitToken": "your-overleaf-git-token",
  "projectIds": [
    "project-id-a",
    "project-id-b"
  ]
}
```

Get project IDs from the `<id>` in the Overleaf project URL. Create the Git token under [Overleaf Account Settings → Git Integration](https://docs.overleaf.com/integrations-and-add-ons/git-integration-and-github-synchronization/git/git-integration-authentication-tokens).

Restart DSH after editing the file. The plugin reads it once at startup and generates the internal OverleafMCP project configuration. Do not edit the generated `.dsh-overleaf.projects.json` file.

The plugin does not read `.env` and does not require Overleaf environment variables.

## Use with the model

Tell the model which project to handle:

```text
Please work on Overleaf project project-id-a and read its main.tex.
```

The model first calls `mcp__overleaf__list_projects`, then passes the selected ID as `projectName` to subsequent Overleaf tools. Write operations require an explicit `commitMessage` and push a Git commit to Overleaf.

Keep the token out of public source repositories and published package contents.

## Scope

The current version supports multiple Overleaf projects through one MCP tool group. It does not compile documents, review PDFs, or automate a browser.

## Links

- [Project repository](https://github.com/fly233338/dsh-overleaf)
- [OverleafMCP](https://github.com/mjyoo2/overleafmcp)
- [DSH plugin guide](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish)
- insert:
    - id: dsh-overleaf
      name: dsh-overleaf

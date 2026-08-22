# dsh-overleaf

[English](README.md) | [中文](README.zh-CN.md)

Connect multiple Overleaf projects to [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) through [@fly233338/overleaf-mcp](https://github.com/fly233338/overleaf-mcp).

`dsh-overleaf` installs [@fly233338/overleaf-mcp](https://www.npmjs.com/package/@fly233338/overleaf-mcp) as an npm dependency, starts it through MCP stdio, and exposes its tools to DSH. The OverleafMCP source is not copied into this project.

## Features

Browse and read files from multiple Overleaf projects, inspect document sections and section content, write files or sections back to Overleaf through Git, and use the DSH MCP Client provided by the host. **Based on my experience, it is especially useful in the following scenarios: understanding an entire LaTeX project, automatically fixing LaTeX compilation errors, and unifying terminology and symbols throughout the document.**

## Requirements

- DSH `0.1.0-rc.5` or a compatible release.
- Node.js `22.19.0` or newer.
- An Overleaf Git integration token.

## Install

If the DSH CLI is installed and available on `PATH`:

```sh
dsh plugin --profile web add dsh-overleaf
dsh web
```

From a DSH source checkout:

```sh
cd /path/to/deepseek-harness
pnpm install
pnpm run build
pnpm dsh plugin --profile web add /path/to/dsh-overleaf
pnpm dsh web
```

The npm installation command becomes available after this package is published.

## Configure

The plugin stores `dsh-overleaf.config.json` under `$DSH_HOME/dsh-overleaf/`. If `DSH_HOME` is not set, it uses `~/.dsh/dsh-overleaf/`. The directory and file are created on startup when missing. Fill in one shared token and one project ID per line:

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

Restart DSH after editing the file. The plugin reads it once at startup and generates the internal `.dsh-overleaf.projects.json` OverleafMCP project configuration in the same directory. Do not edit the generated file.

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
- [@fly233338/overleaf-mcp](https://github.com/fly233338/overleaf-mcp) ([npm](https://www.npmjs.com/package/@fly233338/overleaf-mcp))
- [DSH plugin guide](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish)
- insert:
    - id: dsh-overleaf
      name: dsh-overleaf

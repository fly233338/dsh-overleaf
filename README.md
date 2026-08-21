# dsh-overleaf

[English](README.md) | [中文](README.zh-CN.md)

Connect multiple Overleaf projects to [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness), Codex, or another MCP client. Premium accounts can use [OverleafMCP](https://github.com/mjyoo2/overleafmcp) over Git; Free accounts can use the included Chrome bridge.

`dsh-overleaf` installs OverleafMCP as an npm dependency, starts it through MCP stdio, and exposes its tools to DSH or any client that can run a stdio MCP server. The OverleafMCP source is not copied into this project.

## Features

Browse and read files from multiple Overleaf projects, inspect document sections and section content, write files or sections back to Overleaf through Git, and use the DSH MCP Client or Codex MCP configuration provided by the host. **Based on my experience, it is especially useful in the following scenarios: understanding an entire LaTeX project, automatically fixing LaTeX compilation errors, and unifying terminology and symbols throughout the document.**

## Requirements

- DSH `0.1.0-rc.5` or a compatible release.
- Codex or another client with stdio MCP support, if you use the standalone MCP entrypoint.
- Node.js `22.19.0` or newer.
- Chrome when using the browser bridge for an Overleaf Free account.
- An Overleaf Git integration token when using the Git transport.

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

## Install for Codex

Install dependencies in this package first:

```
cd /path/to/dsh-overleaf
npm install
```

Then add this stdio MCP server to your Codex MCP configuration:

```toml
[mcp_servers.overleaf]
command = "node"
args = ["/path/to/dsh-overleaf/mcp.js"]
```

On Windows, use an absolute path with forward slashes or escaped backslashes:

```toml
[mcp_servers.overleaf]
command = "node"
args = ["D:/dsh-overleaf/mcp.js"]
```

Restart Codex after changing the MCP configuration.

## Overleaf Free accounts

Free accounts use the browser transport because Overleaf reserves Git integration for Premium accounts. Set `transport` to `browser`, list the allowed project IDs, and leave `gitToken` empty:

```json
{
  "transport": "browser",
  "gitToken": "",
  "projectIds": ["your-project-id"],
  "browser": {
    "port": 47832,
    "token": "generated-on-first-start"
  }
}
```

Start or restart Codex once so the random browser token is generated. Then:

1. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
2. Select this package's `extension` directory.
3. Open the extension options, copy `browser.token` from `dsh-overleaf.config.json`, then save and test the connection.
4. Open the configured Overleaf project and click the extension icon to synchronize it.

The extension uses the existing signed-in Overleaf browser session. Cookies stay in Chrome and are never written to the MCP configuration. Browser writes are limited to the text file currently open in Overleaf and are rejected when its content has changed since synchronization. Click the extension icon again after collaborator edits.

## Configure

The plugin uses `dsh-overleaf.config.json` next to its `index.js`. If the file is missing, the plugin creates it on startup. For Premium Git mode, use this configuration:

```json
{
  "transport": "git",
  "gitToken": "your-overleaf-git-token",
  "projectIds": [
    "project-id-a",
    "project-id-b"
  ]
}
```

Get project IDs from the `<id>` in the Overleaf project URL. Create the Git token under [Overleaf Account Settings → Git Integration](https://docs.overleaf.com/integrations-and-add-ons/git-integration-and-github-synchronization/git/git-integration-authentication-tokens).

Restart DSH or Codex after editing the file. Git mode generates the internal OverleafMCP project configuration; do not edit `.dsh-overleaf.projects.json`. Browser mode stores synchronized project mirrors under `.dsh-overleaf-browser`, which is also generated and ignored by Git.

The plugin does not read `.env` and does not require Overleaf environment variables.

## Use with the model

Tell the model which project to handle:

```text
Please work on Overleaf project project-id-a and read its main.tex.
```

The model first calls `mcp__overleaf__list_projects`, then passes the selected ID as `projectName` to subsequent Overleaf tools. In clients that expose MCP tool names differently, use the Overleaf `list_projects` tool first and keep the selected project ID as `projectName`. In browser mode, `open_project` opens the selected project in the system default browser. Write operations require an explicit `commitMessage`; Git mode pushes a Git commit to Overleaf, while browser mode applies the edit to the currently open and unchanged file through the extension.

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

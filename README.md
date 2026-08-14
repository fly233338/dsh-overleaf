# dsh-loadout

`dsh-loadout` is a DSH profile bundle that connects one Overleaf project through the existing [OverleafMCP](https://github.com/mjyoo2/overleafmcp) server and DSH's generic MCP client.

The bundle does not implement the Overleaf API. It resolves the installed OverleafMCP server entry, starts it with the current Node runtime, forwards the two required environment variables, and publishes the discovered tools under the `mcp__overleaf__*` namespace.

The DSH MCP client is a peer dependency supplied by the DSH installation. OverleafMCP is the only external runtime package installed by this bundle; neither reference checkout is used at runtime.

## Requirements

- DSH `0.1.0-rc.5` or a compatible release with `@deepseek-ai/dsh-mcp-client` available from the DSH installation.
- Node.js `22.19.0` or newer.
- An Overleaf project ID and Git integration token.

## Install

Install the bundle into the DSH profile that should access Overleaf. A local checkout can be installed with an absolute path:

```powershell
$loadoutPath = 'D:\path\to\dsh-loadout'
dsh plugin --profile web add $loadoutPath
```

The bundle is added to the profile automatically because its package manifest declares `dsh.bundle`.

Set the credentials before starting DSH:

```powershell
$env:OVERLEAF_PROJECT_ID = 'your-project-id'
$env:OVERLEAF_GIT_TOKEN = 'your-git-token'
dsh web
```

Do not put the token in this repository or in `cordis.patch.yml`.

## Tools

The OverleafMCP tools are exposed with the `mcp__overleaf__` prefix:

- `mcp__overleaf__list_projects`
- `mcp__overleaf__list_files`
- `mcp__overleaf__read_file`
- `mcp__overleaf__get_sections`
- `mcp__overleaf__get_section_content`
- `mcp__overleaf__status_summary`
- `mcp__overleaf__write_file`
- `mcp__overleaf__write_section`

The write tools require an explicit `commitMessage`; OverleafMCP commits and pushes the change back to Overleaf.

## Scope

The first version supports one project from `OVERLEAF_PROJECT_ID` and `OVERLEAF_GIT_TOKEN`. It does not compile documents, review PDFs, switch between projects, or automate a browser.

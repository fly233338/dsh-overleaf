# dsh-overleaf

`dsh-overleaf` is a DSH profile bundle that connects one Overleaf project through the existing [`@mjyoo2/overleaf-mcp`](https://github.com/mjyoo2/overleafmcp) server and DSH's generic MCP client. The plugin repository is [github.com/fly233338/dsh-overleaf](https://github.com/fly233338/dsh-overleaf).

The bundle does not copy or implement OverleafMCP. It declares OverleafMCP as an npm runtime dependency, resolves its installed server entry, starts it with the current Node runtime, and exposes the MCP tools through DSH. The DSH MCP client remains a peer dependency supplied by the DSH installation.

## Requirements

- DSH `0.1.0-rc.5` or a compatible release with `@deepseek-ai/dsh-mcp-client` available from the DSH installation.
- Node.js `22.19.0` or newer.
- An Overleaf project ID and Git integration token.

## Install for local development

Install the local checkout into the DSH profile that should access Overleaf:

```powershell
$pluginPath = 'D:\path\to\dsh-overleaf'
dsh plugin --profile web add $pluginPath
```

The bundle is added to the profile automatically because its package manifest declares `dsh.bundle`. OverleafMCP is installed from npm as the bundle's dependency; this repository does not depend on the separate OverleafMCP checkout.

## Install after npm publication

After the package is published, users can install it by package name:

```powershell
dsh plugin --profile web add dsh-overleaf
```

Users can also install a pinned GitHub revision:

```powershell
dsh plugin --profile web add github:fly233338/dsh-overleaf#<commit-sha>
```

Pin a commit when installing from GitHub so a later repository change cannot silently change the installed code. This package is plain JavaScript and has no source build step.

## Configure credentials

Set the credentials before starting DSH:

```powershell
$env:OVERLEAF_PROJECT_ID = 'your-project-id'
$env:OVERLEAF_GIT_TOKEN = 'your-git-token'
dsh web
```

Do not put the token in this repository or in `cordis.patch.yml`.

## Verify installation

Inspect the composed profile without starting the agent:

```powershell
dsh --profile web --dump-config
```

The output should contain the `dsh-overleaf` bundle layer. Once DSH starts, the OverleafMCP tools are exposed with the `mcp__overleaf__` prefix:

- `mcp__overleaf__list_projects`
- `mcp__overleaf__list_files`
- `mcp__overleaf__read_file`
- `mcp__overleaf__get_sections`
- `mcp__overleaf__get_section_content`
- `mcp__overleaf__status_summary`
- `mcp__overleaf__write_file`
- `mcp__overleaf__write_section`

Start with read-only operations such as listing projects, listing files, reading `main.tex`, and inspecting its sections. The write tools require an explicit `commitMessage`; OverleafMCP commits and pushes the change back to Overleaf. Use a dedicated test project for write tests.

## Community publication

The DSH community publication model is an independently hosted plugin repository or npm package. Add the [`dsh-plugin` GitHub topic](https://github.com/topics/dsh-plugin) to this repository for discoverability. DSH's official bundle format is defined in the [package and install guide](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish).

Before publishing, verify the package contents locally:

```powershell
npm pack --dry-run
```

The package should contain `index.js`, `cordis.patch.yml`, `README.md`, and `LICENSE`. The generated DSH profile files are user-owned files and should not be committed to this repository.

## Scope

The first version supports one project from `OVERLEAF_PROJECT_ID` and `OVERLEAF_GIT_TOKEN`. It does not compile documents, review PDFs, switch between projects, or automate a browser.

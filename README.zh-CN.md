# dsh-overleaf

[English](README.md) | [中文](README.zh-CN.md)

将多个 Overleaf 项目连接到 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness)、Codex 或其它 MCP Client。Premium 账户可通过 Git 使用 [OverleafMCP](https://github.com/mjyoo2/overleafmcp)，Free 账户可使用项目自带的 Chrome 桥接扩展。

`dsh-overleaf` 将 OverleafMCP 作为 npm 依赖安装，通过 MCP stdio 启动它，并将其工具暴露给 DSH 或任何能运行 stdio MCP server 的客户端。本项目不复制 OverleafMCP 的源代码。

## 功能

支持浏览和读取多个 Overleaf 项目中的文件、检查文档章节和章节内容、通过 Git 将文件或章节写回 Overleaf，并使用 DSH 宿主提供的 MCP Client 或 Codex 的 MCP 配置。**根据我的体验，尤其适用于以下场景：理解整个 LaTeX 项目、自动修复 LaTeX 编译错误、全文统一术语/符号。**

## 要求

- DSH `0.1.0-rc.5` 或兼容版本。
- 如果使用独立 MCP 入口，则需要 Codex 或其它支持 stdio MCP 的客户端。
- Node.js `22.19.0` 或更高版本。
- 使用 Overleaf Free 浏览器桥接时需要 Chrome。
- 使用 Git transport 时需要 Overleaf Git 集成 token。

## 安装

如果 DSH CLI 已安装并且可以从 `PATH` 使用：

```sh
dsh plugin --profile web add dsh-overleaf
dsh web
```

从 DSH 源码目录安装：

```sh
cd /path/to/deepseek-harness
pnpm install
pnpm run build
pnpm dsh plugin --profile web add /path/to/dsh-overleaf
pnpm dsh web
```

本项目发布后即可使用 npm 安装命令。

## 为 Codex 安装

先在本项目中安装依赖：

```
cd /path/to/dsh-overleaf
npm install
```

然后把这个 stdio MCP server 加入 Codex 的 MCP 配置：

```toml
[mcp_servers.overleaf]
command = "node"
args = ["/path/to/dsh-overleaf/mcp.js"]
```

Windows 下建议使用绝对路径，并使用正斜杠或转义后的反斜杠：

```toml
[mcp_servers.overleaf]
command = "node"
args = ["D:/dsh-overleaf/mcp.js"]
```

修改 MCP 配置后重启 Codex。

## Overleaf Free 账户

Overleaf 只向 Premium 账户开放 Git 集成，因此 Free 账户使用浏览器 transport。将 `transport` 设为 `browser`，填写允许访问的项目 ID，并保持 `gitToken` 为空：

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

先启动或重启一次 Codex，让插件生成随机浏览器 token，然后：

1. 打开 `chrome://extensions`，启用**开发者模式**并点击**加载已解压的扩展程序**。
2. 选择本项目的 `extension` 目录。
3. 打开扩展设置，将 `dsh-overleaf.config.json` 中的 `browser.token` 粘贴进去，然后保存并测试连接。
4. 打开已配置的 Overleaf 项目，点击扩展图标完成同步。

扩展复用 Chrome 中已经登录的 Overleaf 会话，Cookie 不会写入 MCP 配置或交给 Codex。浏览器写回仅作用于 Overleaf 当前打开的文本文件；如果同步后文件发生变化，写回会被拒绝。协作者修改后请再次点击扩展图标同步。

## 配置

插件使用其 `index.js` 所在目录中的 `dsh-overleaf.config.json`。如果文件不存在，插件会在启动时创建它。Premium Git 模式使用以下配置：

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

项目 ID 可以从 Overleaf 项目 URL 中的 `<id>` 获取。请在 [Overleaf Account Settings → Git Integration](https://docs.overleaf.com/integrations-and-add-ons/git-integration-and-github-synchronization/git/git-integration-authentication-tokens) 中创建 Git token。

编辑配置文件后重启 DSH 或 Codex。Git 模式会生成 OverleafMCP 的内部项目配置，请勿编辑 `.dsh-overleaf.projects.json`。浏览器模式会把同步镜像保存在 `.dsh-overleaf-browser`，该目录同样由程序生成并已被 Git 忽略。

插件不读取 `.env`，也不要求设置 Overleaf 环境变量。

## 与模型一起使用

告诉模型要处理哪个项目：

```
Please work on Overleaf project project-id-a and read its main.tex.
```

模型会先调用 `mcp__overleaf__list_projects`，然后在后续 Overleaf 工具调用中将选中的项目 ID 作为 `projectName`。如果客户端显示的 MCP 工具名称不同，请先使用 Overleaf 的 `list_projects` 工具，并持续把选中的项目 ID 作为 `projectName`。写入操作必须提供明确的 `commitMessage`，并会通过 Git 向 Overleaf 提交。

请勿将 token 提交到公开源码仓库或发布到 npm 包中。

## 范围

当前版本通过一个 MCP 工具组支持多个 Overleaf 项目。不支持编译文档、审阅 PDF 或自动化浏览器。

## 链接

- [项目仓库](https://github.com/fly233338/dsh-overleaf)
- [OverleafMCP](https://github.com/mjyoo2/overleafmcp)
- [DSH 插件指南](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish)
- insert:
    - id: dsh-overleaf
      name: dsh-overleaf

# dsh-overleaf

[English](README.md) | [中文](README.zh-CN.md)

通过 [@fly233338/overleaf-mcp](https://github.com/fly233338/overleaf-mcp) 将多个 Overleaf 项目连接到 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness)。

`dsh-overleaf` 将 [@fly233338/overleaf-mcp](https://www.npmjs.com/package/@fly233338/overleaf-mcp) 作为 npm 依赖安装，通过 MCP stdio 启动它，并将其工具暴露给 DSH。本项目不复制 OverleafMCP 的源代码。

## 功能

支持浏览和读取多个 Overleaf 项目中的文件、检查文档章节和章节内容、通过 Git 将文件或章节写回 Overleaf，并使用 DSH 宿主提供的 MCP Client。**根据我的体验，尤其适用于以下场景：理解整个 LaTeX 项目、自动修复 LaTeX 编译错误、全文统一术语/符号。**

## 要求

- DSH `0.1.0-rc.5` 或兼容版本。
- Node.js `22.19.0` 或更高版本。
- 一个 Overleaf Git 集成 token。

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

## 配置

插件将 `dsh-overleaf.config.json` 保存在 `$DSH_HOME/dsh-overleaf/` 中。如果未设置 `DSH_HOME`，则使用 `~/.dsh/dsh-overleaf/`。目录和文件不存在时会在启动时创建。每行填写一个项目 ID，并使用同一个 token：

```json
{
  "gitToken": "your-overleaf-git-token",
  "projectIds": [
    "project-id-a",
    "project-id-b"
  ]
}
```

项目 ID 可以从 Overleaf 项目 URL 中的 `<id>` 获取。请在 [Overleaf Account Settings → Git Integration](https://docs.overleaf.com/integrations-and-add-ons/git-integration-and-github-synchronization/git/git-integration-authentication-tokens) 中创建 Git token。

编辑配置文件后重启 DSH。插件只在启动时读取配置，并在同一目录生成 OverleafMCP 的内部配置文件 `.dsh-overleaf.projects.json`。不要编辑生成的文件。

插件不读取 `.env`，也不要求设置 Overleaf 环境变量。

## 与模型一起使用

告诉模型要处理哪个项目：

```
Please work on Overleaf project project-id-a and read its main.tex.
```

模型会先调用 `mcp__overleaf__list_projects`，然后在后续 Overleaf 工具调用中将选中的项目 ID 作为 `projectName`。写入操作必须提供明确的 `commitMessage`，并会通过 Git 向 Overleaf 提交。

请勿将 token 提交到公开源码仓库或发布到 npm 包中。

## 范围

当前版本通过一个 MCP 工具组支持多个 Overleaf 项目。不支持编译文档、审阅 PDF 或自动化浏览器。

## 链接

- [项目仓库](https://github.com/fly233338/dsh-overleaf)
- [@fly233338/overleaf-mcp](https://github.com/fly233338/overleaf-mcp)（[npm](https://www.npmjs.com/package/@fly233338/overleaf-mcp)）
- [DSH 插件指南](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish)
- insert:
    - id: dsh-overleaf
      name: dsh-overleaf

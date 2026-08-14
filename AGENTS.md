# dsh-loadout AGENTS.md 简版计划

## 项目概述

dsh-loadout 让 DSH 接入并操作 Overleaf 项目。

DSH 可以读取 LaTeX 文件和章节，也可以修改内容并通过 Git 提交回 Overleaf。底层复用已有的 [OverleafMCP](https://github.com/mjyoo2/overleafmcp)。

## 实现思路

作为独立插件实现，不修改 DSH Core。

插件复用 DSH 已有的 MCP Client，启动 OverleafMCP。

插件使用：

`OVERLEAF_PROJECT_ID + OVERLEAF_GIT_TOKEN → Overleaf MCP → DSH 工具`

第一版只支持一个 Overleaf 项目，暂不实现编译、PDF 审阅、多项目切换和浏览器自动化。

## 工程方案

- 保持实现简单、直接、可读。
- 优先使用 DSH 已有的 MCP 接口和插件能力。
- 不直接实现 Overleaf API。
- 不增加复杂的安全检测。
- 不设计复杂 fallback。
- 不增加 smoke 测试。
- 不为了防御性而大量使用 `try/catch`。
- 避免重复抽象、过度封装和不必要的状态。
- Overleaf 写入必须使用明确的提交信息。

## 工作要求

- 每次完成改动都要提交 Git。
- 改动完成后说明修改了哪些文件。
- 同时说明每个文件具体改了什么。
- 本阶段只创建并完善 `dsh-loadout/AGENTS.md`，暂不实现代码。

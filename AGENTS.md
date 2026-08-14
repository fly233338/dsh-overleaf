## 项目概述

DSH（DeepSeek Harness）是 DeepSeek 的开源 AI Agent 运行框架，也是一个通过插件扩展的编程助手。它负责运行 Agent、加载工具，并通过 MCP（Model Context Protocol，一种连接外部工具的协议）使用外部服务。

Overleaf 是在线 LaTeX 文档编辑和协作平台。dsh-loadout 是一个独立的 DSH 插件，复用已有的 [OverleafMCP](https://github.com/mjyoo2/overleafmcp)，将 Overleaf 项目接入 DSH。

接入后，DSH 可以读取 Overleaf 项目中的 LaTeX 文件和章节，修改内容，并通过 Git 提交回 Overleaf。

## 实现思路

作为独立插件实现，不修改 DSH Core。

插件复用 DSH 已有的 MCP Client，启动 OverleafMCP。

插件使用：

`OVERLEAF_PROJECT_ID + OVERLEAF_GIT_TOKEN → Overleaf MCP → DSH 工具`

第一版只支持一个 Overleaf 项目，暂不实现编译、PDF 审阅、多项目切换和浏览器自动化。


## 参考项目
- DSH源码：
  - 地址：`https://github.com/deepseek-ai/deepseek-harness`
  - 本地路径：`D:\Code\Agent\deepseek-harness`
  - 用途：参考 MCP Client、bundle 和插件配置方式。

- OverleafMCP：
  - 地址：`https://github.com/mjyoo2/overleafmcp`
  - 本地路径：`D:\Code\Agent\OverleafMCP`
  - 用途：参考 Overleaf 工具、环境变量和 Git 写入流程。


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

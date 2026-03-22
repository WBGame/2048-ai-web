# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

`2048-web-v2` 是一个 2048 小游戏的 Web 版本，目前处于初始化阶段，尚未选定技术栈和框架。

## 项目状态

- **当前状态**：空白初始化阶段，仅包含 `.spec-workflow` 工作流框架
- **`public/`**：静态资源目录，当前为空
- **`.spec-workflow/`**：AI 辅助开发工作流系统，用于编写规格文档（需求 → 设计 → 任务 → 实现）

## 开发工作流

本项目集成了 `spec-workflow` MCP 工具，推荐在编码前先完成规格文档：

1. **Steering 文档**（`product.md`、`tech.md`、`structure.md`）：定义产品目标、技术选型、目录规范
2. **Spec 文档**（`requirements.md` → `design.md` → `tasks.md`）：针对每个功能特性逐步细化
3. **实现阶段**：按 tasks.md 中的任务逐条实现并记录日志

## 架构

- **server.js**：Express 静态文件服务，`public/` 目录为根
- **public/game.js**：分三层
  1. **纯函数游戏核心**（`createBoard`, `addRandom`, `slideLeft`, `applyMove`, `canMove`, `hasWon`）——零 DOM 依赖，可独立测试
  2. **状态管理**（`state` 对象，`newGame()`, `move(dir)`）——最高分通过 `localStorage` 持久化（key: `2048-best-v2`）
  3. **渲染层**（`render(mergedCells)`）——每次移动重建瓦片 DOM，通过 CSS class 区分新瓦片/合并瓦片动画
- **public/style.css**：全局 CSS 变量（`--board-size`, `--cell-size`, `--gap`, `--pad`）驱动所有尺寸，瓦片绝对定位用 `calc(var(...))` 计算

### 移动方向实现

所有四个方向统一转换为"向左"操作：`right` → `flipRows`，`up` → `transpose`，`down` → `flipRows ∘ transpose`，操作后再反变换回来。

## 常用命令

```bash
npm install        # 安装依赖（仅需运行一次）
npm start          # 启动服务器，访问 http://localhost:3000
PORT=8080 npm start  # 自定义端口
```

## 代码规范

- 遵循 SOLID、KISS、DRY、YAGNI 原则
- 游戏逻辑（状态管理、移动算法、合并规则）与 UI 渲染层严格分离
- 核心游戏模型应为纯函数，便于测试

## 2048 游戏核心概念

- **棋盘**：4×4 网格，每格存储数值（0 表示空格）
- **移动方向**：上、下、左、右四个方向
- **合并规则**：相邻相同数值方块合并为其两倍，每次移动每个方块只能参与一次合并
- **生成规则**：每次有效移动后随机生成一个值为 2（90%）或 4（10%）的方块
- **胜利条件**：出现 2048 方块
- **失败条件**：棋盘满且无可合并方块

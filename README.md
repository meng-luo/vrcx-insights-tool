# VRCX Insights Tool

本项目是一个面向 `VRCX.sqlite3` 的本地桌面分析工具，用来帮助你从自己的 VRCX 历史记录中查看关系、活动轨迹和双人共处情况。

它基于 Electron + Vue 构建，所有分析都在本地完成，默认只读打开数据库，不会修改你的 VRCX 数据。

## 项目特点

- 本地分析：直接读取 `VRCX.sqlite3`，不依赖云端服务
- 只读安全：数据库以只读模式打开，并启用 `PRAGMA query_only = 1`
- 面向用户：提供初始化引导、数据目录选择、手动刷新和快捷时间范围
- 面向分析：覆盖“可能认识的人”“活动轨迹”“好友关系度”等核心视图
- 可扩展：主进程负责数据服务，渲染层专注界面，方便继续演进

## 可以做什么

### 1. 可能认识的人

- 按“见面次数”查看高频相遇对象
- 按“共处时长”查看长期同房对象
- 从榜单直接跳转到轨迹或关系分析

### 2. 活动轨迹

- 查询某个对象的共同时间流
- 查看在同一实例中的共处区间
- 查看“陪伴占比（同房时长）”和共同实例数
- 支持一周、一月、一年、有史以来等快捷时间范围

### 3. 好友关系度

- 查看单好友关系排行
- 支持“仅好友 / 全部用户”两种范围
- 查询双人关系明细，包括：
  - 共处时长
  - 重叠时间段
  - 世界信息
  - 房主信息
  - 峰值人数
  - 你是否在场

## 适合谁

- 想复盘自己在 VRChat 中长期互动关系的用户
- 想从 VRCX 历史记录中查找共同活动轨迹的用户
- 想继续扩展本地数据分析能力的开发者

## 数据与隐私

- 本工具只读取本地 `VRCX.sqlite3`
- 不会修改 VRCX 数据库内容
- 不依赖 VRChat 在线接口
- 程序只会在 Electron 用户配置目录中保存一个轻量配置文件 `data.json`，用于记住你选择过的 VRCX 数据目录

## 运行要求

- 一份可用的 `VRCX.sqlite3`
- Node.js 与 npm（源码运行时需要）
- Windows 用户可优先使用打包产物；macOS / Linux 更适合源码运行

## 快速开始

### 方式一：从源码运行

```bash
cd vrcx-insights-tool
npm install
npm start
```

首次启动后：

- Windows 下会优先尝试自动识别 `%APPDATA%/VRCX`
- 如果没有自动识别到，界面会提示你选择 VRCX 数据文件夹
- 你也可以在“设置”页重新切换数据目录

如果你希望直接指定数据库路径，可以在启动时传入环境变量：

```bash
cd vrcx-insights-tool
VRCX_DB_PATH=../VRCX.sqlite3 npm start
```

### 方式二：使用打包产物

项目支持构建 Windows 桌面包：

- NSIS 安装包
- Portable 便携版

普通用户在使用打包产物时不需要额外安装 Node.js，也不需要安装 `sqlite3` CLI。

## 常用命令

```bash
npm start
npm test
npm run test:unit
npm run test:integration
npm run build:win
npm run release:win
```

## 使用说明

1. 启动应用并完成数据目录选择
2. 等待首页加载数据库元信息
3. 通过顶部日期筛选或快捷范围缩小分析区间
4. 使用“手动刷新重算”重新读取当前数据库
5. 在不同分析页之间切换查看结果

## 项目结构

```text
vrcx-insights-tool/
├── src/
│   ├── analyzer/      # 数据读取、关系计算、会话窗口分析
│   ├── electron/      # Electron 主进程、运行时状态、IPC
│   ├── queries/       # 查询入口与结果组织
│   └── static/        # Vue + Element Plus 渲染层
├── test/              # 单元测试与集成测试
├── build/             # 打包资源
└── package.json
```

## 技术实现

- Electron：桌面壳与本地文件访问
- Vue 3 + Element Plus：界面与交互
- `node:sqlite`：以只读方式访问 `VRCX.sqlite3`

当前架构分层如下：

- Electron `main` 进程持有只读 `InsightsService`
- `InsightsService` 负责读取数据库并组织分析结果
- `preload` 暴露安全的桌面桥接接口
- renderer 负责筛选、展示和交互

## 打包说明

Windows 打包命令如下：

```bash
npm run build:win
npm run release:win
```

说明：

- 正式 Windows 产物以 `electron-builder` 输出
- 已固定 `toolsets.winCodeSign=1.1.0`，避免默认旧版 `winCodeSign-2.6.0.7z` 在普通 Windows 权限下因符号链接解压失败而中断
- 安装包和便携包都不要求最终用户安装 Node.js
- 应用对 `VRCX.sqlite3` 的访问仍保持只读

## 开发说明

- 当前仓库中的 Git 根目录位于 `vrcx-insights-tool/`
- 测试使用 Vitest
- 如果你要继续扩展分析能力，建议优先在 `src/analyzer` 和 `src/queries` 中补充能力，再由 `src/static/app.js` 接入界面

## License

[MIT](./LICENSE)

# VRCX Insights Tool

独立本地 Electron 工具，读取 `VRCX.sqlite3` 做关系分析。

## 启动

```bash
cd vrcx-insights-tool
npm install
VRCX_DB_PATH=../VRCX.sqlite3 npm start
```

说明：

- 项目使用内建 `node:sqlite` 只读打开 `VRCX.sqlite3`
- 工具不会修改 VRCX 数据库

## Windows 打包

- 安装包（NSIS `setup`）
- 便携包（`portable` 可执行文件）
- 本地打包命令（需在 Windows 环境执行）：

```bash
npm run build:win
npm run release:win
```

- 最终用户使用安装包/便携包时不需要安装 Node.js
- 最终用户不需要安装 `sqlite3` CLI
- 应用对 `VRCX.sqlite3` 仍保持只读（read-only）
- Windows 正式发布产物以 GitHub Actions 构建流程为主

## 架构

- Electron `main` 进程持有只读 `InsightsService`
- `InsightsService` 通过内建 `node:sqlite` 按时间窗读取 VRCX 数据
- 工具只缓存轻量元数据和热查询窗口，不构建整库驻留索引
- Electron `preload` 暴露 `window.vrcxInsights` 给 renderer
- 静态 Vue renderer 仅负责界面渲染和交互

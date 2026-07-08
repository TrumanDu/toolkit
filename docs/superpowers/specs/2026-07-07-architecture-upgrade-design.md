# 架构升级方案：Electron / React 升级 + Vite 替换 Webpack

- 日期：2026-07-07
- 项目：Toolkit（基于 electron-react-boilerplate / ERB）
- 目标：1) 升级 Electron；2) 升级 React 至 19；3) 用 Vite 替换 Webpack；**4) 将其余所有依赖（dependencies + devDependencies）升级到最新稳定版**

> 本文是**决策文档**，用于对比两条迁移路线并给出推荐，供确认后再进入实施计划（writing-plans）。
>
> 版本说明：已明确指定的按指定版本（Electron v43 / React 19.2.7 / antd 6.5.0 / rr-dom 7）；其余依赖目标为「最新稳定」，**具体版本号在阶段 0 查 npm registry 后锁定**，本文不写死以免过时。

---

## 1. 现状盘点

| 项 | 当前版本 | 2026 最新 | 备注 |
|---|---|---|---|
| Electron | `^31.3.0` | **v43** | 跨 ~12 个大版本，需查 breaking changes |
| React / react-dom | `^18.2.0` | **19.2.7** | 需 antd 6 / rr-dom 兼容 |
| 构建 | Webpack 5 + `.erb/configs/*`（7 份配置 + DLL + scripts） | — | ERB 的构建体系 |
| UI | antd `^5.10.1` | **antd 6.5.0** | ⚠️ **大版本 5→6，破坏性变更大**；antd 6 原生支持 React 19，不再需要 compat 补丁 |
| 路由 | react-router-dom `^6.16.0` | 7.x | v6→v7 有 breaking |
| 其它主进程依赖 | electron-store `^8`、electron-log `^4`、electron-updater `^6`、express `^4` | store 有 v9/10（ESM）、log 有 v5 | 见风险章节 |

**决定迁移形态的结构性事实（本仓库特有）：**

1. **两个 renderer 入口**：`Dashboard` 与 `Search`，各有独立 `index.ejs` + `index.tsx`（多窗口应用）。任何 Vite 方案都必须支持多 HTML 入口。
2. **两包结构**：根 `package.json` 负责构建，`release/app/package.json` 承载运行时依赖，配合 `@electron/rebuild` 处理原生模块。
3. **构建即工具链**：`.erb/` 下有 7 份 webpack 配置 + DLL 预构建 + 一批脚本。webpack 不是「一个可替换的配置」，而是整个构建系统 —— 替换它 = 重写构建层。
4. **dev 时通过端口发现 renderer**：`util.ts:resolveHtmlPath` 在 dev 用 `http://localhost:1212/<html>`，prod 用 `file://`。Vite 的 dev server 地址 / 端口约定不同，这段必须改。
5. **preload 路径分叉**：`dashboard.ts` 里 dev 指向 `.erb/dll/preload.js`，packaged 指向 `__dirname/preload.js`。Vite 下 preload 的产物路径与注入方式会变。
6. **安全配置非常规**：`nodeIntegration: true` **且** `contextIsolation: true`，同时 `webSecurity: false`。这是迁移中最容易踩坑的点（见 §5）。
7. **主进程内含 express 服务**（`webContainer.ts`）与**外部插件加载器**（`plugin.ts`，从用户目录动态加载插件）。这些代码用了 Node 动态 `require`，Vite/Rollup 的静态打包对动态 require 不友好，需要 `external` 处理。

---

## 2. 三个升级项的耦合关系

它们**不是**三个独立任务，而是有依赖顺序：

- 换 Vite 会重写 main/preload/renderer 的产物路径、dev server 发现方式、原生模块 external 策略 —— 这是最大、最危险的一步。
- Electron 升级主要影响主进程 API 与 Node 版本，与打包方式部分正交，但若先换 Vite 再升 Electron，验证面更小。
- React 19 爆炸半径最小，但依赖 antd 与 react-router 的兼容，放最后做最安全。

**推荐顺序：Vite 迁移 → Electron 升级 → React 19。** 每步之间保证「可运行 + 可打包」再进入下一步。

---

## 3. 两条路线对比

### 路线 A：采用 `electron-vite` 框架（推荐）

用官方 [electron-vite](https://electron-vite.org) 完全替换 `.erb/` 整套 webpack 工具链。一个 `electron.vite.config.ts` 同时管 main / preload / renderer，内置 HMR、多入口、`external` 原生模块处理。

**落地方式（已定）：脚手架 + port** —— 在当前仓库内用官方脚手架生成干净基线，再把业务代码与发布/原生配置迁入，整体删除 `.erb`（而非原地逐个拆 webpack）。详见阶段 1 / 阶段 1.1。

**优点**
- 终态最干净：7 份 webpack 配置 + DLL + 多个脚本 → 1 份配置。
- 社区标准，文档/踩坑资料多，长期维护成本最低。
- 内置主进程/preload 的独立构建与热重载，替代当前 `electronmon` + DLL 那套。

**缺点 / 成本**
- 构建层是**重写**而非编辑：需要新建配置、迁移 `index.ejs` → `index.html`、重排 `release/build` 输出、改 `main.ts`/`util.ts`/`dashboard.ts` 的路径逻辑、更新 electron-builder 的 `files`/`main` 指向。
- 需要重新处理原生模块与动态 `require`（express、插件加载）的 `external`。
- ERB 特有脚本（notarize、check-native-dep、link-modules）要挑出来保留或改写。

### 路线 B：手动集成 Vite（`vite-plugin-electron`）

保留现有仓库布局，用 Vite + `vite-plugin-electron` 手动接入。

**优点**
- 控制力最强，可最大程度保留现有 `.erb` 结构与脚本，改动更「增量」。
- 便于逐窗口 / 逐进程灰度切换。

**缺点 / 成本**
- 要自己维护 electron-vite 免费提供的东西：多窗口入口、preload 构建、原生模块 external、主进程 watch/reload。
- 长期维护成本最高，出问题时社区参考少。
- 实际上你会「重新发明一个更差的 electron-vite」。

### 结论

**推荐路线 A（electron-vite）。** 除非你有强烈的「保留 `.erb` 自定义构建逻辑」诉求，否则 A 的终态质量与维护成本明显优于 B。下面的分阶段计划以 A 为基准编写。

---

## 4. 分阶段实施计划（基于路线 A）

> 原则：每个阶段结束都必须满足 **`npm start` 能跑 + `npm run package` 能出安装包**，再进下一阶段。全程在独立分支进行，每阶段一个可回滚的 commit。

> **阶段 1 采用「脚手架 + port」子策略**（而非原地拆 `.erb`）：在**当前 git 仓库内**用 electron-vite 官方脚手架生成干净基线，把业务代码与发布/原生配置迁入，再整体删除 `.erb`。终态与原地迁移一致，但过程更稳、无残留 webpack cruft，并保住 git 历史。

### 阶段 0 — 准备与基线
- 建迁移分支；记录当前 `npm start` / `npm run package` 的可用基线（截图 / 产物）。
- 锁定其余依赖具体版本号（已定：Electron v43 / React 19.2.7 / antd 6.5.0 / rr-dom 7；含 electron-vite 版本）。
- 通读 Electron 31 → 43 的 breaking changes 清单，列出受影响的主进程 API。
- 把当前完整依赖 & builder 配置存档（作为 port 时的搬运清单来源）。

### 阶段 1 — electron-vite 脚手架 + 代码迁移（最大步）
> 目标：以脚手架为新骨架，把「§8 待删除依赖」整批清掉，把下面 **阶段 1.1 迁移 checklist** 的每一项搬过来。

1. **生成脚手架基线**：在仓库内用 electron-vite 官方脚手架（React + TS 模板）生成 `electron.vite.config.ts` 与 main/preload/renderer 三段结构；先让空壳能 `dev` + `build`。
2. **配多 renderer 入口**：Dashboard、Search 两个 HTML 入口，`index.ejs` → `index.html`。
3. **port 业务代码**：`src/main/*`（api/dashboard/tray/menu/plugin/webContainer/app_updater/init_check/setting/db/util 等）、`src/renderer/*`（含 Dashboard、Search）、`src/types`、`assets`。
4. **重连关键路径**：
   - `util.ts:resolveHtmlPath` 改用 electron-vite 注入的 dev URL / 环境变量，弃掉写死的 `1212` 端口。
   - `dashboard.ts` 的 preload 路径统一到 Vite 产物（dev / packaged 一致）。
5. **处理 `external`**：`express`、插件动态 `require`、原生模块不进 renderer bundle（electron-vite 的 `externalizeDepsPlugin`）。
6. **搬运发布/构建配置**（见阶段 1.1 checklist）：electron-builder 整块（三平台 target、`asarUnpack`、mac 签名 + notarize、`publish` + updater、`extraResources`）、两包结构 `release/app` + rebuild/link-modules。
7. **删除 `.erb/` 与 webpack 全家桶**（§8 待删除清单），移除 `package.json` 的 `browserslist` 字段；保留并按需改写 notarize / native-dep 脚本。
8. **Jest**：保留 `ts-jest`（本阶段只求可跑；测试写法迁移放阶段 3）。
9. **验收**：dev 双窗口 HMR 正常；三平台 package 出包并能启动；自动更新、托盘、全局快捷键、插件加载、express 服务全部回归通过。

### 阶段 1.1 — 迁移 checklist（必须逐项搬运/重连，勿遗漏）
| 项 | 来源 | 迁移动作 | 验证 |
|---|---|---|---|
| electron-builder 配置 | 根 `package.json` `build` 块 | 整块搬入新配置；对齐 Vite 产物路径（`main`/`files`/输出目录） | 三平台各出一次包 |
| 三平台 target | `build.mac/win/linux` | 保留 arch、nsis、AppImage、dmg 设置 | 三平台安装包可启动 |
| mac 签名 & notarize | `assets/entitlements.mac.plist`、`.erb/scripts/notarize.js` | 脚本保留，路径重连 | mac 签名/公证流程通过 |
| 自动更新 | `build.publish`(github) + electron-updater | 保留 publish 配置，验证 `latest*.yml` 生成 | 更新链路端到端通过 (R8) |
| 两包结构 + 原生模块 | `release/app/package.json`、`@electron/rebuild`、`link-modules.ts` | 结构保留，rebuild/link 脚本适配新构建 | 三平台 rebuild 通过 (R4) |
| 非常规 webPreferences | `dashboard.ts` | 原样迁移 `nodeIntegration/contextIsolation/webSecurity` 组合 | renderer 内 Node/electron 调用逐一回归 (R1) |
| 实验特性开关 | `main.ts` `enable-experimental-web-platform-features` | 原样保留 | excalidraw 保存回归 (R2) |
| 插件系统 | `plugin.ts`（从用户目录动态加载） | 确保动态 require 被 external，不被打包 | 加载真实插件通过 (R3) |
| express 服务 | `webContainer.ts` | external 处理，主进程可启动 | 服务端点可访问 (R3) |
| 托盘/快捷键 | `tray.ts`、`main.ts` `CmdOrCtrl+Alt+O` | 原样迁移 | 托盘 + 快捷键生效 |
| 静态资源 | `assets/**`、`extraResources` | 搬运并对齐打包 | 图标/资源在包内可用 |
| baidu analytics | `@nostar/baidu-analytics-electron` | 保留（阶段 3.6 评估维护状态） | 主/渲染进程初始化正常 |

### 阶段 2 — Electron 升级
1. 升级 `electron` 与 `@electron/rebuild`、`electron-builder` 到匹配版本。
2. 对齐 Node 版本（Electron 大版本内置 Node 会变），跑 `npm run rebuild` 重建原生模块。
3. 按阶段 0 清单修复 breaking API。
4. 复核安全配置（见 §5）。
5. **验收**：Windows / macOS / Linux 三平台均能 package + 启动；自动更新链路通过；三平台原生模块 rebuild 通过。

### 阶段 3 — React 19 升级
1. `react` / `react-dom` / 相关 `@types` 升到 19。
2. antd：确认 5.x 对 React 19 的兼容（引入官方 `@ant-design/v5-patch-for-react-19` compat 包）。
3. react-router-dom 6 → 7：按迁移指南处理 breaking（future flags / API 变更）。
4. 处理 React 19 自身 breaking（如 `ReactDOM.render` 已移除、`ref` 变更、`react-test-renderer` 弃用 —— 现有测试用了它，需迁移到 `@testing-library/react`）。
5. **验收**：全部页面渲染正常，测试通过，package 可用。

### 阶段 3.5 — 主进程与工具链重点依赖（各自单独 commit）
> 这些与前三步正交，可在其后集中处理；每个 ⚠️ 项独立验收、可独立回滚。
1. **主进程依赖**：express 4→5（R11）、electron-log 4→5（R12）、electron-store 8→最新 ESM（R6）、electron-updater 最新（回归自动更新 R8）。
2. **Lint 工具链**：ESLint 8→9 flat config + @typescript-eslint 6→8 + 各插件 / config-erb 兼容处理（R10、R13）。
3. **测试工具链**：Jest 29→30 + testing-library 升级（R7、R14）。
4. **样式**：sass 最新、确认走 Dart Sass 新 API（R15）。

### 阶段 3.6 — 常规依赖批量升级
- 无 breaking 的包（axios、prettier、rimraf、concurrently、cross-env、chalk、core-js、各 `@types`、portfinder、fix-path、electron-debug、@electron/notarize 等）批量 bump。
- 用 `npm outdated` 核对，一次性升级后跑完整验收基线（§7）。
- 确认第三方小包（`@nostar/baidu-analytics-electron`）是否仍维护，必要时评估替代。

### 阶段 4 — 收尾
- 更新 README / 关键字 / `devEngines` 里的 Node 要求。
- 清理遗留 webpack 依赖与死代码。
- 全量回归 + 打 tag。

---

## 5. 风险点清单（本仓库特有，重点）

| # | 风险 | 说明 / 应对 |
|---|---|---|
| R0 | **antd 5 → 6（大版本）** | 组件 API、主题/CSS-in-JS、部分废弃组件都可能变化，是本次前端侧最大破坏项。必须逐页按 antd 官方 v5→v6 迁移指南核对；好处是 antd 6 原生支持 React 19，可**去掉** `@ant-design/v5-patch-for-react-19` 这类补丁。 |
| R0b | **Electron 31 → 43（跨 ~12 个大版本）** | breaking API 累积多、内置 Node/Chromium 大幅前进、原生模块 ABI 必变。建议阶段 0 逐版本翻 breaking changes；升级后强制 `npm run rebuild`。 |
| R1 | **`nodeIntegration:true` + `contextIsolation:true` 组合** | 这是非常规配置，Vite/新 Electron 下 preload 与 renderer 的 Node 访问行为可能变化。迁移后需**逐一验证** renderer 里对 Node/electron API 的直接调用是否仍工作；这是最高优先级回归项。 |
| R2 | **`webSecurity:false` + `enable-experimental-web-platform-features`** | 为 excalidraw 文件保存而开。Vite dev server 走 http、prod 走 file://，安全策略切换后需重测该功能。 |
| R3 | **express 服务 + 插件动态加载** | 动态 `require` 对 Rollup 静态分析不友好，必须正确 `external`，否则打包后插件加载 / 服务启动失败。 |
| R4 | **原生模块 (`@electron/rebuild`)** | Electron 大版本跳跃后 ABI 变化，必须重建；两包结构下 `release/app` 的 rebuild / link-modules 脚本需在新构建体系下仍有效。 |
| R5 | **多窗口入口** | Dashboard / Search 双入口在 Vite 多页配置下的产物路径、preload 匹配需分别验证。 |
| R6 | **electron-store v8 → 最新（ESM only）** | 新版转为纯 ESM，主进程当前是 CJS。要么改用动态 `import()` 加载，要么让主进程走 ESM 产物（electron-vite 支持）。这是全量升级里主进程侧最大的坑。 |
| R7 | **react-test-renderer** | React 19 弃用，现有 `App.test.tsx` 依赖它，需迁移到 `@testing-library/react`。 |
| R8 | **自动更新 (electron-updater)** | 输出目录 / `latest.yml` 生成依赖 electron-builder 配置，构建产物路径变动后必须验证更新链路。 |
| R9 | **notarize / 签名脚本** | mac 打包依赖 `.erb/scripts/notarize.js`，剥离 `.erb` 时勿误删。 |
| R10 | **ESLint 8 → 9（flat config）** | v9 默认 flat config（`eslint.config.js`），`.eslintrc` + 现有 `eslint-config-erb` / airbnb / 各插件全部要迁移或换兼容版本。工作量不小，且 `eslint-config-erb` 可能未跟进 v9，需评估是否改用 flat 兼容层。 |
| R11 | **express 4 → 5** | Express 5 有路由匹配、中间件、错误处理等 breaking，`webContainer.ts` 需回归。 |
| R12 | **electron-log 4 → 5** | transports / API 有调整，主进程与渲染进程日志初始化需按 v5 改写。 |
| R13 | **@typescript-eslint 6 → 8、TS 5.2 → 最新** | 规则集与解析器 breaking，配合 ESLint 9 一起迁移。 |
| R14 | **Jest 29 → 30** | 配置与部分 matcher/环境行为变化；若届时决定切 Vitest 则另议（默认仍保留 Jest）。 |
| R15 | **sass 最新（legacy API 弃用）** | Dart Sass 已弃用 legacy JS API，Vite 内置 sass 处理需确认走新 API，避免大量弃用告警/报错。 |

---

## 6. 范围与非目标

**本次做**：Vite 替换、Electron 升级、React 19（含 antd compat、rr-dom 7、测试迁移），**以及 `package.json` 中全部 dependencies + devDependencies 升级到最新稳定版**（详见 §9 依赖清单）。

**本次仍不做**（除非单独立项）：
- 不切 Vitest —— 除非升 Jest 30 时成本反而更高，届时再评估；默认保留 Jest。
- 不做与升级无关的功能重构 / 目录调整。

**升级策略**：
- 依赖分两类推进 —— 「**无 breaking 的常规升级**」（axios、prettier、rimraf、concurrently、各 `@types` 等）可批量 bump + 一次回归；「**有 breaking 的重点升级**」（见 §8 标 ⚠️ 者）逐个单独处理、单独 commit、单独验收。
- 每个重点升级失败可独立回滚，不阻塞其它项。

---

## 7. 建议的验收基线（每阶段复用）

1. `npm start` 双窗口启动、HMR 生效。
2. `npm run package` 在 Windows / macOS / Linux 三平台均出安装包并能启动。
3. 功能回归：托盘、全局快捷键（`CmdOrCtrl+Alt+O`）、自动更新、插件加载、express/webContainer、excalidraw 保存。
4. `npm test` 通过。
5. `npm run lint` 通过。

---

## 8. 全量依赖清单（当前 → 目标）

> ⚠️ = 有 breaking change / 需专门处理，逐个单独 commit + 验收；其余为常规 bump，可批量。目标列已指定的为定版，其余「最新稳定」在阶段 0 锁定。

### 运行时依赖 (dependencies)

| 包 | 当前 | 目标 | 备注 |
|---|---|---|---|
| ⚠️ react / react-dom | ^18.2 | **19.2.7** | 见阶段 3 |
| ⚠️ react-router-dom | ^6.16 | 7.x | v6→7 breaking |
| ⚠️ antd | ^5.10 | **6.5.0** | 大版本 5→6，见 R0；原生支持 React 19，无需 compat 补丁 |
| ⚠️ electron-store | ^8 | 最新 | ESM only，见 R6 |
| ⚠️ electron-log | ^4.4 | 5.x | 见 R12 |
| ⚠️ express | ^4.19 | 5.x | 见 R11 |
| electron-updater | ^6.1 | 最新 | 常规，但需回归自动更新链路 (R8) |
| electron-debug | ^3.2 | 最新 | 常规 |
| @electron/notarize | ^2.3 | 最新 | 常规，mac 打包用 |
| @nostar/baidu-analytics-electron | ^1.0.7 | 查最新 | 第三方小包，确认是否仍维护 |
| axios | ^1.6 | 最新 | 常规 |
| fix-path | ^4.0 | 最新（可能 ESM） | 确认 ESM/CJS |
| portfinder | ^1.0 | 最新 | 常规 |

### 构建 / 工具依赖 (devDependencies)

| 包 | 当前 | 目标 | 备注 |
|---|---|---|---|
| ⚠️ electron | ^31.3 | **v43** | 跨 12 个大版本，见 R0b / 阶段 2 |
| ⚠️ eslint + eslint-config-erb + airbnb + 各插件 | 8.x / 6.x | eslint 9 + flat config | 见 R10，工作量集中 |
| ⚠️ @typescript-eslint/* | ^6.7 | 8.x | 见 R13 |
| ⚠️ jest / ts-jest / jest-environment-jsdom | ^29 | 30.x | 见 R14 |
| ⚠️ sass / sass-loader | 1.83 / 16 | 最新 | 见 R15；sass-loader 换 Vite 后可能移除 |
| electron-builder / @electron/rebuild | ^24 / ^3.3 | 最新 | 与 Electron 版本匹配 |
| typescript | ^5.2 | 5 最新 | 常规 |
| @types/* (node/react/react-dom/jest…) | 混杂 | 对齐各自主库 | node types 20→22 |
| @testing-library/react + jest-dom | ^14 / ^6 | 最新（支持 React 19） | 配合 R7 |
| prettier | ^3.0 | 最新 | 常规 |
| concurrently / cross-env / rimraf / chalk / core-js | 各 | 最新 | 常规 |
| **webpack 全家桶 + loader/plugin + DLL 相关** | 5.x | **移除** | 换 Vite 后删除：webpack、webpack-cli、webpack-dev-server、webpack-merge、html-webpack-plugin、mini-css-extract-plugin、css/style/file/url/ts-loader、@svgr/webpack、terser/css-minimizer plugin、@pmmmwh/react-refresh-webpack-plugin、react-refresh、tsconfig-paths-webpack-plugin、webpack-bundle-analyzer、browserslist-config-erb、eslint-import-resolver-webpack、@teamsupercell/typings-for-css-modules-loader 等 |
| electronmon / detect-port / ts-node | 各 | 视情况 | electron-vite 接管 dev/watch 后，electronmon、detect-port、部分 ts-node 用法可能可移除 |

> 「移除」类不是升级而是清理，在阶段 1（Vite 迁移）随构建体系切换一并完成。

### 待删除依赖（换 Vite 后不再需要）

**确定删除**（webpack 全家桶 + loader/plugin）：
`webpack`、`webpack-cli`、`webpack-dev-server`、`webpack-merge`、`html-webpack-plugin`、`mini-css-extract-plugin`、`css-loader`、`style-loader`、`file-loader`、`url-loader`、`ts-loader`、`sass-loader`、`@svgr/webpack`、`terser-webpack-plugin`、`css-minimizer-webpack-plugin`、`@pmmmwh/react-refresh-webpack-plugin`、`react-refresh`、`tsconfig-paths-webpack-plugin`、`webpack-bundle-analyzer`、`@types/webpack-bundle-analyzer`、`@teamsupercell/typings-for-css-modules-loader`、`eslint-import-resolver-webpack`、`browserslist-config-erb`（并移除 `package.json` 里的 `browserslist` 字段）。

**待评估删除**（视 electron-vite / 新工具链是否接管）：
- `electronmon`（electron-vite 接管主进程 watch/reload → 大概率可删）
- `detect-port` + `.erb/scripts/check-port-in-use.js`（Vite 自动选端口 → 可删）
- `core-js`（esbuild/Vite target 现代化后通常不需要 polyfill → 评估后删）
- `@ant-design/v5-patch-for-react-19`（**当前未装**；antd 6 原生支持 React 19，**无需引入**）
- `ts-node`（部分 `.erb` 脚本用；若脚本迁移/删除后可能可移除，需逐脚本确认）

> 删除动作集中在阶段 1 完成；每删一批跑一次 §7 验收，避免误删导致打包/脚本断裂（尤其 `.erb/scripts/notarize.js` 相关不可误删）。

## 9. 决策记录（已全部确认）

- **目标版本**：Electron **v43** · React **19.2.7** · antd **6.5.0** · react-router-dom **7** · 其余全量升级最新稳定。
- **构建迁移**：**路线 A —— 采用 electron-vite** 替换整套 `.erb/` webpack 工具链，并删除冗余依赖（见 §8 待删除清单）。
- **出包目标**：**跨三平台**（Windows / macOS / Linux）—— 每阶段验收（§7）需在三平台均能 `package` 且启动；尤其注意 mac 签名/notarize（R9）、原生模块三平台 ABI 重建（R4/R0b）。

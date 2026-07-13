# Toolkit 功能增强设计文档

- 日期：2026-07-13
- 项目：Toolkit（基于 electron-vite + React 19 + antd 6）
- 目标：1) 插件系统 API 增强；2) 主题系统；3) 设置中心；4) 统一搜索

---

## 1. 总体架构

采用**方案 A：渐进扩展**。在现有 preload → contextBridge → renderer 架构上扩展 `window.toolkit` API，新增系统能力模块。主题和设置作为独立模块加入主进程。

```
window.toolkit (preload 暴露)
  ├── file.read/write/list/watch     ← 新增
  ├── process.exec/spawn             ← 新增
  ├── net.fetch/ws                   ← 新增
  ├── theme.get/set                  ← 新增
  ├── settings.get/set               ← 新增
  ├── goto(url)                      ← 已有
  ├── mkdir/list/saveFile/removeFile/rename  ← 已有
  └── ipcRenderer                    ← 已有
```

---

## 2. 插件系统 API 增强

### 2.1 file 模块

```typescript
// preload 暴露给插件
window.toolkit.file = {
  read(filePath: string): Promise<string>           // 读取文件内容
  write(filePath: string, content: string): Promise<void>  // 写入文件
  list(dirPath: string): Promise<string[]>          // 列出目录内容
  watch(filePath: string, callback: (event: string) => void): () => void  // 监听文件变化
  exists(filePath: string): Promise<boolean>        // 检查文件是否存在
  stat(filePath: string): Promise<{size: number, mtime: number, isDir: boolean}>
}
```

**主进程实现**：`src/main/api/file.ts`，使用 `fs/promises` + `chokidar`（文件监听）。

### 2.2 process 模块

```typescript
window.toolkit.process = {
  exec(command: string, options?: {cwd?: string, env?: Record<string,string>}): Promise<{stdout: string, stderr: string, code: number}>
  spawn(command: string, args: string[], options?: {cwd?: string}): ChildProcess  // 长运行进程
}
```

**主进程实现**：`src/main/api/process.ts`，使用 `child_process.exec` / `spawn`。

### 2.3 net 模块

```typescript
window.toolkit.net = {
  fetch(url: string, options?: RequestInit): Promise<{status: number, headers: Record<string,string>, body: string}>
  // WebSocket 通过事件机制暴露
  ws(url: string, handlers: {onMessage: (data: string) => void, onClose: () => void}): {send: (data: string) => void, close: () => void}
}
```

**主进程实现**：`src/main/api/net.ts`，使用 Electron 的 `net` 模块。

### 2.4 安全考虑

- 所有 API 调用通过 IPC 中转，主进程执行实际操作
- 插件无法直接访问 Node.js API（`nodeIntegration: false` 目标）
- 文件操作限制在插件自己的数据目录 + 用户授权的目录
- 命令执行需要用户确认（高危操作）

---

## 3. 主题系统

### 3.1 架构

```
主进程 (theme.ts)
  ├── 维护主题状态: { mode: 'light'|'dark'|'system', primaryColor: string, fontSize: 'small'|'medium'|'large' }
  ├── 持久化到 electron-store
  └── 通过 IPC 广播 'theme-changed' 事件

Renderer
  ├── 监听 'theme-changed' IPC
  ├── 更新 CSS 变量 (--bg-primary, --bg-secondary, --text-primary, --text-secondary, --accent...)
  ├── antd ConfigProvider 动态切换 algorithm (defaultAlgorithm / darkAlgorithm)
  └── 应用字体大小 CSS 变量
```

### 3.2 CSS 变量定义

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #333333;
  --text-secondary: #666666;
  --accent: #1677ff;
  --font-size-base: 14px;
}

[data-theme="dark"] {
  --bg-primary: #141414;
  --bg-secondary: #1f1f1f;
  --text-primary: #ffffff;
  --text-secondary: #999999;
  --accent: #1677ff;
}
```

### 3.3 antd 6 集成

使用 antd 6 的 `ConfigProvider` + `theme` token：
```tsx
<ConfigProvider theme={{
  algorithm: mode === 'dark' ? darkAlgorithm : defaultAlgorithm,
  token: { colorPrimary: primaryColor, fontSize: fontSizeBase }
}}>
  <App />
</ConfigProvider>
```

---

## 4. 设置中心

### 4.1 页面结构

设置中心作为 Dashboard 内的独立 Tab（selectKey=10 扩展）：

```
设置中心
  ├── 基本设置
  │   ├── 语言切换 (zh-CN / en)
  │   ├── 主题模式 (亮/暗/跟随系统)
  │   ├── 主题色选择 (色板)
  │   └── 字体大小 (小/中/大)
  ├── 快捷键配置
  │   ├── 唤起搜索框 (默认 Ctrl+Alt+A)
  │   ├── 打开主窗口 (默认 Ctrl+Alt+O)
  │   └── 自定义插件快捷键
  ├── 插件管理
  │   ├── 已安装插件列表
  │   ├── 启用/禁用开关
  │   ├── 排序（拖拽）
  │   └── 插件详情/配置
  └── 关于
      ├── 版本信息
      ├── 检查更新按钮
      └── 开源许可
```

### 4.2 数据存储

设置数据结构（electron-store）：
```typescript
interface AppSettings {
  language: 'zh-CN' | 'en';
  theme: {
    mode: 'light' | 'dark' | 'system';
    primaryColor: string;
    fontSize: 'small' | 'medium' | 'large';
  };
  shortcuts: {
    search: string;      // 默认 'Ctrl+Alt+A'
    mainWindow: string;  // 默认 'Ctrl+Alt+O'
    plugins: Record<string, string>;  // 插件自定义快捷键
  };
  plugins: {
    disabled: string[];   // 已禁用的插件名
    order: string[];      // 排序
  };
  sort: boolean;          // 已有
}
```

---

## 5. 统一搜索

### 5.1 搜索逻辑

搜索框 (Ctrl+Alt+A) 输入关键字后：

1. **已安装插件匹配** → 优先显示（带 [已安装] 标签）
2. **市场插件匹配** → 次优先（带 [市场] 标签，异步加载）
3. **快捷命令匹配** → 最后（`:all`, `:settings` 等）

### 5.2 实现

- 主进程维护已安装插件索引（内存中，插件变更时刷新）
- 市场插件查询走网络请求，先显示本地结果再异步补充市场结果
- 搜索结果分类显示，用 antd Tag 区分来源

---

## 6. 实施计划

并行推进，按模块独立迭代：

| 阶段 | 模块 | 内容 |
|------|------|------|
| P1 | 主题系统 | theme.ts + CSS 变量 + antd ConfigProvider |
| P1 | 设置中心 | 设置页面 UI + electron-store 数据结构 |
| P2 | 插件 API | file/process/net 三个模块 |
| P2 | 统一搜索 | 搜索框增强 + 市场插件搜索 |
| P3 | 安全加固 | 插件沙箱、权限确认、目录限制 |

每个阶段独立验收，可单独回滚。

---

## 7. 风险点

| # | 风险 | 应对 |
|---|------|------|
| R1 | 插件 API 暴露过多系统能力 | 文件操作限制目录、命令执行需确认 |
| R2 | 主题切换导致 antd 组件样式异常 | 使用 antd 6 原生 token 系统，不用自定义 CSS 覆盖 |
| R3 | 市场插件搜索网络延迟 | 先显示本地结果，市场结果异步加载 |
| R4 | electron-store ESM 兼容 | 已在 Phase 3.5 解决（bundled in main） |

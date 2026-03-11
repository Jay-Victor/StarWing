# StarWing 项目目录结构说明

## 📁 目录结构概览

```
StarWing/
├── .github/                    # GitHub 配置目录
│   ├── workflows/              # GitHub Actions 工作流
│   │   └── release.yml         # 自动发布工作流
│   ├── ISSUE_TEMPLATE/         # Issue 模板
│   │   ├── bug_report.md       # Bug 报告模板
│   │   └── feature_request.md  # 功能请求模板
│   └── pull_request_template.md # PR 模板
├── assets/                     # 静态资源目录
│   ├── donate/                 # 打赏二维码
│   │   ├── alipay.jpg          # 支付宝收款码
│   │   └── wechat.png          # 微信收款码
│   └── logo/                   # 项目图标
│       ├── logo.ico            # Windows 应用图标
│       ├── logo_16.png         # 16x16 图标
│       ├── logo_32.png         # 32x32 图标
│       ├── logo_48.png         # 48x48 图标
│       ├── logo_64.png         # 64x64 图标
│       ├── logo_128.png        # 128x128 图标
│       ├── logo_256.png        # 256x256 图标
│       └── logo_icon_256.svg   # SVG 矢量图标
├── build/                      # 构建配置目录
│   └── installer.nsh           # NSIS 安装脚本
├── dist/                       # 构建输出目录（不提交到 Git）
│   └── .gitkeep                # 保持目录结构
├── releases/                   # 发布版本目录（本地整理，通过 GitHub Release 分发）
│   └── v1.0.0/                 # 版本目录
│       ├── RELEASE_NOTES.md    # Release 说明
│       ├── SHA256SUMS.txt      # SHA256 校验和
│       ├── StarWing-1.0.0-Setup.exe    # 安装包
│       └── StarWing-1.0.0-Portable.zip # 便携版
├── src/                        # 源代码目录
│   ├── game.js                 # 游戏核心逻辑
│   ├── index.html              # 主页面
│   ├── main.js                 # Electron 主进程
│   ├── preload.js              # 预加载脚本
│   ├── styles.css              # 样式表
│   ├── updater.js              # 更新机制模块
│   ├── updaterPreload.js       # 更新窗口预加载
│   └── updaterUI.html          # 更新窗口界面
├── .gitignore                  # Git 忽略配置
├── CHANGELOG.md                # 版本更新日志
├── CONTRIBUTING.md             # 贡献指南
├── DIRECTORY_STRUCTURE.md      # 本文档
├── LICENSE                     # 开源协议
├── README.md                   # 项目说明文档
├── TEST_REPORT.md              # 测试报告
├── package.json                # 项目配置文件
└── package-lock.json           # 依赖锁定文件
```

---

## 📂 目录功能说明

### `dist/` vs `releases/` - 重要区分

| 目录 | 作用 | Git 状态 | 说明 |
|------|------|----------|------|
| `dist/` | electron-builder 构建输出 | ❌ 已忽略 | 运行 `npm run build` 后自动生成 |
| `releases/` | 发布版本整理 | ❌ 已忽略 | 手动整理，用于 GitHub Release 上传 |

**最佳实践**：
- `dist/` 是构建工具的输出目录，每次构建会覆盖
- `releases/` 是发布准备目录，按版本号组织，便于管理

### `.github/` - GitHub 配置

| 子目录/文件 | 功能 |
|-------------|------|
| `workflows/` | GitHub Actions 自动化工作流 |
| `ISSUE_TEMPLATE/` | Issue 模板，规范化问题提交 |
| `pull_request_template.md` | PR 模板，规范化代码提交 |

**最佳实践**：
- 使用 GitHub Actions 实现自动化构建和发布
- 提供 Issue 和 PR 模板，提高协作效率

### `assets/` - 静态资源

| 子目录 | 功能 |
|--------|------|
| `donate/` | 打赏二维码图片 |
| `logo/` | 项目图标（多尺寸） |

**命名规范**：
- 图片文件使用小写字母和下划线
- 图标按尺寸命名：`logo_{尺寸}.png`

### `build/` - 构建配置

| 文件 | 功能 |
|------|------|
| `installer.nsh` | NSIS 安装脚本配置 |

**说明**：存放构建相关的配置文件，如安装脚本、打包配置等。

### `src/` - 源代码

| 文件 | 功能 | 行数 |
|------|------|------|
| `main.js` | Electron 主进程 | ~400 |
| `game.js` | 游戏核心逻辑 | ~4000 |
| `index.html` | 主页面 | ~400 |
| `preload.js` | 预加载脚本 | ~20 |
| `styles.css` | 样式表 | ~2200 |
| `updater.js` | 更新机制 | ~800 |
| `updaterPreload.js` | 更新预加载 | ~50 |
| `updaterUI.html` | 更新界面 | ~200 |

**代码规范**：
- JavaScript 使用 4 空格缩进
- 函数添加 JSDoc 注释
- 变量使用驼峰命名法

---

## 📋 根目录文件说明

| 文件 | 必需 | 功能 |
|------|------|------|
| `.gitignore` | ✅ | 指定 Git 忽略的文件和目录 |
| `CHANGELOG.md` | ✅ | 记录版本更新历史 |
| `CONTRIBUTING.md` | 推荐 | 贡献指南和开发规范 |
| `DIRECTORY_STRUCTURE.md` | 推荐 | 目录结构说明（本文档） |
| `LICENSE` | ✅ | 开源协议 |
| `README.md` | ✅ | 项目说明文档 |
| `TEST_REPORT.md` | 推荐 | 测试报告 |
| `package.json` | ✅ | 项目配置和依赖管理 |
| `package-lock.json` | ✅ | 锁定依赖版本 |

---

## 🔧 文件组织规则

### 1. 源代码组织

```
src/
├── 核心模块
│   ├── main.js      # 主进程入口
│   └── game.js      # 游戏引擎
├── 界面文件
│   ├── index.html   # 主界面
│   └── styles.css   # 样式
├── 更新模块
│   ├── updater.js
│   ├── updaterPreload.js
│   └── updaterUI.html
└── 安全模块
    └── preload.js   # 安全桥接
```

### 2. 资源文件组织

```
assets/
├── logo/            # 品牌资源
│   └── [多尺寸图标]
└── donate/          # 其他资源
    └── [打赏二维码]
```

### 3. 发布版本组织

```
releases/
├── v1.0.0/          # 版本目录
│   ├── RELEASE_NOTES.md
│   ├── SHA256SUMS.txt
│   ├── StarWing-1.0.0-Setup.exe
│   └── StarWing-1.0.0-Portable.zip
└── v1.1.0/          # 未来版本
    └── ...
```

---

## 📏 目录深度控制

| 目录 | 最大深度 | 当前深度 |
|------|----------|----------|
| `src/` | 2 | 1 |
| `assets/` | 2 | 2 |
| `.github/` | 3 | 2 |
| `build/` | 1 | 1 |
| `dist/` | 1 | 0 |
| `releases/` | 2 | 2 |

**原则**：目录深度不超过 4 层，保持结构扁平化。

---

## 🚀 发布流程

### 方式一：手动发布

1. **构建产物**
   ```bash
   npm run build
   ```

2. **整理发布文件**
   - 从 `dist/` 复制产物到 `releases/v{版本号}/`
   - 创建 `RELEASE_NOTES.md`
   - 生成 `SHA256SUMS.txt`

3. **GitHub Release**
   - 创建新 Release，Tag: `v{版本号}`
   - 上传 `releases/v{版本号}/` 中的文件

### 方式二：GitHub Actions 自动发布

1. 创建 Git Tag：`git tag v1.0.0`
2. 推送 Tag：`git push origin v1.0.0`
3. GitHub Actions 自动构建并创建 Release

---

## 📌 注意事项

### 不要提交到 Git 的文件

| 文件/目录 | 原因 |
|-----------|------|
| `node_modules/` | 依赖目录，通过 npm install 安装 |
| `dist/` | 构建产物，可重新生成 |
| `releases/` | 发布文件，通过 GitHub Release 分发 |
| `*.log` | 日志文件 |
| `.env` | 环境变量（敏感信息） |

### 必须提交到 Git 的文件

| 文件/目录 | 原因 |
|-----------|------|
| `package.json` + `package-lock.json` | 项目配置和依赖锁定 |
| `README.md`, `LICENSE`, `CHANGELOG.md` | 项目文档 |
| `src/` | 源代码 |
| `assets/` | 静态资源 |
| `.github/` | GitHub 配置 |
| `build/` | 构建配置 |

---

*文档版本: 1.0.0*
*最后更新: 2026-03-08*

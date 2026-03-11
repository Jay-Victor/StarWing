# Contributing Guide | 贡献指南

感谢您有兴趣为 StarWing 做出贡献！

Thank you for your interest in contributing to StarWing!

---

## 📋 目录 | Table of Contents

- [行为准则 | Code of Conduct](#行为准则--code-of-conduct)
- [如何贡献 | How to Contribute](#如何贡献--how-to-contribute)
- [开发环境设置 | Development Setup](#开发环境设置--development-setup)
- [代码规范 | Code Standards](#代码规范--code-standards)
- [提交规范 | Commit Guidelines](#提交规范--commit-guidelines)
- [Pull Request 流程 | Pull Request Process](#pull-request-流程--pull-request-process)
- [更新机制开发指南 | Update Mechanism Development Guide](#更新机制开发指南--update-mechanism-development-guide)

---

## 行为准则 | Code of Conduct

### 中文

本项目采用贡献者公约作为行为准则。参与本项目即表示您同意遵守其条款。

我们承诺提供一个开放、友好、安全的社区环境，无论您的经验水平、性别、性别认同和表达、性取向、残疾、个人外貌、身体大小、种族、民族、年龄、宗教或国籍如何。

### English

This project adopts the Contributor Covenant as its Code of Conduct. By participating in this project, you agree to abide by its terms.

We pledge to provide an open, welcoming, and safe community environment, regardless of your experience level, gender, gender identity and expression, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, religion, or nationality.

---

## 如何贡献 | How to Contribute

### 中文

#### 报告 Bug

如果您发现了 bug，请通过 [GitHub Issues](https://github.com/Jay-Victor/StarWing/issues) 提交报告。我们提供了 Bug 报告模板，提交前请：

1. 搜索现有 issues，确认该 bug 尚未被报告
2. 使用清晰的标题描述问题
3. 填写 Bug 报告模板中的各项信息
4. 提供详细的复现步骤
5. 附上截图或错误日志（如有）
6. 说明您的操作系统和软件版本

#### 提出新功能

欢迎提出新功能建议！请：

1. 通过 [GitHub Issues](https://github.com/Jay-Victor/StarWing/issues) 提交
2. 使用功能请求模板填写
3. 详细描述功能需求和使用场景
4. 说明该功能如何改进项目

#### 提交代码

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### English

#### Reporting Bugs

If you find a bug, please submit a report via [GitHub Issues](https://github.com/Jay-Victor/StarWing/issues). We provide a Bug Report template. Before submitting:

1. Search existing issues to confirm the bug hasn't been reported
2. Use a clear title to describe the problem
3. Fill in the Bug Report template
4. Provide detailed reproduction steps
5. Attach screenshots or error logs (if available)
6. Specify your operating system and software version

#### Suggesting New Features

New feature suggestions are welcome! Please:

1. Submit via [GitHub Issues](https://github.com/Jay-Victor/StarWing/issues)
2. Use the Feature Request template
3. Describe the feature requirement and use case in detail
4. Explain how the feature improves the project

#### Submitting Code

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Create a Pull Request

---

## 开发环境设置 | Development Setup

### 中文

#### 系统要求

- Node.js 18.x 或更高版本
- npm 9.x 或更高版本
- Windows 10/11 (64位)

#### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/Jay-Victor/StarWing.git

# 进入项目目录
cd StarWing

# 安装依赖
npm install

# 启动开发模式
npm run dev

# 构建应用
npm run build
```

#### 项目结构

```
StarWing/
├── assets/              # 静态资源
│   ├── logo/            # 图标文件
│   └── donate/          # 打赏二维码
├── dist/                # 构建输出
├── src/                 # 源代码
│   ├── main.js          # Electron 主进程
│   ├── game.js          # 游戏核心逻辑
│   ├── index.html       # 主页面
│   ├── preload.js       # 预加载脚本
│   ├── styles.css       # 样式表
│   ├── updater.js       # 更新机制模块
│   ├── updaterPreload.js # 更新窗口预加载
│   └── updaterUI.html   # 更新窗口界面
├── CHANGELOG.md         # 更新日志
├── CONTRIBUTING.md      # 贡献指南
├── LICENSE              # 开源协议
├── README.md            # 项目说明
├── TEST_REPORT.md       # 测试报告
└── package.json         # 项目配置
```

### English

#### System Requirements

- Node.js 18.x or higher
- npm 9.x or higher
- Windows 10/11 (64-bit)

#### Installation Steps

```bash
# Clone the repository
git clone https://github.com/Jay-Victor/StarWing.git

# Navigate to project directory
cd StarWing

# Install dependencies
npm install

# Start development mode
npm run dev

# Build the application
npm run build
```

#### Project Structure

```
StarWing/
├── assets/              # Static assets
│   ├── logo/            # Icon files
│   └── donate/          # Donation QR codes
├── dist/                # Build output
├── src/                 # Source code
│   ├── main.js          # Electron main process
│   ├── game.js          # Game core logic
│   ├── index.html       # Main page
│   ├── preload.js       # Preload script
│   ├── styles.css       # Stylesheet
│   ├── updater.js       # Update mechanism module
│   ├── updaterPreload.js # Update window preload
│   └── updaterUI.html   # Update window UI
├── CHANGELOG.md         # Changelog
├── CONTRIBUTING.md      # Contributing guide
├── LICENSE              # License
├── README.md            # Project description
├── TEST_REPORT.md       # Test report
└── package.json         # Project configuration
```

---

## 代码规范 | Code Standards

### 中文

#### JavaScript 规范

- 使用 4 空格缩进
- 使用分号结尾
- 变量命名使用驼峰命名法
- 常量使用全大写下划线命名
- 函数和变量添加必要的注释

#### 注释规范

```javascript
/**
 * 函数功能描述
 * @param {类型} 参数名 - 参数说明
 * @returns {类型} 返回值说明
 */
function functionName(param) {
    // 实现代码
}
```

#### CSS 规范

- 使用 4 空格缩进
- 类名使用 kebab-case 命名
- 属性按字母顺序排列
- 使用 CSS 变量管理主题色

### English

#### JavaScript Standards

- Use 4-space indentation
- Use semicolons at end of statements
- Use camelCase for variable naming
- Use UPPER_SNAKE_CASE for constants
- Add necessary comments to functions and variables

#### Comment Standards

```javascript
/**
 * Function description
 * @param {Type} paramName - Parameter description
 * @returns {Type} Return value description
 */
function functionName(param) {
    // Implementation
}
```

#### CSS Standards

- Use 4-space indentation
- Use kebab-case for class names
- Order properties alphabetically
- Use CSS variables for theme colors

---

## 提交规范 | Commit Guidelines

### 中文

提交信息应遵循以下格式：

```
<类型>: <简短描述>

<详细描述>（可选）
```

类型包括：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：
```
feat: 添加 Boss 战斗功能

- 实现 Boss 敌机类型
- 添加 Boss 攻击模式
- 设计 Boss 血条 UI
```

### English

Commit messages should follow this format:

```
<type>: <short description>

<detailed description> (optional)
```

Types include:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation update
- `style`: Code style changes (no functionality impact)
- `refactor`: Code refactoring
- `perf`: Performance optimization
- `test`: Test related
- `chore`: Build/tool related

Example:
```
feat: Add boss battle feature

- Implement boss enemy type
- Add boss attack patterns
- Design boss health bar UI
```

---

## Pull Request 流程 | Pull Request Process

### 中文

1. 确保您的代码通过所有测试
2. 更新相关文档（如 README.md）
3. 填写完整的 PR 描述模板
4. 等待代码审查
5. 根据审查意见进行修改
6. 合并后您的贡献将被记录

### English

1. Ensure your code passes all tests
2. Update relevant documentation (e.g., README.md)
3. Fill out the complete PR description template
4. Wait for code review
5. Make changes based on review feedback
6. Your contribution will be recorded after merge

---

## 更新机制开发指南 | Update Mechanism Development Guide

### 中文

#### 架构概述

StarWing 的更新机制采用模块化设计，主要包含以下组件：

| 模块 | 文件 | 功能 |
|------|------|------|
| UpdateManager | updater.js | 更新管理主控制器 |
| UpdateChecker | updater.js | 版本检查器 |
| UpdateDownloader | updater.js | 文件下载器 |
| BackupManager | updater.js | 备份管理器 |
| UpdateLogger | updater.js | 日志记录器 |

#### 配置选项

```javascript
const UPDATE_CONFIG = {
    checkInterval: 24 * 60 * 60 * 1000,  // 检查间隔（毫秒）
    autoCheckEnabled: true,              // 是否自动检查
    silentUpdate: false,                 // 静默更新
    backupEnabled: true,                 // 是否备份
    backupPath: 'backup',                // 备份路径
    downloadTimeout: 300000,             // 下载超时
    maxRetries: 3,                       // 最大重试次数
    mirrors: [...]                       // 镜像源列表
};
```

#### 添加新镜像源

在 `updater.js` 中的 `UPDATE_CONFIG.mirrors` 数组添加：

```javascript
{
    name: '镜像名称',
    type: 'mirror_type',
    priority: 1,  // 优先级，数字越小越优先
    url: 'https://mirror-url/'
}
```

#### IPC 通信接口

| 通道 | 方向 | 说明 |
|------|------|------|
| `update:check` | 渲染→主 | 检查更新 |
| `update:download` | 渲染→主 | 下载更新 |
| `update:install` | 渲染→主 | 安装更新 |
| `update:download-progress` | 主→渲染 | 下载进度 |
| `update:info` | 主→渲染 | 更新信息 |

### English

#### Architecture Overview

StarWing's update mechanism uses a modular design with the following components:

| Module | File | Function |
|--------|------|----------|
| UpdateManager | updater.js | Main update controller |
| UpdateChecker | updater.js | Version checker |
| UpdateDownloader | updater.js | File downloader |
| BackupManager | updater.js | Backup manager |
| UpdateLogger | updater.js | Logger |

#### Configuration Options

```javascript
const UPDATE_CONFIG = {
    checkInterval: 24 * 60 * 60 * 1000,  // Check interval (ms)
    autoCheckEnabled: true,              // Auto check enabled
    silentUpdate: false,                 // Silent update
    backupEnabled: true,                 // Backup enabled
    backupPath: 'backup',                // Backup path
    downloadTimeout: 300000,             // Download timeout
    maxRetries: 3,                       // Max retries
    mirrors: [...]                       // Mirror list
};
```

#### Adding New Mirror

Add to `UPDATE_CONFIG.mirrors` array in `updater.js`:

```javascript
{
    name: 'Mirror Name',
    type: 'mirror_type',
    priority: 1,  // Lower number = higher priority
    url: 'https://mirror-url/'
}
```

#### IPC Communication Interface

| Channel | Direction | Description |
|---------|-----------|-------------|
| `update:check` | Renderer→Main | Check for updates |
| `update:download` | Renderer→Main | Download update |
| `update:install` | Renderer→Main | Install update |
| `update:download-progress` | Main→Renderer | Download progress |
| `update:info` | Main→Renderer | Update info |

---

## 📞 联系方式 | Contact

如有任何问题，请通过以下方式联系：

- GitHub Issues: https://github.com/Jay-Victor/StarWing/issues
- QQ群：1080243162

If you have any questions, please contact us via:

- GitHub Issues: https://github.com/Jay-Victor/StarWing/issues
- QQ Group: 1080243162

---

**感谢您的贡献！Thank you for your contribution!**

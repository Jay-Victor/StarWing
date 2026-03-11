# Changelog | 更新日志

All notable changes to this project will be documented in this file.

本项目所有重要变更都将记录在此文件中。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

格式基于 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)，
本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.0.0] - 2026-03-08

### Added | 新增

#### 中文
- 🎮 **首次发布** - StarWing 飞机大战游戏正式上线
- 🕹️ **三种控制模式**
  - 键盘模式 (WASD)：经典操控方式
  - 鼠标跟随模式：直观的鼠标控制
  - 手势操控模式：基于 MediaPipe 的创新手势识别
- 🎯 **核心游戏系统**
  - 得分系统：基础得分 + 连击加成（最高1.5倍）
  - 等级系统：每30秒自动升级，难度递增
  - 生命值系统：初始100点，被击中扣血
- ✨ **道具系统**
  - ⚡ 激光升级：提升武器威力（最高3级）
  - 🛡️ 护盾：抵挡一次伤害
  - ⭐ 得分加倍：分数翻倍效果
  - ✨ 无敌状态：短暂时间内免受伤害
- 🤖 **手势识别功能**
  - 基于 MediaPipe Hands 实现手势追踪
  - Kalman 滤波优化，提升追踪稳定性
  - 支持食指移动控制、握拳射击、张开手掌停止
- 🔄 **自动更新机制** ⭐ 新增
  - 自动检查更新：启动后5秒检查，之后每24小时自动检查
  - 手动检查更新：帮助菜单 → 检查更新
  - 多镜像下载支持：GitHub、Gitee镜像、国内CDN
  - 下载进度显示：实时显示下载进度、速度、剩余时间
  - SHA256文件校验：确保下载文件完整性
  - 自动备份：更新前自动备份关键文件
  - 更新日志记录：完整的更新过程日志
- 📌 **仓库地址链接** ⭐ 新增
  - 帮助菜单"关于 StarWing"对话框显示仓库地址
  - 提供一键访问仓库按钮
  - 仓库地址：https://github.com/Jay-Victor/StarWing
- 🎨 **UI/UX 设计**
  - WinUI3 风格界面设计
  - 响应式布局，支持不同分辨率
  - 流畅的动画效果和过渡
- ⚡ **性能优化**
  - 对象池技术，减少内存分配
  - 四叉树碰撞检测，提升检测效率
  - RAF 节流，优化渲染性能
- 🔒 **安全特性**
  - Electron 安全配置（Context Isolation、CSP）
  - 安全的 IPC 通信机制
- 📁 **项目结构优化** ⭐ 新增
  - GitHub Actions 自动发布工作流
  - Issue 模板（Bug 报告、功能请求）
  - Pull Request 模板
  - 完整的目录结构文档

#### English
- 🎮 **Initial Release** - StarWing aircraft shooting game officially launched
- 🕹️ **Three Control Modes**
  - Keyboard Mode (WASD): Classic control method
  - Mouse Following Mode: Intuitive mouse control
  - Gesture Control Mode: Innovative gesture recognition based on MediaPipe
- 🎯 **Core Game Systems**
  - Scoring System: Base score + combo bonus (up to 1.5x)
  - Level System: Auto-upgrade every 30 seconds, increasing difficulty
  - Health System: Initial 100 HP, damage on hit
- ✨ **Power-up System**
  - ⚡ Laser Upgrade: Increase weapon power (max level 3)
  - 🛡️ Shield: Block one hit
  - ⭐ Score Double: Double score effect
  - ✨ Invincibility: Temporary immunity to damage
- 🤖 **Gesture Recognition**
  - Hand tracking based on MediaPipe Hands
  - Kalman filter optimization for stable tracking
  - Support for index finger movement control, fist to shoot, open palm to stop
- 🔄 **Auto-Update Mechanism** ⭐ New
  - Auto check for updates: Check 5 seconds after startup, then every 24 hours
  - Manual check: Help menu → Check for Updates
  - Multi-mirror download support: GitHub, Gitee mirror, China CDN
  - Download progress display: Real-time progress, speed, remaining time
  - SHA256 file verification: Ensure download integrity
  - Auto backup: Backup critical files before update
  - Update logging: Complete update process logs
- 📌 **Repository Link** ⭐ New
  - Repository URL displayed in Help menu "About StarWing" dialog
  - One-click access to repository button
  - Repository: https://github.com/Jay-Victor/StarWing
- 🎨 **UI/UX Design**
  - WinUI3 style interface design
  - Responsive layout for different resolutions
  - Smooth animation effects and transitions
- ⚡ **Performance Optimization**
  - Object pooling to reduce memory allocation
  - Quadtree collision detection for improved efficiency
  - RAF throttling for optimized rendering
- 🔒 **Security Features**
  - Electron security configuration (Context Isolation, CSP)
  - Secure IPC communication mechanism
- 📁 **Project Structure Optimization** ⭐ New
  - GitHub Actions auto-release workflow
  - Issue templates (Bug report, Feature request)
  - Pull Request template
  - Complete directory structure documentation

### Technical Details | 技术细节

| Item | Details |
|------|---------|
| Framework | Electron 28.1.0 |
| Game Engine | HTML5 Canvas |
| Gesture Recognition | MediaPipe Hands |
| UI Framework | WinUI3 Design System |
| Build Tool | electron-builder 24.9.1 |
| Target Platform | Windows 10/11 (x64) |
| Repository | https://github.com/Jay-Victor/StarWing |

### Update Mechanism Details | 更新机制详情

#### 触发条件 | Trigger Conditions
- 应用启动后5秒自动检查更新
- 每24小时自动检查一次
- 用户手动点击"检查更新"

#### 更新流程 | Update Process
1. 从 GitHub API 获取最新版本信息
2. 比较当前版本与最新版本
3. 发现新版本时显示更新提示窗口
4. 用户确认后开始下载（支持多镜像）
5. SHA256 校验下载文件
6. 备份当前关键文件
7. 启动安装程序并退出应用

#### 配置选项 | Configuration Options
- `autoCheckEnabled`: 是否启用自动检查（默认：true）
- `checkInterval`: 检查间隔（默认：24小时）
- `backupEnabled`: 是否启用备份（默认：true）

### Performance Metrics | 性能指标

| Metric | Value |
|--------|-------|
| Cold Start Time | ~3 seconds |
| Memory Usage | ~200 MB |
| Installer Size | ~73 MB |
| Test Pass Rate | 20/20 (100%) |

---

## Future Plans | 未来计划

### [1.1.0] - Planned | 计划中

#### 中文
- [ ] 添加更多敌机类型
- [ ] 实现 Boss 战斗
- [ ] 添加音效系统
- [ ] 支持游戏存档
- [ ] 添加成就系统

#### English
- [ ] Add more enemy types
- [ ] Implement boss battles
- [ ] Add sound effect system
- [ ] Support game saves
- [ ] Add achievement system

---

[1.0.0]: https://github.com/Jay-Victor/StarWing/releases/tag/v1.0.0

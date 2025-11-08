# GitHub项目排行榜

一个优雅、响应式的GitHub热门项目排行榜网站，帮助开发者发现最新的热门开源项目。

## 项目特色

- 暗黑/明亮主题 - 支持自动主题切换，保护眼睛
- 完全响应式 - 在手机、平板、桌面设备上都有完美体验
- 智能筛选 - 按编程语言筛选热门项目
- 实时数据 - 从GitHub API获取最新的项目数据
- Token支持 - 支持GitHub访问令牌提高API限制
- 优雅动效 - 流畅的交互动画和悬停效果

## 快速开始

### 在线访问

直接访问部署版本：[添加你的在线链接]

### 本地运行

1. 克隆项目
git clone [你的仓库地址]

2. 打开项目
cd github-trending

3. 启动服务
直接打开 index.html 文件或在本地服务器中运行

## 技术栈

- 前端：纯HTML5、CSS3、JavaScript
- API：GitHub REST API
- 部署：GitHub Pages / Vercel / Netlify

## 功能说明

### 主要功能

- 查看GitHub热门仓库
- 按编程语言筛选项目
- 分页浏览功能
- 主题切换（深色/浅色）
- 访问令牌管理

### 项目卡片信息

- 项目名称和描述
- 编程语言及颜色标识
- Star数量
- Fork数量
- 项目更新时间

## 配置说明

### GitHub Token（可选）

如需提高API请求限制，可配置GitHub个人访问令牌：

1. 访问 GitHub Settings -> Developer settings -> Personal access tokens
2. 生成新Token（建议勾选public_repo权限）
3. 在网站中输入Token保存

## 浏览器支持

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 贡献指南

欢迎提交Issue和Pull Request来帮助改进项目！

## 许可证

MIT License

## 更新日志

### v1.0.0
- 初始版本发布
- 基础功能实现

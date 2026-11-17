# CodeFree Desktop Releases

CodeFree Desktop 的官方安装包与自动更新元数据。

## 下载

请从仓库的 [Releases](https://github.com/a3538333/CodeFree-Desktop-Releases/releases) 页面下载适合当前系统的最新安装包。

仓库保留最近 10 个已发布版本，旧版本及其下载链接会定期清理。

每次发布后，`verify-release` 工作流会检查更新元数据的版本、下载文件大小、blockmap 是否齐全，
并完整下载所有安装包计算 SHA-512。校验时不保存安装包，验证报告保留 3 天。
也可以从 Actions 手动指定版本重新校验。这项检查不替代各平台实际安装、重启及工作区恢复测试。

## 首次启动与运行环境（0.11.1 起）

Desktop 会复用已有的 Node.js 22+ 与 codefree-o 1.10.1+；缺失或版本较旧时，自动下载经过完整性与架构校验的原始组件，安装到 Desktop 专属目录，无需全局 npm 安装或管理员权限。首次准备需要联网，应用内可查看下载、验证与启动进度。

如果从较旧的外部 codefree-o 转用 Desktop 私有环境，需要重新登录。旧会话数据仍保存在原后端目录，不会自动迁入私有环境；项目文件仍在原路径。已有兼容的外部安装继续沿用原有状态。遇到初始化失败，可在错误面板复制详情、导出诊断日志或重试。

## macOS 提示应用已损坏

将应用移动到 `/Applications` 后，如果 macOS 提示“CodeFree Desktop 已损坏，无法打开”，请先确认安装包来自本仓库的官方 Release，然后在终端执行：

```bash
sudo xattr -dr com.apple.quarantine "/Applications/CodeFree Desktop.app"
```

执行后重新打开 CodeFree Desktop。

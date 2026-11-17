# CodeFree Desktop Releases

CodeFree Desktop 的官方安装包与自动更新元数据。

## 下载

请从仓库的 [Releases](https://github.com/a3538333/CodeFree-Desktop-Releases/releases) 页面下载适合当前系统的最新安装包。

仓库保留最近 10 个已发布版本，旧版本及其下载链接会定期清理。

每次发布后，`verify-release` 工作流会检查更新元数据的版本、下载文件大小、blockmap 是否齐全，
并完整下载所有安装包计算 SHA-512。校验时不保存安装包，验证报告保留 3 天。
也可以从 Actions 手动指定版本重新校验。这项检查不替代各平台实际安装、重启及工作区恢复测试。

## 首次启动与运行环境（0.11.2 起）

已有外部 codefree-o 时，Desktop 继续使用原环境。低于 1.10.1 的 npm 安装会在原安装位置升级，保留原 HOME、配置和数据，不再因为版本过低而改用私有环境。外部 Node.js 需 22+；缺失、过旧或损坏时，请按原安装方式修复并重新检测。升级失败可重试、切换下载源，或按提示明确选择管理员重试。

首次没有 codefree-o 时，可自动准备经过完整性与架构校验的私有运行组件。运行环境选择会持久保存；已选私有环境不会被后来安装的外部组件替换。首次准备需要联网，应用内可查看进度；遇到故障可复制详情、导出日志或重试。

**0.11.1 已撤回，请使用 0.11.2 或更新正式版本。** 已经通过 0.11.1 建立私有环境的用户，升级后保持该环境，不会自动切回外部环境，也不自动合并历史数据。原外部数据仍保存在原目录，项目文件仍在原路径。

## macOS 提示应用已损坏

将应用移动到 `/Applications` 后，如果 macOS 提示“CodeFree Desktop 已损坏，无法打开”，请先确认安装包来自本仓库的官方 Release，然后在终端执行：

```bash
sudo xattr -dr com.apple.quarantine "/Applications/CodeFree Desktop.app"
```

执行后重新打开 CodeFree Desktop。

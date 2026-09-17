# CodeFree Desktop Releases

CodeFree Desktop 的官方安装包与自动更新元数据。

## 下载

请从仓库的 [Releases](https://github.com/a3538333/CodeFree-Desktop-Releases/releases) 页面下载适合当前系统的最新安装包。

仓库保留最近 10 个已发布版本，旧版本及其下载链接会定期清理。

## macOS 提示应用已损坏

将应用移动到 `/Applications` 后，如果 macOS 提示“CodeFree Desktop 已损坏，无法打开”，请先确认安装包来自本仓库的官方 Release，然后在终端执行：

```bash
sudo xattr -dr com.apple.quarantine "/Applications/CodeFree Desktop.app"
```

执行后重新打开 CodeFree Desktop。

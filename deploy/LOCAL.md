# 本机部署（Windows）

> 目标：在你自己电脑上常驻一个本地站点，浏览器打开 `http://127.0.0.1:8000/` 即可使用；不依赖外网、不需要域名、不上传数据。  
> 只服务 `web/` 目录；默认只绑定 `127.0.0.1`，同一局域网的其他设备不能访问（需要时见第 5 节）。

## 1. 一键安装

在仓库根目录打开 PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\install_local.ps1
```

它会做四件事：

1. 在**启动文件夹**创建 `TCM-YinYang-LocalServer.lnk`，登录 Windows 后自动在后台启动服务器；
2. 在**桌面**创建 `TCM-YinYang.url`，双击打开本地站点；
3. 立即启动服务器（如果 8000 端口未被占用）；
4. 做一次 HTTP 检查。

安装后打开：

- 主演示：http://127.0.0.1:8000/
- 数据推演：http://127.0.0.1:8000/dataset.html
- 研究模式：http://127.0.0.1:8000/research.html

## 2. 手动启动 / 停止

```powershell
# 可见窗口启动（调试用；关闭窗口即停止）
.\deploy\start_local.bat

# 后台启动（不弹窗）
wscript.exe .\deploy\start_local_hidden.vbs

# 停止
powershell -ExecutionPolicy Bypass -File .\deploy\stop_local.ps1
```

服务器日志：`deploy/local_server.log`  
PID 文件：`deploy/local_server.pid`

## 3. 卸载

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\uninstall_local.ps1
```

会删除桌面/启动文件夹快捷方式并停止服务器；不会删除 `web/` 里的代码和截图。

## 4. 更新站点

直接修改 `web/` 下的文件，刷新浏览器即可，不需要重新构建。  
如果改了 `local_server.py`/端口，先停止再启动：

```powershell
.\deploy\stop_local.ps1
wscript.exe .\deploy\start_local_hidden.vbs
```

## 5. 让同一局域网的其他设备访问（可选）

默认 `127.0.0.1` 只允许本机。课堂用平板/手机访问时：

```powershell
python .\deploy\local_server.py --lan --port 8000
```

然后：
- 用 `ipconfig` 查本机 IPv4，例如 `192.168.1.23`；
- 其他设备打开 `http://192.168.1.23:8000/`；
- Windows 防火墙需要允许 Python 的专用网络入站；
- 只在学校/家庭可信网络使用，不要把端口映射到公网。

## 6. 端口被占用

```powershell
Get-NetTCPConnection -LocalPort 8000 -State Listen
```

如果是旧的 `python http.server`/`local_server.py`，用 `stop_local.ps1` 停止；如果是其他软件，换端口：

```powershell
python .\deploy\local_server.py --port 8010 --open
```

对应地址改为 `http://127.0.0.1:8010/`；桌面快捷方式需要手动改 URL。

## 7. 与域名部署的关系

`deploy/DEPLOY.md` 是“部署到自己的域名”的 Cloudflare/Netlify/Vercel/GitHub Pages/Nginx 指南，仍然保留；本次按你的要求使用**本机部署**，不需要域名或备案。

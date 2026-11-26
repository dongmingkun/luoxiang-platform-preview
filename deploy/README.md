# 本机预览 · 8020

`http://127.0.0.1:8020/` 是**唯一预览地址**。后续平台改动直接改本仓库当前分支的 `web/`，刷新页面即可看到，不再维护 `tcm-luoxiang-deploy/` 这类静态副本。

## 运行方式

- 网页根目录：本仓库 `web/`
- 模型目录：仓库同级 `../tcm-human-model/web/assets/`
- 服务脚本：`deploy/preview_server.py`
- 启动：`powershell -ExecutionPolicy Bypass -File deploy/start_preview.ps1`
- 停止：`powershell -ExecutionPolicy Bypass -File deploy/stop_preview.ps1`
- 日志：`deploy/preview_server.log`、`deploy/preview_server.err.log`
- PID：`deploy/preview_server.pid`

启动脚本已设置为登录时自动运行（Windows 启动文件夹快捷方式 `络象经纬预览.lnk`）。端口已占用时不会重复启动。

## 模型仍不进平台仓

服务只把以下四个文件名映射到外部模型目录：

- `anatomy_male.glb`
- `anatomy_female.glb`
- `meridians.json`
- `meridians_female.json`

其他路径仍只从 `web/` 读取，不会暴露模型目录，也不会跨仓自动下载。平台 Git 中仍然没有模型；`git status` 不应出现模型文件。

结构页的“载入已整合版”会在本机请求 `/assets/anatomy_male.glb`，由预览服务从外部目录读取。这相当于队长在本地手动整合，只是不复制文件进平台仓。

## 修改后的验收

1. 改 `web/` 后直接刷新 <http://127.0.0.1:8020/>。
2. 答辩/现场演示打开 <http://127.0.0.1:8020/index.html?demo=1>，确认只显示标准案例、自由症状输入已隐藏。
3. 结构页点“载入已整合版”，确认器官数与状态：`14 个器官结构 · 354,643 三角面`。
4. 检查桌面 1280 和手机 390 无横向溢出。
5. 改了 `preview_server.py` 才需要重启服务：

```powershell
powershell -ExecutionPolicy Bypass -File deploy/stop_preview.ps1
powershell -ExecutionPolicy Bypass -File deploy/start_preview.ps1
```

## 局域网

默认只绑定 `127.0.0.1`，其他人不能访问。需要局域网演示时，用 `--bind 0.0.0.0` 启动，并在 Windows 防火墙放行 8020；此前 `10.138.9.62:8020` 未通过，故不把它写成已验证。

## 旧地址

- `8000`：旧的完整个人仓服务，不是平台预览基准。
- `tcm-luoxiang-deploy/`：旧静态覆盖层，保留仅作回退；后续不再更新。

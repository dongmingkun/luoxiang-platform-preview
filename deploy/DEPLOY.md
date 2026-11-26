# 部署到自己的域名

> 目标：把 `web/` 作为纯静态站点部署到你的域名，而不是继续用 `127.0.0.1:8000`。
> 站点没有后端；数据推演/研究模式都在浏览器本地运行。
> 唯一需要外部条件的是：**域名 + DNS 管理权限 + 一个静态托管平台/服务器**。

## 0. 先确认三件事

| 需要 | 说明 |
|---|---|
| 域名 | 例如 `tcm.example.com`；建议用子域名，避免影响主站 |
| DNS 权限 | 能添加 CNAME/A 记录；如果域名在国内备案，需确认主机是否要求备案 |
| 托管方式 | Cloudflare Pages / Netlify / Vercel / 自己的 VPS+Nginx / 国内 OSS+COS |

把这三项交给 ZCode 后，才能实际绑定域名并验证 HTTPS。没有域名/权限时，只能生成部署包与配置，不能替你完成 DNS 解析。

## 1. 推荐方案

### 方案 A：Cloudflare Pages（最省事，推荐）

适合：有域名、能把 DNS 接到 Cloudflare；不想维护服务器。

1. 把仓库推到 GitHub（需要 `origin`）。
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git。
3. 选择仓库；构建命令留空；输出目录填 `web`。
4. 部署完成后，在 Pages 项目 → Custom domains → 添加 `tcm.你的域名`。
5. 按提示添加 CNAME（通常指向 `<project>.pages.dev`），SSL/TLS 设为 Full。
6. 打开 `https://tcm.你的域名/`、`/judge.html`、`/yangqi.html`、`/dataset.html`、`/research.html` 验证。

> 免费额度：单文件 ≤25 MiB（`anatomy_male.glb` 约 6.4 MB、`anatomy_female.glb` 约 6.4 MB，均够用）；流量按 Cloudflare 政策。
> 国内访问 Cloudflare Pages 可能不稳定；如果主要面向国内课堂，优先 VPS/国内云。

### 方案 A2：GitHub Pages（已有 GitHub 仓库时）

1. 把仓库推到 GitHub（`main` 或 `master`）。
2. 仓库 Settings → Pages → Build and deployment → Source 选 **GitHub Actions**。
3. 推送后 `.github/workflows/pages.yml` 自动部署；首次等 Actions 完成。
4. Settings → Pages → Custom domain 填 `tcm.你的域名`，按提示加 CNAME；开启 Enforce HTTPS。
5. 确认 `web/assets/anatomy_male.glb` / `anatomy_female.glb` 不是 LFS 指针；workflow 已开 `lfs: true` 并检查文件大小。

### 方案 B：Netlify

1. 仓库根目录已提供 `netlify.toml`（publish=`web`）。
2. Netlify → Add new site → Import from Git；构建命令留空；publish 目录应为 `web`。
3. Domain management → Add custom domain → 按提示加 CNAME/A。
4. 开启 HTTPS（Let's Encrypt 自动）。

### 方案 C：Vercel

1. 仓库根目录已提供 `vercel.json`（outputDirectory=`web`）。
2. Vercel → Add New Project → Import Git；Framework 选 Other；Build 留空。
3. Settings → Domains → 添加域名；按提示配置 CNAME/A。
4. 验证 HTTPS 与三个页面。

### 方案 D：自己的 VPS + Nginx（国内可控，推荐用于课堂）

前提：有服务器 SSH、域名 A 记录、HTTPS 证书（Let's Encrypt）。

```bash
# 本地：把 web/ 同步到服务器
rsync -av --delete web/ user@your-server:/var/www/tcm-yinyang-body/

# 服务器：Nginx 配置
sudo cp deploy/nginx.conf /etc/nginx/conf.d/tcm.conf
sudo sed -i 's/__DOMAIN__/tcm.你的域名/g' /etc/nginx/conf.d/tcm.conf
sudo nginx -t && sudo systemctl reload nginx

# HTTPS（二选一）
sudo certbot --nginx -d tcm.你的域名
# 或使用已有证书，修改 nginx.conf 中 ssl_certificate 路径
```

> 国内服务器 + 国内域名通常需要 ICP 备案；未备案可能被云厂商拦截。
> 如果域名在阿里云/腾讯云，也可用 OSS/COS 静态网站 + CDN + 证书，步骤见第 3 节。

### 方案 E：阿里云 OSS / 腾讯云 COS 静态网站

适合：国内访问、已有备案域名。

```bash
# 阿里云示例（需 ossutil 与 AK/SK）
ossutil cp -r web/ oss://your-bucket/ --update
# 腾讯云示例（需 coscli 与 SecretId/Key）
coscli cp web/ cos://your-bucket/ -r
```

然后在控制台：
1. 开启“静态网站”/“默认首页 index.html”；
2. 绑定自定义域名；
3. 配置 HTTPS 证书；
4. 给 `.glb` 设置 `Content-Type: model/gltf-binary`（不设置通常也能加载，但建议）；
5. CDN 缓存 HTML 短、JS/CSS/GLB 长缓存。

## 2. 本仓库已提供的部署配置

| 文件 | 用途 |
|---|---|
| `netlify.toml` | Netlify：publish=`web` |
| `vercel.json` | Vercel：outputDirectory=`web` |
| `web/_headers` | Cloudflare Pages/Netlify：安全头与缓存 |
| `.github/workflows/pages.yml` | GitHub Pages 自动部署（需把仓库推到 GitHub） |
| `deploy/nginx.conf` | VPS/Nginx 反向静态站点配置（域名用 `__DOMAIN__` 占位） |
| `deploy/DEPLOY.md` | 本文 |

## 3. 上线前检查

- [ ] `web/assets/anatomy_male.glb` 与 `anatomy_female.glb` 实际文件已上传（不是 Git LFS 指针；若用 GitHub Pages，checkout 时开启 `lfs: true`）。
- [ ] 首页、`/judge.html`、`/yangqi.html`、`/dataset.html`、`/research.html` 都能打开。
- [ ] 浏览器控制台 0 error；3D 模型加载成功。
- [ ] 数据推演能加载演示数据；CSV/JSON 导入正常。
- [ ] 研究模式能走通知情同意→前测→后测→CSV。
- [ ] HTTPS 证书有效；HTTP 自动跳转 HTTPS。
- [ ] 页面没有 `127.0.0.1`/`localhost` 残留。
- [ ] 移动端 390×844 可用。
- [ ] `web/data/dataset_demo.csv` 仍标注“非临床演示数据”。
- [ ] 没有把真实病例/个人信息上传到公开目录。
- [ ] BodyParts3D 署名、Three.js MIT、医学免责声明可见。

## 4. 需要你提供的信息

把下面几项发给 ZCode，才能实际部署/绑定：

```text
域名：
托管方式：Cloudflare Pages / Netlify / Vercel / VPS / 阿里云 OSS / 腾讯云 COS
DNS 权限：有 / 无（是否能添加 CNAME/A）
服务器信息（若 VPS）：SSH 用户@IP、站点目录、是否有 sudo
GitHub 仓库（若用 Pages/Pages 连接）：<账号>/<仓库名>
```

> 只要给域名 + 托管方式 + 相应权限，下一步就可以把站点部署到 `https://你的域名/` 并做线上验收。

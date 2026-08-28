# Appointment Lite v0.7.0 — Mac 覆盖与发布说明

## 版本

`v0.7.0-shopline-subscription-integration`

本版本加入 SHOPLINE 应用订阅：单一 **Appointment Lite Pro / USD 5.99 每月**，**7 天试用由 SHOPLINE 后台配置和管理**，Appointment Lite 不维护本地试用倒计时。

## 1. 本地一键安全覆盖

先把发布 ZIP 放到 Mac 的 `~/Downloads/`，文件名保持：

```text
appointment-lite-v0.7.0-shopline-subscription-integration.zip
```

然后在你当前 Appointment Lite 项目根目录执行：

```bash
bash <<'BASH'
set -euo pipefail

ZIP="$HOME/Downloads/appointment-lite-v0.7.0-shopline-subscription-integration.zip"
PROJECT="$(pwd -P)"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/appointment-lite-v070.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT INT TERM

fail() {
  echo ""
  echo "========================================"
  echo "ERROR: Appointment Lite v0.7.0 stopped: $1"
  echo "========================================"
  exit 1
}

[ -f "$PROJECT/package.json" ] || fail "Run this command from the Appointment Lite project root"
[ "$(node -p "require('./package.json').name" 2>/dev/null || true)" = "appointment-lite" ] || fail "Current folder is not Appointment Lite"
[ -f "$ZIP" ] || fail "ZIP not found: $ZIP"

unzip -t "$ZIP" >/dev/null || fail "ZIP integrity check failed"

if [ -d .git ] && [ -n "$(git status --porcelain 2>/dev/null || true)" ]; then
  BACKUP_BRANCH="backup/v0.7.0-pre-subscription-$(date +%Y%m%d-%H%M%S)"
  git branch "$BACKUP_BRANCH" >/dev/null 2>&1 || true
  echo "Backup branch: $BACKUP_BRANCH"
fi

unzip -q "$ZIP" -d "$TMP"
SRC="$TMP/appointment-lite-v0.7.0-shopline-subscription-integration"
[ -f "$SRC/package.json" ] || fail "Release root is missing"

rsync -a \
  --exclude='.env' \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='theme-app-extension/' \
  "$SRC/" "$PROJECT/"

if [ -d theme-app-extension ]; then
  rsync -a --delete theme-extension-source/ theme-app-extension/
fi

npm ci
npm run check
npm test

echo ""
echo "========================================"
echo "Appointment Lite v0.7.0 local upgrade complete"
echo "========================================"
git status --short 2>/dev/null || true
BASH
```

说明：主项目覆盖会保留本地 `.env`、`.git`、`node_modules` 和 CLI 创建的 `theme-app-extension/` 外壳；最后只把受版本控制的 `theme-extension-source/` 同步进已存在的 CLI Extension 目录。

## 2. Railway 先增加环境变量（暂时不要打开订阅门禁）

```env
SHOPLINE_SUBSCRIPTION_ENABLED=false
SHOPLINE_PARTNER_TOKEN=<SHOPLINE Partner Center 生成的 Partner Token>
SHOPLINE_PARTNER_API_VERSION=v20220901
SHOPLINE_SUBSCRIPTION_SPU_KEY=<SHOPLINE 后台真实 SPU Key>
SHOPLINE_SUBSCRIPTION_PLAN_NAME=Appointment Lite Pro
SHOPLINE_SUBSCRIPTION_PRICE_USD=5.99
SHOPLINE_SUBSCRIPTION_TRIAL_DAYS=7
SHOPLINE_SUBSCRIPTION_GRACE_HOURS=24
SHOPLINE_SUBSCRIPTION_SYNC_MAX_AGE_SECONDS=120
SHOPLINE_SUBSCRIPTION_TIMEOUT_MS=15000
```

如果你创建套餐时 SPU Key 就是 `appointment_lite_pro`，那么：

```env
SHOPLINE_SUBSCRIPTION_SPU_KEY=appointment_lite_pro
```

Partner Token 只放 Railway，不要放前端、Theme Extension，也不要提交到 Git。

## 3. SHOPLINE Webhook

使用已有 Endpoint：

```text
https://appointment.toolkit.fans/webhooks/shopline
```

新增订阅：

```text
appsubscription/create
appsubscription/expiration
appsubscription/paid
```

现有 Endpoint 已有 HMAC 验签和 Webhook ID 幂等处理。

## 4. 第一次 Railway 部署（订阅门禁仍为 false）

```bash
railway up -d
```

部署后检查：

```bash
curl -sS https://appointment.toolkit.fans/health
```

应该看到 `0.7.0` / `0.7.0-subscription.1`。

## 5. 联调 SHOPLINE 订阅

先用测试店铺完成：

```text
未订阅
→ SHOPLINE 官方订阅/试用入口
→ 7 天 Trial 在 SHOPLINE 创建
→ Appointment Lite 同步 list.json
→ status=active
→ type=trial
→ 正确读取 SHOPLINE end_at
```

再验证支付结果与订阅创建 Webhook 返回 HTTP 200。

如果需要在 Appointment Lite 的订阅页发起结算，后台按钮会调用 `create_pay.json` 并跳转 SHOPLINE Checkout；代码不会自行创建七天试用。

## 6. 确认联调正常后开启订阅门禁

Railway：

```env
SHOPLINE_SUBSCRIPTION_ENABLED=true
```

然后重新部署：

```bash
railway up -d
```

开启后：

- active / SHOPLINE 宽恕期内：可以使用；
- pending / unactive / cancelled / 无订阅：进入 Plan & billing；
- 新的前台预约也会由服务器拦截；
- 已有服务、员工、预约历史不会因为订阅失效被删除。

## 7. Git + Railway + Theme Extension 发布命令

确认上面的联调完成后，再执行：

```bash
bash <<'BASH'
set -euo pipefail

VERSION="v0.7.0-shopline-subscription-integration"

echo "[1/5] Final checks"
npm run check
npm test

echo "[2/5] Git commit"
git add -A
if ! git diff --cached --quiet; then
  git commit -m "release: ${VERSION}"
else
  echo "No Git changes to commit."
fi

echo "[3/5] Git push"
git push

echo "[4/5] Railway deploy"
railway up -d

echo "[5/5] Theme Extension push"
if [ -d theme-app-extension ]; then
  rsync -a --delete theme-extension-source/ theme-app-extension/
  (
    cd theme-app-extension
    sl extension push
  )
else
  echo "theme-app-extension/ not found; skipping sl extension push."
fi

printf '\n========================================\n'
printf 'Appointment Lite %s release commands completed\n' "$VERSION"
printf '========================================\n'
BASH
```

`sl extension push` 仍由 SHOPLINE CLI 的交互结果决定最终是否发布成功；Railway 与 Extension 不互相等待。

## 8. 回滚开关

如果订阅联调中发现 Partner API、SPU Key 或 Webhook 配置异常，最快的业务回滚方式是：

```env
SHOPLINE_SUBSCRIPTION_ENABLED=false
```

然后重新部署 Railway。这样不会删除订阅数据，只会暂时关闭 Appointment Lite 自己的订阅门禁。


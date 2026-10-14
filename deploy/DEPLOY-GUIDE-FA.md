# راهنمای گام‌به‌گام دیپلوی سوپرمارکت رحیمی روی VPS

دامنه: `supermarketrahimi.ir`
پروژه: Next.js 16 + Prisma 7 + PostgreSQL (عکس‌ها داخل خود دیتابیس ذخیره می‌شن، پس پوشه‌ی آپلود جدا لازم نیست)

> در این راهنما فرض شده سرور **Ubuntu 22.04 یا 24.04** هست و با کاربر `root` بهش دسترسی داری.
> هر جا `IP_SERVER` دیدی، یعنی IP سرورت.

---

## نقشه‌ی کلی

```
مرورگر ──HTTPS──► nginx (پورت 80/443) ──► برنامه‌ی Next.js (پورت 3000، با pm2) ──► PostgreSQL (فقط داخل سرور)
```

- **nginx** درخواست‌ها رو می‌گیره، HTTPS رو مدیریت می‌کنه و می‌فرسته به برنامه.
- **pm2** برنامه رو همیشه روشن نگه می‌داره.
- **PostgreSQL** فقط روی خود سرور گوش می‌ده و از بیرون در دسترس نیست (امن‌تره).

---

## گام ۰ — قبل از شروع

۱. VPS با حداقل **۲ گیگ رم** (با ۱ گیگ هم میشه، ولی حتماً swap بساز؛ گام ۳).
۲. یادت باشه: اگه سرور **خارج از ایران** باشه، ممکنه زرین‌پال، sms.ir یا کاوه‌نگار درخواست‌های IP خارجی رو رد کنن. اگه سرور **داخل ایران** باشه، ممکنه نصب پکیج‌ها (npm، NodeSource) نیاز به DNS/میرور داشته باشه. اگه جایی گیر کردی، خطا رو برام بفرست.
۳. روی کامپیوتر خودت `git bash` یا `WSL` (ویندوز) یا ترمینال (مک/لینوکس) داشته باش؛ برای اسکریپت آپدیت لازمه.

---

## گام ۱ — وصل‌کردن دامنه به سرور (DNS)

باید این دو رکورد **A** رو توی پنل DNS دامنه بسازی:

| نوع | نام | مقدار |
|---|---|---|
| A | `@` (یعنی supermarketrahimi.ir) | `IP_SERVER` |
| A | `www` | `IP_SERVER` |

نکته برای دامنه‌ی `.ir`: سایت nic.ir فقط Nameserver (NS) رو نگه می‌داره. پس دو حالت داری:
- اگه دامنه رو از یه شرکت ثبت/هاستینگ گرفتی که پنل DNS داره، همون‌جا رکوردها رو بساز.
- یا توی nic.ir، Nameserverها رو بذار روی Nameserverهای یه سرویس DNS (مثلاً همون که VPS رو ازش گرفتی یا Cloudflare). بعد رکوردها رو اون‌جا بساز.

(اگه از Cloudflare با حالت «ابر نارنجی/Proxy» استفاده کنی، بعداً توی `.env` مقدار `TRUSTED_PROXY_COUNT=2` بذار.)

بعد از چند دقیقه تا چند ساعت، از کامپیوتر خودت چک کن:

```bash
nslookup supermarketrahimi.ir
```

اگه IP سرورت رو نشون داد، آماده‌ای. (گام‌های ۲ تا ۸ رو می‌تونی همین الان انجام بدی؛ فقط گام HTTPS منتظر DNS می‌مونه.)

---

## گام ۲ — اولین ورود و ساخت کاربر امن

از کامپیوتر خودت:

```bash
ssh root@IP_SERVER
```

داخل سرور:

```bash
apt update && apt upgrade -y

# ساخت کاربر deploy (برای اجرای برنامه؛ کار با root برای برنامه خطرناکه)
adduser deploy
usermod -aG sudo deploy

# کپی کلید SSH به کاربر جدید (اگه با کلید وارد شدی)
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

> اگه با پسورد وارد شدی و کلید SSH نداری، روی کامپیوتر خودت اول `ssh-keygen -t ed25519` بزن و بعد `ssh-copy-id deploy@IP_SERVER`.

فایروال:

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```

حالا یه ترمینال دیگه باز کن و تست کن که ورود با کاربر جدید کار می‌کنه:

```bash
ssh deploy@IP_SERVER
```

از این به بعد با `deploy` کار می‌کنیم (دستورهای نیازمند دسترسی بالا با `sudo` شروع می‌شن).

---

## گام ۳ — نصب ابزارها

```bash
# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# بقیه‌ی ابزارها
sudo apt install -y nginx postgresql postgresql-contrib rsync certbot python3-certbot-nginx build-essential

# pm2
sudo npm install -g pm2

# بررسی نسخه‌ها (Node باید 22.18 یا بالاتر باشه)
node -v
psql --version
nginx -v
```

**ساخت swap (اگه رم ≤ ۲ گیگه، حتماً؛ بدونش build ممکنه با خطای حافظه بمیره):**

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## گام ۴ — ساخت دیتابیس PostgreSQL

اول یه پسورد قوی بساز و **یه‌جا یادداشتش کن**:

```bash
openssl rand -hex 16
```

(خروجی فقط حرف و عدده، پس توی آدرس اتصال مشکلی نمی‌سازه.)

بعد وارد PostgreSQL شو:

```bash
sudo -u postgres psql
```

داخلش (به‌جای `DB_PASSWORD` همون پسورد رو بذار):

```sql
CREATE USER shop_user WITH PASSWORD 'DB_PASSWORD';
CREATE DATABASE shop OWNER shop_user;
\q
```

تست اتصال:

```bash
psql "postgresql://shop_user:DB_PASSWORD@localhost:5432/shop" -c "select 1;"
```

اگه `1` نشون داد، دیتابیس آماده‌ست. (PostgreSQL به‌صورت پیش‌فرض فقط روی localhost گوش می‌ده؛ پورت ۵۴۳۲ رو توی فایروال باز نکن.)

---

## گام ۵ — فرستادن پروژه به سرور

### ۵.۱ ساخت پوشه‌ی برنامه روی سرور

```bash
sudo mkdir -p /var/www/shop
sudo chown deploy:deploy /var/www/shop
```

### ۵.۲ تنظیم اسکریپت روی کامپیوتر خودت

داخل پوشه‌ی پروژه، فایل `deploy.sh` رو باز کن و خط `SERVER=` رو درست کن:

```bash
SERVER="${SERVER:-deploy@IP_SERVER}"
```

### ۵.۳ ارسال اولیه

از داخل پوشه‌ی پروژه، روی کامپیوتر خودت (git bash / WSL / ترمینال):

```bash
chmod +x deploy.sh
rsync -az --exclude node_modules --exclude .next --exclude generated --exclude .git \
  ./ deploy@IP_SERVER:/var/www/shop/
```

(فعلاً فقط فایل‌ها رو می‌فرستیم؛ هنوز `.env` نداریم و build نمی‌کنیم.)

> **اگه rsync نداری (مثلاً ویندوز بدون WSL):** پروژه رو zip کن (بدون `node_modules` و `.next`)، با WinSCP یا `scp` به سرور بفرست و روی سرور داخل `/var/www/shop` باز کن:
> `scp shop.zip deploy@IP_SERVER:/tmp/` و بعد روی سرور: `cd /var/www/shop && unzip -o /tmp/shop.zip`

---

## گام ۶ — ساخت فایل `.env` روی سرور

روی سرور:

```bash
cd /var/www/shop
cp deploy/env.production.template .env
chmod 600 .env
nano .env
```

این مقدارها رو درست کن:

| متغیر | چی بذارم |
|---|---|
| `DATABASE_URL` | `postgresql://shop_user:DB_PASSWORD@localhost:5432/shop` (پسورد گام ۴) |
| `AUTH_SECRET` | خروجی `openssl rand -base64 48 \| tr '+/' '-_' \| tr -d '='` |
| `SITE_URL` | `https://supermarketrahimi.ir` (حتماً؛ آدرس بازگشت درگاه پرداخت از این ساخته می‌شه) |
| `TRUSTED_PROXY_COUNT` | `1` (فقط nginx) — با Cloudflare: `2` |
| `SMS_PROVIDER` | `smsir` یا `kavenegar` — **`console` روی سرور واقعی کار نمی‌کنه** و ورود با خطا برمی‌گرده |
| کلیدهای پیامک | از پنل sms.ir یا کاوه‌نگار. اگه «محدودیت IP» فعاله، IP سرور رو اضافه کن |
| `ZARINPAL_MERCHANT_ID` | مرچنت‌کد زرین‌پال؛ دامنه‌ی `supermarketrahimi.ir` باید توی پنل زرین‌پال ثبت و تأیید شده باشه |
| `PAYMENT_SANDBOX` | **خالی** (فقط برای یه تست کوتاه `1` کن و برگردون) |

ذخیره: `Ctrl+O` ، `Enter` ، `Ctrl+X`.

> کلیدهای VAPID (اعلان پوش) رو در گام ۸ می‌سازیم.

---

## گام ۷ — اولین build و اجرا

روی سرور:

```bash
cd /var/www/shop
npm ci
npm run build
```

`npm run build` سه کار می‌کنه: ساخت جدول‌های دیتابیس با migrationها، تولید Prisma Client، و build خود Next. چند دقیقه طول می‌کشه.

اجرا با pm2:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

دستور آخر یه خط شبیه `sudo env PATH=... pm2 startup systemd -u deploy ...` چاپ می‌کنه؛ **همون خط رو کپی و اجرا کن** تا بعد از ری‌استارت سرور، سایت خودش بالا بیاد.

تست:

```bash
curl -I http://127.0.0.1:3000
pm2 status
```

اگه `200` یا `307` دیدی و `shop` در حالت `online` بود، برنامه کار می‌کنه.

---

## گام ۸ — کلید اعلان پوش + ساخت ادمین

```bash
cd /var/www/shop
npm run generate-vapid
```

دو کلید چاپ می‌شه. توی `.env` بذارشون (`VAPID_PUBLIC_KEY` و `VAPID_PRIVATE_KEY`) و بعد:

```bash
pm2 restart shop --update-env
```

ساخت ادمین (شماره‌ی موبایل خودت):

```bash
npm run make-admin -- 09123456789
```

اگه اون شماره کاربر نبود، می‌سازتش با رمز موقت.

---

## گام ۹ — nginx و HTTPS

```bash
cd /var/www/shop
sudo cp deploy/nginx-shop.conf /etc/nginx/sites-available/shop
sudo ln -s /etc/nginx/sites-available/shop /etc/nginx/sites-enabled/shop
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

حالا `http://supermarketrahimi.ir` باید سایت رو نشون بده (اگه DNS آماده باشه).

گواهی HTTPS رایگان:

```bash
sudo certbot --nginx -d supermarketrahimi.ir -d www.supermarketrahimi.ir
```

وقتی پرسید redirect فعال بشه یا نه، گزینه‌ی redirect (HTTP → HTTPS) رو انتخاب کن. تمدید گواهی خودکاره؛ تست:

```bash
sudo certbot renew --dry-run
```

> HTTPS برای اینا **لازمه**: موقعیت مکانی (نقشه)، اعلان پوش، و درگاه پرداخت.

---

## گام ۱۰ — چک‌لیست بعد از راه‌اندازی

- [ ] `https://supermarketrahimi.ir` باز می‌شه و قفل HTTPS داره
- [ ] ورود با پیامک: کد واقعاً میاد
- [ ] ورود با شماره‌ی ادمین و باز شدن `/admin`
- [ ] ساخت یک محصول و آپلود عکس
- [ ] ثبت یک سفارش و پرداخت (برای تست بدون مبلغ واقعی، موقتاً `PAYMENT_SANDBOX=1` بذار، تست کن و **برش‌گردون**)
- [ ] اعلان‌های لحظه‌ای (زنگوله) کار می‌کنن
- [ ] `https://supermarketrahimi.ir/sitemap.xml` آدرس درست رو نشون می‌ده

---

## آپدیت‌کردن سایت (روال همیشگی)

۱. روی کامپیوتر خودت تغییر بده و با `npm run dev` تست کن.
۲. از داخل پوشه‌ی پروژه:

```bash
./deploy.sh
```

همین. این اسکریپت:
- فقط فایل‌های تغییرکرده رو می‌فرسته (`.env` و `node_modules` رو هیچ‌وقت نمی‌فرسته)
- اگه `package-lock.json` عوض شده باشه `npm ci` می‌زنه
- `npm run build` می‌زنه (migrationهای جدید دیتابیس خودکار اجرا می‌شن)
- برنامه رو ری‌استارت می‌کنه و سلامتش رو چک می‌کنه

(موقع build چند ثانیه تا چند دقیقه سایت ممکنه کند یا لحظه‌ای قطع بشه؛ بهتره ساعت شلوغی آپدیت نکنی.)

### تغییر در ساختار دیتابیس (جدول/ستون جدید)

روی **کامپیوتر خودت**:

```bash
npx prisma migrate dev --name اسم_تغییر
```

این یه پوشه‌ی جدید داخل `prisma/migrations` می‌سازه. بعد `./deploy.sh` بزن؛ روی سرور خودکار اعمال می‌شه.

قانون‌ها:
- روی سرور **هیچ‌وقت** `migrate dev` یا `migrate reset` نزن (داده‌ها پاک می‌شن).
- ستون‌ها و جدول‌ها رو مستقیم با SQL روی سرور عوض نکن.

### تغییر `.env`

فایل `.env` فقط روی سرور هست:

```bash
ssh deploy@IP_SERVER
cd /var/www/shop
nano .env
pm2 restart shop --update-env
```

---

## بکاپ دیتابیس

عکس‌ها هم داخل دیتابیسن، پس همین بکاپ کل اطلاعات سایته.

```bash
sudo mkdir -p /var/backups/shop
sudo chown deploy:deploy /var/backups/shop
chmod +x /var/www/shop/deploy/backup-db.sh
/var/www/shop/deploy/backup-db.sh        # تست دستی
crontab -e
```

داخل crontab این خط رو اضافه کن (هر شب ساعت ۳):

```
0 3 * * * /var/www/shop/deploy/backup-db.sh >> /var/backups/shop/backup.log 2>&1
```

**بکاپ‌ها رو گاهی به یه جای دیگه هم کپی کن** (کامپیوتر خودت یا یه سرور دیگه)، چون اگه خود VPS خراب بشه بکاپ روی همون سرور هم از بین می‌ره:

```bash
scp deploy@IP_SERVER:/var/backups/shop/*.dump ./backups/
```

بازگردانی بکاپ:

```bash
pg_restore --clean --if-exists --no-owner -d "postgresql://shop_user:DB_PASSWORD@localhost:5432/shop" فایل.dump
```

---

## انتقال دیتای فعلی (اگه روی کامپیوتر خودت دیتابیس داری)

روی کامپیوتر خودت:

```bash
pg_dump -Fc "آدرس_دیتابیس_محلی" -f local.dump
scp local.dump deploy@IP_SERVER:/tmp/
```

روی سرور، **قبل از اولین build** (یا بعدش با `--clean`):

```bash
pg_restore --clean --if-exists --no-owner -d "postgresql://shop_user:DB_PASSWORD@localhost:5432/shop" /tmp/local.dump
```

---

## دستورهای پرکاربرد

| کار | دستور |
|---|---|
| وضعیت برنامه | `pm2 status` |
| دیدن لاگ زنده | `pm2 logs shop` |
| ۱۰۰ خط آخر لاگ | `pm2 logs shop --lines 100 --nostream` |
| ری‌استارت | `pm2 restart shop --update-env` |
| تست تنظیم nginx | `sudo nginx -t` |
| ری‌لود nginx | `sudo systemctl reload nginx` |
| لاگ خطای nginx | `sudo tail -n 50 /var/log/nginx/error.log` |
| وضعیت PostgreSQL | `sudo systemctl status postgresql` |
| فضای دیسک / رم | `df -h` و `free -h` |

---

## مشکل‌های رایج

**۱. `npm run build` با «Killed» یا خطای حافظه تموم می‌شه** → swap نساختی (گام ۳) یا رم کمه.

**۲. سایت 502 Bad Gateway می‌ده** → برنامه بالا نیست. `pm2 status` و `pm2 logs shop` رو ببین. معمولاً `.env` ناقصه (مثلاً `DATABASE_URL`).

**۳. ورود با پیامک خطا می‌ده** → `SMS_PROVIDER` روی `console` یا خالیه، یا قالب پیامک تأیید نشده، یا IP سرور توی «محدودیت IP» پنل پیامک نیست.

**۴. پرداخت برنمی‌گرده به سایت / آدرس بازگشت اشتباهه** → `SITE_URL` رو درست و با `https://` بذار و ری‌استارت کن. دامنه باید توی پنل زرین‌پال هم تأیید شده باشه.

**۵. اعلان‌های لحظه‌ای (زنگوله) کار نمی‌کنن** → مطمئن شو از فایل `deploy/nginx-shop.conf` استفاده کردی (بخش `/api/notifications/stream` بافر رو خاموش می‌کنه).

**۶. `npm ci` یا نصب Node روی سرور داخل ایران گیر می‌کنه** → دسترسی به رجیستری npm یا NodeSource محدوده. خطا رو برام بفرست تا راه جایگزین (میرور) بدم.

**۷. بعد از `./deploy.sh` خطای `Permission denied`** → مطمئن شو `/var/www/shop` مال کاربر `deploy` هست: `sudo chown -R deploy:deploy /var/www/shop`.

**۸. certbot خطا می‌ده** → معمولاً DNS هنوز به سرور اشاره نمی‌کنه یا پورت ۸۰ بسته‌ست. `nslookup supermarketrahimi.ir` و `sudo ufw status` رو چک کن.

---

## چه فایل‌هایی روی سرور می‌رن؟

همه‌ی پروژه **به‌جز** این‌ها (که `deploy.sh` خودش حذفشون می‌کنه):

| نمی‌ره | چرا |
|---|---|
| `node_modules/` | روی سرور با `npm ci` ساخته می‌شه |
| `.next/` و `generated/` | روی سرور با `npm run build` ساخته می‌شن |
| `.env` | فقط روی خود سرور وجود داره (رمزها داخلشه) |
| `.git/` | لازم نیست |

فایل‌هایی که برای دیپلوی اضافه شدن:

| فایل | کارش |
|---|---|
| `ecosystem.config.cjs` | تنظیم pm2 |
| `deploy.sh` | (روی کامپیوتر تو) ارسال + آپدیت با یک دستور |
| `deploy/remote-build.sh` | (روی سرور) نصب، build، ری‌استارت |
| `deploy/nginx-shop.conf` | تنظیم nginx |
| `deploy/backup-db.sh` | بکاپ دیتابیس |
| `deploy/env.production.template` | الگوی `.env` سرور |
| `.gitignore` | جلوگیری از ورود `.env` و `node_modules` به git |

// تنظیمات pm2: برنامه رو همیشه روشن نگه می‌داره و بعد از ری‌استارت سرور دوباره بالا میاره.
module.exports = {
  apps: [
    {
      name: "shop",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1", // فقط روی خود سرور؛ بیرون از طریق nginx
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "800M",
      env: { NODE_ENV: "production" },
    },
  ],
};

module.exports = {
  apps: [
    {
      name: 'changdu-web-yu',
      script: 'pnpm',
      args: 'start',
      cwd: '/home/web/changdu-web-yu/current',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        AUTH_CONFIG_PATH: '/data/changdu-web-yu/auth.json',
        // 达人配置文件路径（可选）
        // 如果不设置，将使用默认路径：server/data/daren-config.json
        // 推荐设置为项目外的持久化路径，防止部署时被覆盖
        DAREN_CONFIG_PATH: '/data/changdu-web-yu/daren-config.json',
        DOUYIN_MATERIAL_CONFIG_PATH: '/data/changdu-web-yu/douyin-material-config.json',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
}

module.exports = {
  apps: [
    {
      name: 'abuse-ip-detector-frontend',
      script: 'npx',
      args: 'vite preview --host 0.0.0.0 --port 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/frontend-err.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true
    }
  ]
};
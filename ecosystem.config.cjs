// PM2 Ecosystem Config for aaPanel Deployment
// Usage: pm2 start ecosystem.config.cjs
// Or via aaPanel Node.js Project Manager

module.exports = {
  apps: [
    {
      name: 'mcp-v3',
      script: 'server.cjs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};

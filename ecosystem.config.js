// PM2 Configuration for running Expo on AWS EC2
// Use: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'expo-dev',
      script: 'npx',
      args: 'expo start --tunnel',
      cwd: '/home/ubuntu/VeaHome',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        EXPO_DEVTOOLS_LISTEN_ADDRESS: '0.0.0.0'
      },
      error_file: './logs/expo-error.log',
      out_file: './logs/expo-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'veahome-backend',
      script: 'npm',
      args: 'start',
      cwd: '/home/ubuntu/VeaHome/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};

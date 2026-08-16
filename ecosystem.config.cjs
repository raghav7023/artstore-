module.exports = {
  apps: [
    {
      name: 'artstore-backend',
      script: 'index.mjs',
      exec_mode: 'cluster',
      instances: 1,
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};

# Deploy backend on AWS (EC2)

This repo contains a React Native (Expo) app + a Node/Express backend.

For typical setups:
- Run the backend on an EC2 instance.
- Keep running Expo locally; point the app to the EC2 public URL.

## 1) EC2 prerequisites

- Ubuntu 22.04 (recommended)
- Open inbound ports in the Security Group:
  - `22` (SSH)
  - `8000` (backend API) or `80/443` if you reverse-proxy

## 2) Install Node + build tools

```bash
sudo apt-get update
sudo apt-get install -y git curl build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

## 3) Clone & install

```bash
git clone https://github.com/ralphestephan/VeaHome.git
cd VeaHome/backend
npm ci
```

## 4) Configure env

```bash
cp .env.example .env
nano .env
```

At minimum for Airguard:
- `PORT`
- Postgres (`DB_HOST/DB_*`) or `USE_IN_MEMORY_DB=true` for quick demos
- `INFLUX_V1_URL` + `INFLUX_V1_DB`
- `MQTT_URL` (so buzzer commands publish)

## 5) Build & run (PM2)

```bash
npm run build
sudo npm i -g pm2
pm2 start dist/server.js --name veahome-backend
pm2 save
pm2 status
```

Test:

```bash
curl http://127.0.0.1:8000/health
```

## 6) (Optional) Run as a service on boot

```bash
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

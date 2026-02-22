# Deploy Airborne Fitness on EC2 with Nginx

This guide assumes you have an EC2 instance with **Nginx** and **Node.js** (v18+) installed.

---

## 1. Prerequisites on EC2

- **Node.js** 18+ (e.g. from [NodeSource](https://github.com/nodesource/distributions))
- **Nginx**
- **MongoDB** reachable (same server, or Atlas / another host)

Optional but recommended: **PM2** for keeping the Node app running:

```bash
sudo npm install -g pm2
```

---

## 2. Build the app (on your machine or CI)

From the project root:

```bash
npm ci
npm run build
```

This produces:

- `dist/index.cjs` — bundled Node server
- `dist/public/` — built React client (Vite)

---

## 3. Upload to EC2

Copy the built app and production dependencies to the server.

**Option A – rsync (from your laptop):**

```bash
# Create app directory on server first: ssh ec2-user@YOUR_EC2_IP "mkdir -p /var/www/airborne-fitness"
rsync -avz --exclude node_modules dist package.json package-lock.json ec2-user@YOUR_EC2_IP:/var/www/airborne-fitness/
ssh ec2-user@YOUR_EC2_IP "cd /var/www/airborne-fitness && npm ci --omit=dev"
```

**Option B – Git (if repo is on GitHub):**

On EC2:

```bash
sudo mkdir -p /var/www/airborne-fitness
sudo chown $USER:$USER /var/www/airborne-fitness
cd /var/www/airborne-fitness
git clone https://github.com/YOUR_ORG/Airborne-Fitness.git .
git checkout main  # or your deploy branch
npm ci
npm run build
```

---

## 4. Environment on EC2

Create env file (do not commit secrets):

```bash
sudo nano /var/www/airborne-fitness/.env
```

Example:

```env
NODE_ENV=production
PORT=5001
HOST=127.0.0.1

# MongoDB (required)
MONGODB_URI=mongodb://localhost:27017/airborne_fitness
# Or Atlas:
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/airborne_fitness

# Optional: seed on first start (only if DB is empty)
# SEED_ON_START=true

# Optional: admin API (comma-separated phone numbers; send X-Admin-Phone header)
# ADMIN_ALLOWLIST_PHONES=9999977777
```

Secure the file:

```bash
chmod 600 /var/www/airborne-fitness/.env
```

---

## 5. Run the Node app

**With PM2 (recommended):**

```bash
cd /var/www/airborne-fitness

# Load env from .env
pm2 start dist/index.cjs --name airborne-fitness --node-args="--env-file=.env"

# Or if your Node doesn’t support --env-file:
# pm2 start "node -r dotenv/config dist/index.cjs" --name airborne-fitness

pm2 save
pm2 startup   # follow the command it prints to enable on boot
```

The app listens on `127.0.0.1:5001` (or whatever `PORT` you set). Nginx will proxy to it.

**Without PM2 (foreground):**

```bash
cd /var/www/airborne-fitness
NODE_ENV=production node -r dotenv/config dist/index.cjs
```

Use a systemd service or screen/tmux if you don’t use PM2.

---

## 6. Nginx reverse proxy

Nginx should terminate SSL (if you use HTTPS) and proxy to the Node app.

**Config file:** e.g. `/etc/nginx/sites-available/airborne-fitness` (Debian/Ubuntu) or `/etc/nginx/conf.d/airborne-fitness.conf` (RHEL/Amazon Linux).

```nginx
# Redirect HTTP to HTTPS (optional; remove if you don’t have SSL yet)
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL (use certbot or your certs)
    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Proxy all traffic to the Node app
    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

If you don’t have SSL yet, use only the second `server` block and change `listen 443 ssl http2` to `listen 80` and remove the `ssl_*` lines.

Enable and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/airborne-fitness /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. One-time seed (optional)

If the database is empty and you want seed data:

```bash
cd /var/www/airborne-fitness
DOTENV_CONFIG_PATH=.env npm run seed:local
```

(Requires full `npm ci` so that `tsx` is available. Run seed before `npm ci --omit=dev` if you deploy with production-only dependencies.)

Alternatively, set `SEED_ON_START=true` in `.env` and restart the app once so it seeds on startup (then set back to `false` or remove).

---

## 8. Firewall

- Open **80** and **443** (and optionally **22** for SSH) in the EC2 security group.
- The app binds to `127.0.0.1`, so it is not exposed directly; only Nginx needs to be reachable.

---

## 9. Quick checklist

| Step | Command / action |
|------|------------------|
| Build | `npm ci && npm run build` |
| Upload | rsync or git clone to `/var/www/airborne-fitness` |
| Env | Create `.env` with `NODE_ENV`, `PORT`, `MONGODB_URI` |
| Run | `pm2 start dist/index.cjs --name airborne-fitness --node-args="--env-file=.env"` |
| Nginx | Add server block, proxy to `http://127.0.0.1:5001` |
| Reload | `sudo nginx -t && sudo systemctl reload nginx` |

---

## 10. Updates

After pulling or uploading a new build:

```bash
cd /var/www/airborne-fitness
npm ci
npm run build
pm2 restart airborne-fitness
```

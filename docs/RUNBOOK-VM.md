# MA Finance Hub — VM Deployment Runbook

Target: Single AWS EC2 instance, domain maishq.com.
TLS: Cloudflare (proxy mode, orange cloud). VM only serves HTTP on port 80.
Reverse proxy: nginx (inside Docker).

---

## 1. Launch EC2 Instance

- **AMI**: Ubuntu 24.04 LTS (or Amazon Linux 2023)
- **Instance type**: t3.small minimum (2 vCPU, 2 GB RAM)
- **Storage**: 30 GB gp3 minimum
- **Key pair**: Your SSH key

### Security Group

| Direction | Port | Protocol | Source | Purpose |
|-----------|------|----------|--------|---------|
| Inbound | 22 | TCP | Your IP only | SSH |
| Inbound | 80 | TCP | Cloudflare IPs only* | HTTP from CF |
| Inbound | 443 | TCP | Cloudflare IPs only* | HTTPS from CF |
| Outbound | All | All | 0.0.0.0/0 | Internet access |

*Cloudflare IP ranges: https://www.cloudflare.com/ips/
For quick setup, you can allow 0.0.0.0/0 on 80/443 and restrict later.

## 2. Configure Cloudflare DNS

In Cloudflare dashboard for maishq.com:

```
Type   Name              Content           Proxy
A      maishq.com        <EC2-PUBLIC-IP>   Proxied (orange cloud)
A      www.maishq.com    <EC2-PUBLIC-IP>   Proxied (orange cloud)
```

### Cloudflare SSL/TLS Settings

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full (strict)** — wait, since we don't have a cert on the VM, use **Full** (not strict)
3. Actually: use **Flexible** if your VM only serves HTTP. This is the simplest option.
   - Cloudflare terminates HTTPS from user
   - Cloudflare connects to your VM via HTTP on port 80
   - No cert needed on VM

**Recommended: Flexible SSL**

4. Go to **SSL/TLS** → **Edge Certificates**
5. Enable **Always Use HTTPS** = ON
6. Enable **Automatic HTTPS Rewrites** = ON

### Cloudflare Page Rules (optional)

Redirect www to apex:
- URL: `www.maishq.com/*`
- Setting: Forwarding URL (301)
- Destination: `https://maishq.com/$1`

## 3. Install Docker on the VM

```bash
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

### Ubuntu 24.04
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable docker && sudo systemctl start docker
sudo usermod -aG docker $USER
exit
# SSH back in for group to take effect
```

### Amazon Linux 2023
```bash
sudo dnf install -y docker git
sudo systemctl enable docker && sudo systemctl start docker
sudo usermod -aG docker $USER
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
exit
```

## 4. Clone Repository

```bash
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>

git clone https://github.com/YOUR_USER/ma-finance-hub.git
cd ma-finance-hub
```

Or upload via rsync:
```bash
rsync -avz --exclude node_modules --exclude .next --exclude dist \
  . ubuntu@<EC2-PUBLIC-IP>:~/ma-finance-hub/
```

## 5. Generate Environment

```bash
cd ~/ma-finance-hub
node scripts/generate-vm-env.js
```

Creates `.env.vm` with random DB passwords, RSA keys, HMAC secrets.
No TLS config needed — Cloudflare handles it.

## 6. Deploy

```bash
chmod +x scripts/vm-*.sh
./scripts/vm-deploy.sh
```

This will:
1. Build all Docker images (backend, frontend, migrate)
2. Start postgres + redis
3. Run all 27 migrations
4. Start backend, frontend, nginx proxy
5. Create demo user (admin@demo.com / Demo1234!)

## 7. Validate Health

```bash
# From the VM (direct, no Cloudflare)
curl -s http://localhost/health
# {"status":"ok"}

curl -s http://localhost/ready
# {"status":"ok","db":"connected","timestamp":"...","redis":"connected"}
```

## 8. Validate via Cloudflare

From your local machine (after DNS propagates, usually 1-5 min with Cloudflare):

```bash
curl -s https://maishq.com/health
# {"status":"ok"}

curl -s https://maishq.com/api/v1/auth/context
# 401 (no token — correct)
```

## 9. Test Login

1. Open https://maishq.com
2. Login page: "MA Finance Hub / Powered by MAiSHQ"
3. Enter:
   - Email: `admin@demo.com`
   - Password: `Demo1234!`
   - Tenant ID: `1`
4. Dashboard loads with tenant info, tier PRO, stats

## 10. Test All Modules

- **Dashboard**: Tenant ID, tier (PRO), users, lock date, entitlements, quick stats
- **Charts**: View/create chart of accounts
- **Accounts**: View/create accounts
- **Journal**: Create entry → Post it → Verify "posted" status
- **Trial Balance**: View report
- **Posting Rules**: Create/view rules
- **Admin**: View users, set lock date
- **Plans**: View tier options

## 11. Test Specific Features

- **Lock Date**: Set lock date → Try journal entry before that date → Should fail
- **Journal Posting**: Create → Post → Verify status
- **Posting Rules**: Create rule → Verify in list

## 12. Daily Operations

```bash
./scripts/vm-status.sh              # Full status check
./scripts/vm-logs.sh                # All service logs
./scripts/vm-logs.sh backend 200    # Backend only, 200 lines
./scripts/vm-logs.sh proxy          # Nginx proxy logs
./scripts/vm-backup.sh              # Backup DB (auto-rotates, keeps 10)
./scripts/vm-update.sh              # Pull + rebuild + migrate + restart
./scripts/vm-stop.sh                # Stop (data preserved)
./scripts/vm-start.sh               # Start
./scripts/vm-restore.sh backups/ma_finance_hub_YYYYMMDD_HHMMSS.sql.gz
./scripts/vm-rollback.sh HEAD~1     # Rollback code (not DB)
./scripts/vm-migrate.sh status      # Check migration state
./scripts/vm-migrate.sh latest      # Run pending migrations
./scripts/vm-migrate.sh rollback    # Rollback last batch
```

## 13. Troubleshooting

### Can't reach maishq.com
- Check Cloudflare DNS has correct IP (A record, proxied)
- Check EC2 Security Group allows port 80 inbound
- On VM: `curl http://localhost/health` — if this works, it's a DNS/CF issue

### 502 Bad Gateway from Cloudflare
- Backend still starting: wait 15s, retry
- Check: `docker compose -f docker-compose.vm.yml --env-file .env.vm ps`
- Check: `./scripts/vm-logs.sh backend`

### Backend won't start
- JWT key format: ensure `\n` literals in .env.vm are correct
- Check migration: `./scripts/vm-migrate.sh status`
- Check logs: `./scripts/vm-logs.sh backend`

### Database connection issues
- Check: `./scripts/vm-logs.sh postgres`
- Passwords generated together, should be consistent

### Mixed content warnings
- Cloudflare SSL/TLS → Enable "Always Use HTTPS"
- Enable "Automatic HTTPS Rewrites"

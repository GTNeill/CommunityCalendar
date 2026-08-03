# Deploying to Railway

## First-time setup

### 1. Push to GitHub
```bash
git init          # if not already a repo
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Create Railway project
1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Deploy from GitHub repo** → select your repo
3. Railway auto-detects the config from `railway.toml` + `nixpacks.toml`

### 3. Add a Volume (for category persistence)
1. In your Railway project, click **+ Add** → **Volume**
2. Set **Mount Path** to `/data`
3. Go to your service **Variables** and add:
   ```
   DATA_DIR=/data
   ```
4. Redeploy — categories saved in the admin panel will now survive deploys

The volume holds everything the admin panel writes:

| Path | Contents |
|---|---|
| `$DATA_DIR/categories.json` | Categories, colors, keywords, icons |
| `$DATA_DIR/site-settings.json` | Site title, calendar feeds, display options |
| `$DATA_DIR/icons/` | Uploaded category icon images (PNG, auto-created on first upload) |
| `$DATA_DIR/auth.db` | Admin login sessions (SQLite, auto-created when `DATABASE_URL` is unset) |
| `$DATA_DIR/.auth-secret` | Session signing secret (auto-generated when `BETTER_AUTH_SECRET` is unset) |

### 4. Set your domain
1. In the service settings → **Networking** → **Generate Domain**
2. Or add a custom domain (e.g. `calendar.40thward.org`) and point your DNS CNAME there

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Railway sets this automatically |
| `DATA_DIR` | **Yes** | Path to the Railway volume mount (e.g. `/data`) |
| `WEBSITE_URL` | **Yes, for admin login** | Public origin of the deploy, e.g. `https://calendar.40thward.org`. Used to build the Google OAuth redirect URI — it must exactly match an Authorized redirect URI in the Google Cloud console (`$WEBSITE_URL/api/auth/callback/google`) |
| `GOOGLE_CLIENT_ID` | **Yes, for admin login** | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | **Yes, for admin login** | Google OAuth client secret |
| `BETTER_AUTH_SECRET` | No | Session signing secret. If unset, a random one is generated once and persisted to `$DATA_DIR/.auth-secret` |
| `DATABASE_URL` | No | Only for an external Turso/libSQL database. **Leave it unset on Railway** — the app then uses `$DATA_DIR/auth.db` and creates the auth tables itself. Setting it to an empty string crashes the container at boot |
| `DATABASE_AUTH_TOKEN` | No | Auth token, only when `DATABASE_URL` points at a remote Turso database |

> **Note:** the public calendar (categories, event feeds, embedding) needs nothing but `DATA_DIR`.
> The Google variables are only required for the `/admincat` admin panel login.

---

## Redeploying after changes

Just push to GitHub — Railway auto-deploys on every push to `main`.

```bash
git add .
git commit -m "your changes"
git push
```

Category data on the volume is **never touched by redeploys** — only the app code updates.

---

## Local dev (unchanged)

```bash
bun run dev        # Vite dev server on :4200 with HMR
```

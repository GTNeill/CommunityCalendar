import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db } from "./database";

export const ADMIN_EMAIL_ALLOWLIST = ["george@gneill.net", "santos@40thward.org"];

// ── Auth secret ───────────────────────────────────────────────────────────────
// Better Auth throws on boot in production when BETTER_AUTH_SECRET is missing.
// If it isn't set, generate one once and persist it next to the other data on
// the volume so sessions survive restarts and redeploys.
const _authDir: string = (typeof (import.meta as any).dir === "string")
  ? (import.meta as any).dir
  : path.dirname(new URL(import.meta.url).pathname);

function resolveAuthSecret(): string {
  const configured = process.env.BETTER_AUTH_SECRET?.trim();
  if (configured) return configured;

  const dataDir = process.env.DATA_DIR ?? path.resolve(_authDir, "../../data");
  const secretFile = path.join(dataDir, ".auth-secret");
  try {
    const existing = fs.readFileSync(secretFile, "utf-8").trim();
    if (existing) return existing;
  } catch { /* not created yet */ }

  const generated = crypto.randomBytes(32).toString("base64");
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(secretFile, generated, { mode: 0o600 });
    console.warn(`[auth] BETTER_AUTH_SECRET not set — generated one and stored it at ${secretFile}`);
  } catch (e) {
    console.error("[auth] BETTER_AUTH_SECRET not set and the generated secret could not be persisted; sessions will not survive a restart:", e);
  }
  return generated;
}

// ── Base URL ──────────────────────────────────────────────────────────────────
// Better Auth requires an absolute URL and throws on boot otherwise. Railway's
// RAILWAY_PUBLIC_DOMAIN (and hand-typed WEBSITE_URL values) are bare hostnames
// like "example.up.railway.app", so normalise to an absolute origin: add the
// scheme when missing and strip any path/trailing slash.
function resolveBaseURL(): string | undefined {
  const raw = (process.env.WEBSITE_URL ?? process.env.RAILWAY_PUBLIC_DOMAIN ?? "").trim();
  if (!raw) {
    console.warn("[auth] Neither WEBSITE_URL nor RAILWAY_PUBLIC_DOMAIN is set — social login will not work until one is.");
    return undefined;
  }

  const withScheme = /^https?:\/\//i.test(raw)
    ? raw
    : `${raw.startsWith("localhost") || raw.startsWith("127.0.0.1") ? "http" : "https"}://${raw}`;

  try {
    const url = new URL(withScheme);
    const normalised = url.origin;
    if (normalised !== raw) console.log(`[auth] baseURL normalised: "${raw}" → "${normalised}"`);
    return normalised;
  } catch {
    console.error(`[auth] WEBSITE_URL "${raw}" could not be parsed as a URL — ignoring it. Set it to a full origin, e.g. https://calendar.40thward.org`);
    return undefined;
  }
}

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: resolveBaseURL(),
  database: drizzleAdapter(db, { provider: "sqlite" }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  secret: resolveAuthSecret(),
  trustedOrigins: (request) => {
    const origin = request?.headers.get("origin");
    return origin ? [origin] : ["*"];
  },
  plugins: [bearer()],
});

import app from "./api";
import fs from "node:fs";
import path from "node:path";

const port = Number(process.env.PORT ?? 3000);
const distDir = `${import.meta.dir}/../dist`;
const indexPath = `${distDir}/index.html`;

// ── Volume seed ───────────────────────────────────────────────────────────────
// If DATA_DIR is a Railway volume mount and categories.json doesn't exist yet,
// copy the bundled seed file from the repo so the first deploy isn't empty.
const dataDir  = process.env.DATA_DIR ?? path.resolve(import.meta.dir, "../data");
const dataFile = path.join(dataDir, "categories.json");
const seedFile = path.resolve(import.meta.dir, "../data/categories.json");

if (!fs.existsSync(dataFile) && fs.existsSync(seedFile)) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.copyFileSync(seedFile, dataFile);
  console.log(`[seed] Copied categories.json → ${dataFile}`);
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api")) {
      return app.fetch(request);
    }

    const filePath = getStaticFilePath(url.pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    const index = Bun.file(indexPath);
    if (await index.exists()) {
      return new Response(index, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Build output not found. Run `bun run build` first.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
});

console.log(`Web server listening on http://localhost:${server.port}`);

function getStaticFilePath(pathname: string) {
  const cleanPath = decodeURIComponent(pathname)
    .replace(/^\/+/, "")
    .replaceAll("..", "");

  return cleanPath ? `${distDir}/${cleanPath}` : indexPath;
}

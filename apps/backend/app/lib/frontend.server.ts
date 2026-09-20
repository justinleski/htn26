import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
export async function frontendResponse(request: Request) {
  const pathname = new URL(request.url).pathname;
  const asset = /^\/assets\/([a-zA-Z0-9_.-]+\.(js|css|svg|png|woff2))$/.exec(pathname);
  const page = ["/", "/dashboard", "/insights", "/campaign", "/creative-testing"].includes(pathname);
  if (!asset && !page) return new Response("Not found", { status: 404 });
  const root = resolve(process.cwd(), "../frontend/dist");
  try {
    const content = await readFile(resolve(root, asset ? `assets/${asset[1]}` : "index.html"));
    const types: Record<string, string> = { js: "text/javascript", css: "text/css", svg: "image/svg+xml", png: "image/png", woff2: "font/woff2" };
    return new Response(content, { headers: {
      "Content-Type": asset ? types[asset[2]!]! : "text/html; charset=utf-8",
      "Cache-Control": asset ? "public, max-age=31536000, immutable" : "no-cache",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch { return new Response("Frontend build missing. Run npm run build from the repository root.", { status: 503 }); }
}

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { resolve } from "node:path";
// Reuse Next's prerendered root and its exact client chunks. Do not copy
// .next/server, source files, local env files, or server build caches to assets.
const html = await readFile(".next/server/app/index.html", "utf8");
if (!html.includes("What shall we talk about?"))
  throw new Error("Expected the built Little Talk root page.");
await rm("dist", { recursive: true, force: true });
await mkdir("dist/client/_next", { recursive: true });
await cp(".next/static", "dist/client/_next/static", { recursive: true });
await cp("public", "dist/client", { recursive: true });
await writeFile("dist/client/index.html", html);
await cp(".next/server/app/_not-found.html", "dist/client/404.html");
await mkdir("dist/server", { recursive: true });
await build({
  entryPoints: ["hosting/worker.ts"],
  outfile: "dist/server/index.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  define: { "process.env": "{}" },
  plugins: [
    {
      name: "server-only-marker",
      setup(b) {
        b.onResolve({ filter: /^server-only$/ }, () => ({
          path: "server-only",
          namespace: "empty",
        }));
        b.onLoad({ filter: /.*/, namespace: "empty" }, () => ({
          contents: "",
          loader: "js",
        }));
      },
    },
  ],
});
// Keep it importable by Node for contract tests without changing the root package.
await writeFile("dist/server/package.json", '{"type":"module"}\n');
await mkdir("dist/.openai", { recursive: true });
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
console.log(`Sites Worker and public assets ready at ${resolve("dist")}`);

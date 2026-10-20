import { execFileSync } from "node:child_process";

const siteUrl = process.argv[2];
if (!siteUrl) throw new Error("Provide the deployed site URL");
const expected = (
  process.env.GITHUB_SHA ??
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" })
).trim();
let lastError;
for (let attempt = 0; attempt < 18; attempt++) {
  try {
    const url = new URL(siteUrl);
    url.searchParams.set("build", expected);
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTML: HTTP ${response.status}`);
    const html = await response.text();
    if (!html.includes("מבחן המשיכה")) throw new Error("Missing product title");
    const sha = html.match(/name="build-commit" content="([a-f0-9]{40})"/)?.[1];
    if (sha !== expected) throw new Error(`Wrong deployed commit: ${sha}`);
    const assets = [
      ...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),
    ].map((m) => m[1]);
    if (
      !assets.some((a) => a.endsWith(".js")) ||
      !assets.some((a) => a.endsWith(".css"))
    )
      throw new Error("Missing JS/CSS assets");
    for (const asset of assets) {
      const r = await fetch(new URL(asset, siteUrl), {
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok || (await r.arrayBuffer()).byteLength === 0)
        throw new Error(`Invalid asset: ${asset}`);
    }
    console.log(
      `Verified ${siteUrl}: HTTP 200, title, JS/CSS assets, commit ${expected}`,
    );
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (attempt < 17) await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
throw lastError;

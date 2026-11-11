// Cloudflare Worker that runs in front of `/tiles/*` only (`run_worker_first` in
// `apps/web/wrangler.jsonc`); every other path is served as a static asset without invoking it.
//
// Workers static assets answer a `Range` request with `200` and the whole file
// (developers.cloudflare.com/workers/static-assets/billing-and-limitations/, § Range requests),
// and pmtiles throws on exactly that ("Check that your storage backend supports HTTP Byte
// Serving", `pmtiles/src/index.ts`). Until the service worker controls the page, the map reads
// its tileset from the network by ranges, so this slices the asset into a `206`.

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const asset = await env.ASSETS.fetch(request);
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("Range") ?? "");
    if (!range || request.method !== "GET" || asset.status !== 200) return asset;

    const body = await asset.arrayBuffer();
    const size = body.byteLength;
    const [, first, last] = range;
    // `bytes=-N` is the last N bytes; `bytes=N-` runs to the end.
    const start = first === "" ? size - Number(last) : Number(first);
    const end = first === "" || last === "" ? size - 1 : Math.min(Number(last), size - 1);

    const headers = new Headers(asset.headers);
    // The body is re-sent decoded and shorter: the asset's length and encoding no longer apply.
    headers.delete("Content-Length");
    headers.delete("Content-Encoding");
    if (start < 0 || start > end) {
      headers.set("Content-Range", `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    return new Response(body.slice(start, end + 1), { status: 206, headers });
  },
};

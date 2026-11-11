import { describe, expect, test } from "vite-plus/test";
import rangeWorker from "../rangeWorker";

// A 10-byte asset, served the way Workers static assets serve one: 200 and the whole file.
const env = {
  ASSETS: {
    fetch: async () =>
      new Response(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), {
        headers: { ETag: '"t1"', "Content-Length": "10" },
      }),
  },
};

function get(range?: string) {
  const headers = range ? { Range: range } : undefined;
  return rangeWorker.fetch(new Request("https://x.test/tiles/a.pmtiles", { headers }), env);
}

async function bytes(response: Response) {
  return [...new Uint8Array(await response.arrayBuffer())];
}

describe("rangeWorker", () => {
  test("slices a bounded range into a 206 with its Content-Range", async () => {
    const response = await get("bytes=2-4");
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 2-4/10");
    expect(response.headers.get("ETag")).toBe('"t1"');
    expect(await bytes(response)).toEqual([2, 3, 4]);
  });

  test("clamps an end past the file and serves open and suffix ranges", async () => {
    expect(await bytes(await get("bytes=8-99"))).toEqual([8, 9]);
    expect(await bytes(await get("bytes=7-"))).toEqual([7, 8, 9]);
    expect(await bytes(await get("bytes=-2"))).toEqual([8, 9]);
  });

  test("answers 416 with the size when the range starts past the file", async () => {
    const response = await get("bytes=10-12");
    expect(response.status).toBe(416);
    expect(response.headers.get("Content-Range")).toBe("bytes */10");
  });

  test("passes a request without a range through untouched", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect(await bytes(response)).toHaveLength(10);
  });
});

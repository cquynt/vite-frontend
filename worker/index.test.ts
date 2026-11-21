import { describe, expect, it, vi } from "vitest";
import worker from "./index.js";

type R2Like = {
  httpEtag: string;
  size: number;
  body?: ReadableStream | string;
  range?: { offset?: number; length?: number };
  writeHttpMetadata: (h: Headers) => void;
};

function makeEnv(object: R2Like | null) {
  const assets = vi.fn(async () => new Response("asset", { status: 200 }));
  const get = vi.fn(async () => object);
  return { env: { ASSETS: { fetch: assets }, BUSYTEX: { get } }, assets, get };
}

const WASM = "https://x.test/core/busytex/busytex.wasm";

describe("worker", () => {
  it("chuyển đường dẫn thường cho ASSETS", async () => {
    const { env, assets, get } = makeEnv(null);
    const res = await worker.fetch(new Request("https://x.test/index.html"), env);
    expect(await res.text()).toBe("asset");
    expect(assets).toHaveBeenCalledTimes(1);
    expect(get).not.toHaveBeenCalled();
  });

  it("chuyển file lớn dùng method không phải GET/HEAD cho ASSETS", async () => {
    const { env, assets, get } = makeEnv(null);
    await worker.fetch(new Request(WASM, { method: "POST", body: "x" }), env);
    expect(assets).toHaveBeenCalledTimes(1);
    expect(get).not.toHaveBeenCalled();
  });

  it("trả 404 khi R2 không có object", async () => {
    const { env, get } = makeEnv(null);
    const res = await worker.fetch(new Request(WASM), env);
    expect(res.status).toBe(404);
    expect(get).toHaveBeenCalledWith("core/busytex/busytex.wasm", expect.anything());
  });

  it("trả 200 kèm header cache cho GET", async () => {
    const { env } = makeEnv({
      httpEtag: '"abc"',
      size: 5,
      body: "hello",
      writeHttpMetadata: (h) => h.set("last-modified", "x"),
    });
    const res = await worker.fetch(new Request(WASM), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/wasm");
    expect(res.headers.get("etag")).toBe('"abc"');
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(res.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(res.headers.get("last-modified")).toBe("x");
    expect(await res.text()).toBe("hello");
  });

  it("dùng octet-stream cho file .data", async () => {
    const { env } = makeEnv({ httpEtag: "e", size: 1, body: "d", writeHttpMetadata: () => {} });
    const res = await worker.fetch(
      new Request("https://x.test/core/busytex/texlive-basic.data"),
      env,
    );
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
  });

  it("HEAD không có body", async () => {
    const { env } = makeEnv({ httpEtag: "e", size: 3, body: "abc", writeHttpMetadata: () => {} });
    const res = await worker.fetch(new Request(WASM, { method: "HEAD" }), env);
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("trả 304 khi object không có body", async () => {
    const { env } = makeEnv({ httpEtag: "e", size: 3, writeHttpMetadata: () => {} });
    const res = await worker.fetch(new Request(WASM), env);
    expect(res.status).toBe(304);
    expect(res.body).toBeNull();
  });

  it("trả 206 kèm content-range khi có Range", async () => {
    const { env } = makeEnv({
      httpEtag: "e",
      size: 100,
      body: "xyz",
      range: { offset: 10, length: 3 },
      writeHttpMetadata: () => {},
    });
    const res = await worker.fetch(new Request(WASM, { headers: { range: "bytes=10-12" } }), env);
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 10-12/100");
  });

  it("Range thiếu offset/length lấy mặc định tới hết file", async () => {
    const { env } = makeEnv({
      httpEtag: "e",
      size: 50,
      body: "x",
      range: { offset: 40 },
      writeHttpMetadata: () => {},
    });
    const res = await worker.fetch(new Request(WASM, { headers: { range: "bytes=40-" } }), env);
    expect(res.headers.get("content-range")).toBe("bytes 40-49/50");
  });

  it("bỏ qua range của object khi request không có header Range", async () => {
    const { env } = makeEnv({
      httpEtag: "e",
      size: 50,
      body: "x",
      range: { offset: 0, length: 50 },
      writeHttpMetadata: () => {},
    });
    const res = await worker.fetch(new Request(WASM), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-range")).toBeNull();
  });
});

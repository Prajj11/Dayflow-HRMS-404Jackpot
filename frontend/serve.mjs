import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import handler from "./dist/server/server.js";

const port = process.env.PORT || 3000;
const clientDir = "./dist/client";

const mimeTypes = {
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  const filePath = join(clientDir, url.pathname);
  if (url.pathname !== "/" && existsSync(filePath) && statSync(filePath).isFile()) {
    res.setHeader("Content-Type", mimeTypes[extname(filePath)] || "application/octet-stream");
    createReadStream(filePath).pipe(res);
    return;
  }

  const fetchReq = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req,
    duplex: "half",
  });

  const fetchRes = await handler.fetch(fetchReq);

  res.statusCode = fetchRes.status;
  fetchRes.headers.forEach((value, key) => res.setHeader(key, value));
  const body = fetchRes.body ? Buffer.from(await fetchRes.arrayBuffer()) : null;
  res.end(body);
}).listen(port, () => {
  console.log(`listening on ${port}`);
});

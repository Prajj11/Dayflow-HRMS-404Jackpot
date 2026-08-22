import { createServer } from "node:http";
import handler from "./dist/server/server.js";

const port = process.env.PORT || 3000;

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
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

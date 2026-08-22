import handler from "../dist/server/server.js";

export default async function (req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const fetchReq = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req,
    duplex: "half",
  });

  const fetchRes = await handler.fetch(fetchReq);

  res.statusCode = fetchRes.status;
  fetchRes.headers.forEach((value, key) => res.setHeader(key, value));
  const body = await fetchRes.arrayBuffer();
  res.end(Buffer.from(body));
}

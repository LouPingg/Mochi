import express from "express";

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0"; // ← important sur Render

const app = express();

// Signatures visibles pour vérifier qu'on est bien sur la bonne version
app.get("/", (_req, res) => res.type("text/plain").send("HELLO-MOCHI vA"));
app.get("/ping", (_req, res) => res.type("text/plain").send("ok-mini"));
app.get("/__debug", (_req, res) => {
  res.json({
    cwd: process.cwd(),
    node: process.version,
    env: { NODE_ENV: process.env.NODE_ENV, PORT: process.env.PORT },
  });
});

// 404 signé
app.use((_req, res) => res.status(404).type("text/plain").send("404-mini"));

app.listen(PORT, HOST, () => {
  console.log(`MINI server listening on http://${HOST}:${PORT}`);
});

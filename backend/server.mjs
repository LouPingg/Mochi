import express from "express";

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

const app = express();

// Logger requêtes + statut de réponse
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store"); // évite un 404 mis en cache
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(
      `[RES] ${req.method} ${req.url} -> ${res.statusCode} (${ms}ms)`
    );
  });
  console.log(
    `[REQ] ${req.method} ${req.url} from ${
      req.headers["x-forwarded-for"] || req.ip
    }`
  );
  next();
});

// Routes de test signées
app.get("/", (_req, res) => res.type("text/plain").send("HELLO-MOCHI vB"));
app.get("/ping", (_req, res) => res.type("text/plain").send("ok-mini-v2"));
app.get("/__debug", (_req, res) => {
  res.json({
    cwd: process.cwd(),
    node: process.version,
    env: { NODE_ENV: process.env.NODE_ENV, PORT: process.env.PORT },
  });
});

// Catch-all signé (DOIT rester APRÈS les routes ci-dessus)
app.use((_req, res) => res.status(404).type("text/plain").send("404-mini-v2"));

app.listen(PORT, HOST, () => {
  console.log(`MINI server listening on http://${HOST}:${PORT}`);
});

import express from "express";

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

const app = express();

// Log TOUTES les requêtes pour vérifier qu'elles atteignent l'app
app.use((req, _res, next) => {
  console.log(
    `[REQ] ${req.method} ${req.url} from ${
      req.headers["x-forwarded-for"] || req.ip
    }`
  );
  next();
});

// Routes de test signées
app.get("/", (_req, res) => res.type("text/plain").send("HELLO-MOCHI vA"));
app.get("/ping", (_req, res) => res.type("text/plain").send("ok-mini"));
app.get("/__debug", (_req, res) => {
  res.json({
    cwd: process.cwd(),
    node: process.version,
    env: { NODE_ENV: process.env.NODE_ENV, PORT: process.env.PORT },
  });
});

// Catch-all signé (si Express reçoit la requête, tu verras CE texte)
app.use((_req, res) => res.status(404).type("text/plain").send("404-mini"));

app.listen(PORT, HOST, () => {
  console.log(`MINI server listening on http://${HOST}:${PORT}`);
});

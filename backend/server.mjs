import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

/* =========================
   Variables d'environnement
========================= */
const {
  PORT = 5000,
  CORS_ORIGINS,
  CORS_ORIGIN,
  JWT_SECRET = "change_me_secret",
  ADMIN_USERNAME = "admin",
  ADMIN_PASSWORD_HASH = "",
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  NODE_ENV = "development",
} = process.env;

/* =========================
   App & Health Check
========================= */
const app = express();

// ✅ Routes de test & debug (signées pour Render)
app.get("/ping", (_req, res) =>
  res.status(200).type("text/plain").send("ok-mochi-v1")
);
app.head("/ping", (_req, res) => res.sendStatus(200));

/* =========================
   CORS HARDENED PATCH (fix GitHub Pages)
========================= */
const RAW_ORIGINS =
  CORS_ORIGINS ||
  CORS_ORIGIN ||
  "https://loupingg.github.io,http://127.0.0.1:5500,http://localhost:5500";

const ALLOWED_ORIGINS = RAW_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* =========================
   Middleware standard
========================= */
app.use(cors({ credentials: true, origin: ALLOWED_ORIGINS }));
app.use(express.json());
app.use(cookieParser());

/* =========================
   Cloudinary & Multer
========================= */
const CLOUD_OK = !!(
  CLOUDINARY_CLOUD_NAME &&
  CLOUDINARY_API_KEY &&
  CLOUDINARY_API_SECRET
);

if (CLOUD_OK) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
}

const upload = multer({ storage: multer.memoryStorage() });

async function cloudUploadFromBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (err, result) => {
        if (err || !result)
          return reject(err || new Error("Cloudinary upload failed"));
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

/* =========================
   Base de données en mémoire
========================= */
const db = {
  albums: [
    {
      id: "a1",
      title: "Soirée de samedi",
      photos: [
        {
          id: "p1",
          url: "https://picsum.photos/id/1011/1200/800",
          orientation: "landscape",
        },
        {
          id: "p2",
          url: "https://picsum.photos/id/1027/800/1200",
          orientation: "portrait",
        },
      ],
    },
  ],
};

/* =========================
   Auth helpers
========================= */
function requireAdmin(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "unauthorized" });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "invalid token" });
  }
}

/* =========================
   Routes Auth
========================= */
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USERNAME)
    return res.status(401).json({ error: "bad credentials" });
  if (!ADMIN_PASSWORD_HASH)
    return res.status(500).json({ error: "ADMIN_PASSWORD_HASH missing" });

  const ok = await bcrypt.compare(password || "", ADMIN_PASSWORD_HASH);
  if (!ok) return res.status(401).json({ error: "bad credentials" });

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "2h" });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: NODE_ENV === "production" ? "None" : "lax",
    secure: NODE_ENV === "production",
    maxAge: 2 * 60 * 60 * 1000,
  });
  res.json({ ok: true, token });
});

app.post("/auth/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

app.get("/auth/me", (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.json({ authenticated: false });
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ authenticated: true });
  } catch {
    res.json({ authenticated: false });
  }
});

/* =========================
   Albums & Photos
========================= */
app.get("/albums", (_req, res) => res.json(db.albums));

app.post("/albums", requireAdmin, (req, res) => {
  const { title } = req.body || {};
  if (!title) return res.status(400).json({ error: "title required" });
  const album = { id: nanoid(8), title, photos: [] };
  db.albums.push(album);
  res.status(201).json(album);
});

app.delete("/albums/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  const idx = db.albums.findIndex((a) => a.id === id);
  if (idx === -1) return res.status(404).json({ error: "album not found" });
  db.albums.splice(idx, 1);
  res.json({ ok: true });
});

app.post("/photos", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    const { albumId, url, orientation } = req.body || {};
    const album = db.albums.find((a) => a.id === albumId);
    if (!album) return res.status(404).json({ error: "album not found" });

    let fileUrl = url;
    let orient = orientation;

    if (req.file) {
      if (!CLOUD_OK)
        return res.status(400).json({ error: "Cloudinary not configured" });
      const up = await cloudUploadFromBuffer(
        req.file.buffer,
        `mochi/${albumId}`
      );
      fileUrl = up.secure_url;
      orient = up.width >= up.height ? "landscape" : "portrait";
    }

    if (!fileUrl)
      return res.status(400).json({ error: "file or url required" });
    if (!orient) return res.status(400).json({ error: "orientation required" });

    const photo = {
      id: nanoid(10),
      albumId,
      url: fileUrl,
      orientation: orient,
    };
    album.photos.push(photo);
    res.status(201).json(photo);
  } catch (e) {
    res.status(500).json({ error: e.message || "photo create failed" });
  }
});

app.delete("/photos/:id", requireAdmin, (req, res) => {
  const pid = req.params.id;
  for (const album of db.albums) {
    const idx = album.photos.findIndex((p) => p.id === pid);
    if (idx !== -1) {
      album.photos.splice(idx, 1);
      return res.json({ ok: true });
    }
  }
  res.status(404).json({ error: "photo not found" });
});

/* =========================
   Divers + Debug
========================= */
app.get("/", (_req, res) =>
  res.type("text/plain").send("✅ Mochi backend en ligne v4")
);

app.get("/version", (_req, res) =>
  res.json({ node: process.version, env: NODE_ENV, origins: ALLOWED_ORIGINS })
);

// 🔍 Route debug pour Render
app.get("/__debug", (_req, res) => {
  res.json({
    cwd: process.cwd(),
    node: process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
    },
  });
});

// 404 signé pour vérifier qu'on est bien sur ton serveur
app.use((req, res) => {
  res.status(404).type("text/plain").send("404 – mochi backend (express)");
});

/* =========================
   Start
========================= */
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log("CORS allowed :", ALLOWED_ORIGINS);
  console.log(`Cloudinary configured : ${CLOUD_OK ? "yes" : "no"}`);
  console.log(`NODE_ENV : ${NODE_ENV}`);
});

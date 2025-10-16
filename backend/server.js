import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

const {
  PORT = 5000,
  CORS_ORIGIN = "http://127.0.0.1:5500",
  JWT_SECRET = "change_me",
  ADMIN_USERNAME = "admin",
  ADMIN_PASSWORD_HASH = "",
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  NODE_ENV = "development",
} = process.env;

/* =========================
   App + Middlewares
========================= */
const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

/* =========================
   Cloudinary + Multer
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

function cloudUploadFromBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (err, result) => {
        if (err || !result)
          return reject(err || new Error("cloudinary upload_stream error"));
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

/* =========================
   DB en mémoire (demo)
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
   Routes: Auth
========================= */
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USERNAME)
    return res.status(401).json({ error: "bad credentials" });
  if (!ADMIN_PASSWORD_HASH)
    return res
      .status(500)
      .json({ error: "ADMIN_PASSWORD_HASH manquant dans .env" });

  const ok = await bcrypt.compare(password || "", ADMIN_PASSWORD_HASH);
  if (!ok) return res.status(401).json({ error: "bad credentials" });

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "2h" });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: NODE_ENV === "production" ? "None" : "lax",
    secure: NODE_ENV === "production",
    maxAge: 2 * 60 * 60 * 1000,
  });
  res.json({ ok: true });
});

app.post("/auth/logout", (req, res) => {
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
   Routes: Albums
========================= */
app.get("/albums", (_req, res) => res.json(db.albums));

/* POST /albums simplifié : uniquement title */
app.post("/albums", requireAdmin, async (req, res) => {
  try {
    const { title } = req.body || {};
    if (!title) return res.status(400).json({ error: "title required" });

    const album = { id: nanoid(8), title, photos: [] };
    db.albums.push(album);
    res.status(201).json(album);
  } catch (e) {
    console.error("POST /albums error:", e);
    res.status(500).json({ error: e.message || "album create failed" });
  }
});

app.delete("/albums/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  const idx = db.albums.findIndex((a) => a.id === id);
  if (idx === -1) return res.status(404).json({ error: "album not found" });
  db.albums.splice(idx, 1);
  res.json({ ok: true });
});

/* =========================
   Routes: Photos
========================= */
app.post("/photos", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    const { albumId, url, orientation } = req.body || {};
    const album = db.albums.find((a) => a.id === albumId);
    if (!album) return res.status(404).json({ error: "album not found" });

    let fileUrl = url;
    let orient = orientation;

    if (req.file) {
      if (!CLOUD_OK) {
        return res.status(400).json({
          error:
            "Cloudinary non configuré : envoyez une URL (champ url) ou configurez CLOUDINARY_* dans .env",
        });
      }
      const up = await cloudUploadFromBuffer(
        req.file.buffer,
        `mochi/${albumId}`
      );
      fileUrl = up.secure_url;
      orient = up.width >= up.height ? "landscape" : "portrait";
    }

    if (!fileUrl)
      return res.status(400).json({ error: "file or url required" });
    if (!orient)
      return res
        .status(400)
        .json({ error: "orientation required (ou fichier pour auto)" });

    const photo = {
      id: nanoid(10),
      albumId,
      url: fileUrl,
      orientation: orient,
    };
    album.photos.push(photo);
    res.status(201).json(photo);
  } catch (e) {
    console.error("POST /photos error:", e);
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
   Ping
========================= */
app.get("/", (_req, res) => res.send("✅ Mochi backend en ligne"));

/* =========================
   Start
========================= */
app.listen(PORT, () => {
  console.log(`✅ Backend en ligne sur http://127.0.0.1:${PORT}`);
  console.log(`CORS_ORIGIN autorisé : ${CORS_ORIGIN}`);
  console.log(`Cloudinary configuré : ${CLOUD_OK ? "oui" : "non"}`);
  console.log(`NODE_ENV : ${NODE_ENV}`);
});

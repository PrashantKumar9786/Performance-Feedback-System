require("dotenv").config();
const express = require("express");
const cors = require("cors");
const prisma = require("./prisma");

const authRoutes = require("./routes/auth");
const feedbackRoutes = require("./routes/feedback");
const hrRoutes = require("./routes/hr");

const app = express();
const PORT = process.env.PORT || 4000;

function requireEnv(name) {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    return false;
  }
  return true;
}

const envOk = requireEnv("DATABASE_URL") && requireEnv("JWT_SECRET");

if (!envOk) {
  console.error(
    "Server starting without required env vars — API routes that need the database will fail.",
  );
}

function parseAllowedOrigins() {
  const fromEnv = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  return [...fromEnv, "http://localhost:5173", "http://localhost:5174"];
}

function isOriginAllowed(origin) {
  if (!origin) return true;

  const allowedOrigins = parseAllowedOrigins();
  if (allowedOrigins.includes(origin)) return true;

  // Allow any Vercel deployment URL (preview + production).
  if (/^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) return true;

  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        console.warn("Blocked CORS origin:", origin);
        callback(null, false);
      }
    },
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "feedback-emp-api" });
});

app.get("/api/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();
    res.json({ ok: true, db: "connected", users: userCount });
  } catch (err) {
    console.error("DB health check failed:", err.message);
    res.status(500).json({
      ok: false,
      db: "error",
      message: err.message,
      hint: "Run `npx prisma db push` and `node prisma/seed.js` on Render, and verify DATABASE_URL uses SSL (?sslmode=require).",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/hr", hrRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Feedback API listening on http://localhost:${PORT}`);
});

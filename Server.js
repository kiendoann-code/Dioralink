const express = require("express");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || "development";
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in .env");
}

app.set("trust proxy", 1);

app.use(express.json({ limit: "6mb" }));
app.use(cookieParser());

const pool = new Pool({
  host: String(process.env.PGHOST || "localhost"),
  port: Number(process.env.PGPORT || 5432),
  database: String(process.env.PGDATABASE || "dioralink"),
  user: String(process.env.PGUSER || "postgres"),
  password: String(process.env.PGPASSWORD || ""),
});

const PUBLIC_DIR = path.join(__dirname, "Public");
const INDEX_FILE = path.join(PUBLIC_DIR, "index.html");

const COOKIE_NAME = "dioralink_session";

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function setSessionCookie(res, user) {
  const token = createToken(user);

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  return token;
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    city: row.city || "",
    role: row.role,
    avatar: row.avatar || "",
    bio: row.bio || "",
    joined: row.joined || String(new Date().getFullYear()),
    provider: row.provider || "email",
    authenticated: true,
  };
}

async function getUserFromRequest(req) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        phone,
        city,
        role,
        avatar,
        bio,
        joined,
        provider
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [payload.sub]
    );

    if (!result.rows[0]) {
      return null;
    }

    return result.rows[0];
  } catch {
    return null;
  }
}

async function requireAuth(req, res, next) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    return res.status(500).json({
      message: "Authentication check failed.",
    });
  }
}

/* =========================
   HEALTH
========================= */

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS now");

    res.json({
      status: "ok",
      database: "connected",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database health error:", error.message);

    res.status(500).json({
      status: "error",
      database: "connection failed",
      message: error.message,
    });
  }
});

/* =========================
   AUTH REGISTER
========================= */

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const role = String(req.body?.role || "").trim().toLowerCase();

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Name, email, password and role are required.",
      });
    }

    if (!["customer", "artisan"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters.",
      });
    }

    const existing = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    if (existing.rows.length) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();
    const joined = String(new Date().getFullYear());

    const insert = await pool.query(
      `
      INSERT INTO users (
        id,
        name,
        email,
        password_hash,
        role,
        provider,
        joined
      )
      VALUES ($1, $2, $3, $4, $5, 'email', $6)
      RETURNING
        id,
        name,
        email,
        phone,
        city,
        role,
        avatar,
        bio,
        joined,
        provider
      `,
      [id, name, email, passwordHash, role, joined]
    );

    const user = insert.rows[0];

    setSessionCookie(res, user);

    res.status(201).json({
      user: publicUser(user),
      session: {
        authenticated: true,
        userId: user.id,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      message: "Unable to create account.",
    });
  }
});

/* =========================
   AUTH LOGIN
========================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const role = String(req.body?.role || "").trim().toLowerCase();

    if (!email || !password || !role) {
      return res.status(400).json({
        message: "Email, password and role are required.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        password_hash,
        phone,
        city,
        role,
        avatar,
        bio,
        joined,
        provider
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    const user = result.rows[0];

    if (!user || !user.password_hash) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordOK = await bcrypt.compare(password, user.password_hash);

    if (!passwordOK) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (user.role !== role) {
      return res.status(403).json({
        message: `This account is registered as ${user.role}.`,
      });
    }

    setSessionCookie(res, user);

    res.json({
      user: publicUser(user),
      session: {
        authenticated: true,
        userId: user.id,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Unable to sign in.",
    });
  }
});

/* =========================
   AUTH ME
========================= */

app.get("/api/auth/me", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Not authenticated.",
      });
    }

    res.json({
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Me error:", error);

    res.status(500).json({
      message: "Unable to restore session.",
    });
  }
});

/* =========================
   UPDATE PROFILE
========================= */

app.put("/api/auth/profile", requireAuth, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const city = String(req.body?.city || "").trim();
    const bio = String(req.body?.bio || "").trim();
    const avatar = String(req.body?.avatar || "").trim();

    if (!name) {
      return res.status(400).json({
        message: "Name is required.",
      });
    }

    if (
      avatar &&
      !avatar.startsWith("data:image/") &&
      !avatar.startsWith("http")
    ) {
      return res.status(400).json({
        message: "Invalid avatar format.",
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        name = /* =========================
   AUTH LOGOUT,
        phone = $2,
        city = $3,
        bio = $4,
        avatar = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING
        id,
        name,
        email,
        phone,
        city,
        role,
        avatar,
        bio,
        joined,
        provider
      `,
      [
        name,
        phone,
        city,
        bio,
        avatar,
        req.user.id,
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("========== UPDATE PROFILE ERROR ==========");
    console.error("Message:", error?.message);
    console.error("Name:", error?.name);
    console.error("Code:", error?.code);
    console.error("Stack:", error?.stack);
    console.error("==========================================");

    res.status(500).json({
      message: error?.message || "Unable to update profile.",
    });
  }
});
/* =========================
   AUTH LOGOUT
========================= */

app.post("/api/auth/logout", async (req, res) => {
  clearSessionCookie(res);

  res.json({
    success: true,
  });
});

/* =========================
   CHANGE PASSWORD
========================= */

app.post("/api/auth/change-password", requireAuth, async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current and new passwords are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters.",
      });
    }

    const result = await pool.query(
      `
      SELECT password_hash
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [req.user.id]
    );

    const row = result.rows[0];

    if (!row?.password_hash) {
      return res.status(400).json({
        message: "This account does not use password authentication.",
      });
    }

    const valid = await bcrypt.compare(currentPassword, row.password_hash);

    if (!valid) {
      return res.status(400).json({
        message: "Current password is incorrect.",
      });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
      `,
      [newHash, req.user.id]
    );

    res.json({
      success: true,
      message: "Password updated.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    res.status(500).json({
      message: "Unable to update password.",
    });
  }
});

/* =========================
   FORGOT PASSWORD
========================= */

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    /*
      Email delivery is intentionally not enabled yet.
      We return a generic accepted response so the endpoint
      matches the frontend contract without exposing account existence.
    */

    res.status(202).json({
      success: true,
      message: "Password reset request accepted.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    res.status(500).json({
      message: "Unable to process password reset.",
    });
  }
});

/* =========================
   GOOGLE AUTH
========================= */

app.post("/api/auth/google", async (req, res) => {
  res.status(501).json({
    message: "Google authentication is not configured yet.",
  });
});

/* =========================
   FACEBOOK AUTH
========================= */

app.post("/api/auth/facebook", async (req, res) => {
  res.status(501).json({
    message: "Facebook authentication is not configured yet.",
  });
});

/* =========================
   STATIC FRONTEND
========================= */

app.use(express.static(PUBLIC_DIR));

app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(INDEX_FILE);
});

/* =========================
   API 404
========================= */

app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API endpoint not found.",
  });
});

/* =========================
   START SERVER
========================= */

async function start() {
  try {
    await pool.query("SELECT 1");

    console.log("PostgreSQL connection: OK");

    app.listen(PORT, () => {
      console.log(`DioraLink server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("PostgreSQL connection failed:");
    console.error(error.message);

    process.exit(1);
  }
}

start();


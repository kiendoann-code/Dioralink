const express = require("express");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require('google-auth-library');
const cookieParser = require("cookie-parser");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const asyncRoute = (handler) => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || "development";
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in .env");
}

app.set("trust proxy", 1);

app.use(express.json({ limit: "18mb" }));
app.use(cookieParser());
/* =========================================================
   AUTH — LOGOUT (EARLY ROUTE)
   Must be registered before SPA/API 404 handlers.
========================================================= */
app.post("/api/auth/logout", (req, res) => {
  try {
    res.clearCookie("dioralink_session", {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });

    res.cookie("dioralink_session", "", {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      maxAge: 0,
      path: "/"
    });

    return res.status(200).json({
      message: "Signed out successfully."
    });

  } catch (error) {

    console.error("LOGOUT ERROR:", error);

    return res.status(500).json({
      message: "Logout failed."
    });

  }
});


const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
      }
    : {
        host: String(process.env.PGHOST || "localhost"),
        port: Number(process.env.PGPORT || 5432),
        database: String(process.env.PGDATABASE || "dioralink"),
        user: String(process.env.PGUSER || "postgres"),
        password: String(process.env.PGPASSWORD || ""),
      }
);


const PUBLIC_DIR = path.join(__dirname, "Public");
const INDEX_FILE = path.join(PUBLIC_DIR, "index.html");
const { createSeoRouter, ensureSeoSchema, safeImage } = require("./seo");
const { createMarketplace, ensureMarketplaceSchema } = require("./marketplace");
const { createAnalyticsRouter, ensureAnalyticsSchema } = require("./analytics-server");
const { createCommissionWorkflow, ensureCommissionWorkflowSchema } = require("./commission-workflow");

const COOKIE_NAME = "dioralink_session";

function normalizeAccountRole(value) {
  const role=String(value||'').trim().toLowerCase();
  return role==='artist'?'artisan':role;
}

async function rolesForUser(userId, fallbackRole='') {
  const result=await pool.query(
    `SELECT role FROM user_roles WHERE user_id=$1 ORDER BY CASE role WHEN 'customer' THEN 1 ELSE 2 END`,
    [userId]
  );
  const roles=result.rows.map(row=>row.role).filter(role=>['customer','artisan'].includes(role));
  const fallback=normalizeAccountRole(fallbackRole);
  if(['customer','artisan'].includes(fallback)&&!roles.includes(fallback))roles.push(fallback);
  return roles;
}

function createToken(user, activeRole=user.activeRole||user.role) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: activeRole,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function setSessionCookie(res, user, activeRole=user.activeRole||user.role) {
  const token = createToken(user, activeRole);

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

function publicUser(row, activeRole=row.activeRole||row.role, roles=row.roles) {
  const enabledRoles=Array.isArray(roles)&&roles.length?roles:[activeRole].filter(Boolean);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    city: row.city || "",
    role: activeRole,
    roles: [...new Set(enabledRoles)],
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

    const row=result.rows[0];
    if (!row) {
      return null;
    }

    const roles=await rolesForUser(row.id,row.role);
    const requested=normalizeAccountRole(payload.role);
    const activeRole=roles.includes(requested)?requested:(roles.includes(row.role)?row.role:roles[0]);

    return {...row,primaryRole:row.role,role:activeRole,roles};
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
    await pool.query(
      `INSERT INTO user_roles(user_id,role) VALUES($1,$2) ON CONFLICT DO NOTHING`,
      [user.id,role]
    );
    user.roles=[role];
    user.role=role;

    setSessionCookie(res, user, role);

    res.status(201).json({
      user: publicUser(user,role,[role]),
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

    const roles=await rolesForUser(user.id,user.role);
    if (!roles.includes(role)) {
      const existingLabel=roles.includes('customer')?'Customer':'Artisan';
      const requestedLabel=role==='artisan'?'Artisan':'Customer';
      return res.status(403).json({
        message: `Tài khoản này chưa bật chế độ ${requestedLabel}. Hãy đăng nhập bằng ${existingLabel}, sau đó chọn “Trở thành ${requestedLabel}”.`,
      });
    }

    user.roles=roles;
    user.role=role;
    setSessionCookie(res, user, role);

    res.json({
      user: publicUser(user,role,roles),
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
   ACCOUNT ROLES / WORKSPACES
   One account may use both Customer and Artisan modes.
========================= */
app.post("/api/auth/role", requireAuth, async (req, res) => {
  try {
    const role=normalizeAccountRole(req.body?.role);
    const enable=req.body?.enable===true;

    if(!["customer","artisan"].includes(role)){
      return res.status(400).json({message:"Invalid role."});
    }

    let roles=await rolesForUser(req.user.id,req.user.primaryRole||req.user.role);

    if(!roles.includes(role)){
      if(!enable){
        return res.status(403).json({
          message: role==="artisan"
            ? "Bạn chưa bật chế độ Nghệ nhân."
            : "Bạn chưa bật chế độ Khách hàng."
        });
      }

      await pool.query(
        `INSERT INTO user_roles(user_id,role) VALUES($1,$2) ON CONFLICT DO NOTHING`,
        [req.user.id,role]
      );
      roles=await rolesForUser(req.user.id,req.user.primaryRole||req.user.role);
    }

    const row=(await pool.query(
      `SELECT id,name,email,phone,city,role,avatar,bio,joined,provider
       FROM users WHERE id=$1 LIMIT 1`,
      [req.user.id]
    )).rows[0];

    if(!row)return res.status(404).json({message:"User not found."});

    setSessionCookie(res,row,role);

    return res.json({
      success:true,
      enabled:enable,
      user:publicUser(row,role,roles)
    });
  } catch (error) {
    console.error("Role activation error:",error);
    return res.status(500).json({message:"Unable to change account role."});
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
        message: "Name is required."
      });
    }

    if (
      avatar &&
      !avatar.startsWith("data:image/") &&
      !avatar.startsWith("http")
    ) {
      return res.status(400).json({
        message: "Invalid avatar format."
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        name = $1,
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
        req.user.id
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: publicUser(user,req.user.role,req.user.roles)
    });

  } catch (error) {
    console.error("Update profile error:", error);

    res.status(500).json({
      message: error?.message || "Unable to update profile."
    });
  }
});
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
  try {
    const { credential, role } = req.body || {};

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required."
      });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || "501903521909-m9tnb539pvjbfp331ndiogv0t9actauo.apps.googleusercontent.com";

    if (!clientId) {
      console.error("GOOGLE_CLIENT_ID is missing.");
      return res.status(500).json({
        message: "Google authentication is not configured on the server."
      });
    }

    const googleClient = new OAuth2Client(clientId);

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({
        message: "Invalid Google credential."
      });
    }

    const email = String(payload.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: "Google account email is missing."
      });
    }

    if (payload.email_verified !== true) {
      return res.status(403).json({
        message: "Google email is not verified."
      });
    }

    const googleName =
      String(payload.name || "").trim() ||
      email.split("@")[0];

    const googleAvatar =
      String(payload.picture || "").trim() || null;

    let requestedRole = String(role || "customer")
      .trim()
      .toLowerCase();

    if (requestedRole === "artist") {
      requestedRole = "artisan";
    }

    if (!["customer", "artisan"].includes(requestedRole)) {
      requestedRole = "customer";
    }

    const existingResult = await pool.query(
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
        provider,
        created_at,
        updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    let user;

    if (existingResult.rows[0]) {
      const existingUser = existingResult.rows[0];

      const updateResult = await pool.query(
        `
        UPDATE users
        SET
          provider = 'google',
          avatar = COALESCE(avatar, $1),
          updated_at = NOW()
        WHERE id = $2
        RETURNING
          id,
          name,
          email,
          phone,
          city,
          role,
          avatar,
          bio,
          provider,
          created_at,
          updated_at
        `,
        [googleAvatar, existingUser.id]
      );

      user = updateResult.rows[0];
    } else {
      const insertResult = await pool.query(
        `
        INSERT INTO users (
          name,
          email,
          role,
          avatar,
          provider
        )
        VALUES ($1, $2, $3, $4, 'google')
        RETURNING
          id,
          name,
          email,
          phone,
          city,
          role,
          avatar,
          bio,
          provider,
          created_at,
          updated_at
        `,
        [
          googleName,
          email,
          requestedRole,
          googleAvatar
        ]
      );

      user = insertResult.rows[0];
    }

    let roles=await rolesForUser(user.id,user.role);

    if(existingResult.rows[0] && !roles.includes(requestedRole)){
      const existingLabel=roles.includes('customer')?'Customer':'Artisan';
      const requestedLabel=requestedRole==='artisan'?'Artisan':'Customer';
      return res.status(403).json({
        message:`Tài khoản Google này chưa bật chế độ ${requestedLabel}. Hãy đăng nhập bằng ${existingLabel}, sau đó chọn “Trở thành ${requestedLabel}”.`
      });
    }

    if(!existingResult.rows[0]){
      await pool.query(
        `INSERT INTO user_roles(user_id,role) VALUES($1,$2) ON CONFLICT DO NOTHING`,
        [user.id,requestedRole]
      );
      roles=await rolesForUser(user.id,requestedRole);
    }

    user.role=requestedRole;
    user.roles=roles;
    setSessionCookie(res, user, requestedRole);
    const safeUser=publicUser(user,requestedRole,roles);

    return res.status(200).json({
      success: true,
      message: "Signed in with Google successfully.",
      user: safeUser,
      session: {
        authenticated: true,
        user: safeUser
      }
    });

  } catch (error) {
    console.error("Google authentication error:", error);

    return res.status(401).json({
      message: error?.message || "Google authentication failed."
    });
  }
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


/* ====================== PLATFORM COMMISSION V2 ====================== */
function financeText(value,max=200){
  return String(value ?? '').trim().slice(0,max);
}

function complaintMedia(value){
  if(typeof value!=='string' || !value)return '';
  if(value.startsWith('data:image/'))return safeImage(value);
  const match=value.match(/^data:video\/(mp4|webm);base64,([A-Za-z0-9+/]+=*)$/);
  if(!match)throw Object.assign(new Error('Bằng chứng chỉ hỗ trợ ảnh JPEG/PNG/WebP hoặc video MP4/WebM.'),{status:400});
  const bytes=Buffer.from(match[2],'base64');
  if(bytes.length>4*1024*1024)throw Object.assign(new Error('Mỗi video bằng chứng tối đa 4 MB.'),{status:400});
  const validMp4=match[1]==='mp4' && bytes.length>12 && bytes.toString('ascii',4,8)==='ftyp';
  const validWebm=match[1]==='webm' && bytes.length>4 && bytes[0]===0x1a && bytes[1]===0x45 && bytes[2]===0xdf && bytes[3]===0xa3;
  if(!validMp4&&!validWebm)throw Object.assign(new Error('Video bằng chứng không hợp lệ.'),{status:400});
  return value;
}

function financeMoney(value){
  const n=Number(value);
  if(!Number.isFinite(n) || n <= 0){
    throw Object.assign(new Error('Invalid amount.'),{status:400});
  }
  return Math.round(n);
}

function financeCommissionRate(grossAmount){
  const amount=Number(grossAmount||0);
  if(amount < 2000000) return 0.10;
  if(amount <= 5000000) return 0.08;
  if(amount <= 10000000) return 0.07;
  return 0.05;
}

async function ensureFinanceSchema(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_admins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT 'DioraLink Admin',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS platform_commissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      artisan_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      customer_ref TEXT DEFAULT '',
      project_ref TEXT NOT NULL,
      project_title TEXT DEFAULT '',
      milestone_ref TEXT NOT NULL,
      milestone_name TEXT DEFAULT '',
      gross_amount NUMERIC(14,2) NOT NULL,
      discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      net_amount NUMERIC(14,2) NOT NULL,
      commission_rate NUMERIC(6,4) NOT NULL,
      platform_fee NUMERIC(14,2) NOT NULL,
      artist_net NUMERIC(14,2) NOT NULL,
      transfer_reference TEXT DEFAULT '',
      confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid','collected')),
      collected_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(artisan_user_id,project_ref,milestone_ref)
    );

    CREATE TABLE IF NOT EXISTS admin_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id UUID NOT NULL REFERENCES platform_admins(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      route TEXT DEFAULT '',
      related_commission_id UUID REFERENCES platform_commissions(id) ON DELETE SET NULL,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS platform_complaints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      complainant_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      complainant_role TEXT NOT NULL CHECK(complainant_role IN ('customer','artisan')),
      subject_type TEXT NOT NULL CHECK(subject_type IN ('commission_request','commission_project','marketplace_order')),
      subject_ref TEXT NOT NULL,
      reason TEXT NOT NULL,
      evidence JSONB NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      admin_note TEXT NOT NULL DEFAULT '',
      reviewed_by UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_platform_complaints_user
      ON platform_complaints(complainant_user_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_platform_complaints_status
      ON platform_complaints(status,created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_platform_commissions_artisan
      ON platform_commissions(artisan_user_id,confirmed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_platform_commissions_status
      ON platform_commissions(status,confirmed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin
      ON admin_notifications(admin_id,created_at DESC);
  `);

  const adminEmail=String(process.env.ADMIN_EMAIL||'kiendths150398@fpt.edu.vn').trim().toLowerCase();
  const configuredPassword=String(process.env.ADMIN_PASSWORD||'');
  let adminName=String(process.env.ADMIN_NAME||'DioraLink Admin').trim() || 'DioraLink Admin';
  let passwordHash='';

  if(configuredPassword){
    passwordHash=await bcrypt.hash(configuredPassword,12);
  }else{
    const sourceUser=(await pool.query(
      `SELECT name,password_hash
       FROM users
       WHERE LOWER(email)=LOWER($1)
       LIMIT 1`,
      [adminEmail]
    )).rows[0];

    if(sourceUser?.password_hash){
      passwordHash=sourceUser.password_hash;

      if(!process.env.ADMIN_NAME && sourceUser.name){
        adminName=String(sourceUser.name).trim() || adminName;
      }
    }
  }

  if(adminEmail && passwordHash){
    const existing=(await pool.query(
      `SELECT id,email,password_hash,display_name,active
       FROM platform_admins
       WHERE LOWER(email)=LOWER($1)
       LIMIT 1`,
      [adminEmail]
    )).rows[0];

    if(!existing){
      await pool.query(
        `INSERT INTO platform_admins(email,password_hash,display_name,active)
         VALUES($1,$2,$3,TRUE)`,
        [adminEmail,passwordHash,adminName]
      );
    }else{
      await pool.query(
        `UPDATE platform_admins
         SET email=$1,
             password_hash=$2,
             display_name=$3,
             active=TRUE,
             updated_at=NOW()
         WHERE id=$4`,
        [adminEmail,passwordHash,adminName,existing.id]
      );
    }
  }
}

function financeAdminSecret(){
  const secret=process.env.JWT_SECRET || process.env.SESSION_SECRET || '';
  if(!secret) throw new Error('JWT_SECRET or SESSION_SECRET is missing.');
  return secret;
}

function signFinanceAdmin(admin){
  return jwt.sign({sub:admin.id,type:'admin'},financeAdminSecret(),{expiresIn:'7d'});
}

function setFinanceAdminCookie(res,token){
  res.cookie('dioralink_admin_session',token,{
    httpOnly:true,
    sameSite:'lax',
    secure:process.env.NODE_ENV==='production',
    maxAge:7*24*60*60*1000,
    path:'/'
  });
}

async function getFinanceAdmin(req){
  const token=req.cookies.dioralink_admin_session;
  if(!token) return null;
  try{
    const payload=jwt.verify(token,financeAdminSecret());
    if(payload?.type!=='admin') return null;
    return (await pool.query(
      `SELECT id,email,display_name,active
       FROM platform_admins
       WHERE id=$1 AND active=TRUE
       LIMIT 1`,
      [payload.sub]
    )).rows[0] || null;
  }catch{
    return null;
  }
}

async function requireFinanceAdmin(req,res,next){
  try{
    const admin=await getFinanceAdmin(req);
    if(!admin) return res.status(401).json({message:'Admin authentication required.'});
    req.admin=admin;
    next();
  }catch(error){
    console.error('Admin auth error:',error);
    res.status(500).json({message:'Admin authentication failed.'});
  }
}

app.post('/api/admin/login',asyncRoute(async(req,res)=>{
  await ensureFinanceSchema();

  const email=String(req.body?.email||'').trim().toLowerCase();
  const password=String(req.body?.password||'');

  if(!email || !password){
    return res.status(400).json({
      message:'Admin email and password are required.'
    });
  }

  const admin=(await pool.query(
    `SELECT id,email,display_name,password_hash,active
     FROM platform_admins
     WHERE LOWER(email)=LOWER($1)
     LIMIT 1`,
    [email]
  )).rows[0];

  if(
    !admin ||
    !admin.active ||
    !(await bcrypt.compare(password,admin.password_hash))
  ){
    return res.status(401).json({
      message:'Admin email or password is incorrect.'
    });
  }

  setFinanceAdminCookie(res,signFinanceAdmin(admin));

  res.json({
    admin:{
      id:admin.id,
      email:admin.email,
      name:admin.display_name,
      role:'admin'
    }
  });
}));
app.post('/api/admin/logout',(req,res)=>{
  res.clearCookie('dioralink_admin_session',{
    httpOnly:true,
    sameSite:'lax',
    secure:process.env.NODE_ENV==='production',
    path:'/'
  });
  res.json({message:'Admin logged out.'});
});

app.get('/api/admin/me',requireFinanceAdmin,(req,res)=>{
  res.json({admin:{id:req.admin.id,email:req.admin.email,name:req.admin.display_name,role:'admin'}});
});

/* Artist confirms that the direct bank transfer has arrived.
   This records DioraLink's commission; it does not pull money from the bank. */
app.post('/api/finance/commission/confirm',requireAuth,(req,res,next)=>{
  if(req.user?.role!=='artisan') return res.status(403).json({message:'Forbidden for this role.'});
  return Promise.resolve((async()=>{
    await ensureFinanceSchema();

    const projectRef=financeText(req.body?.projectRef,120);
    const milestoneRef=financeText(req.body?.milestoneRef,80);
    const projectTitle=financeText(req.body?.projectTitle,200);
    const milestoneName=financeText(req.body?.milestoneName,200);
    const customerRef=financeText(req.body?.customerRef,120);
    const grossAmount=financeMoney(req.body?.grossAmount);
    const discountAmount=Math.max(0,Number(req.body?.discount||0));
    const netAmount=financeMoney(req.body?.netAmount);
    const transferReference=financeText(req.body?.transferReference,120);

    if(!projectRef || !milestoneRef){
      return res.status(400).json({message:'Project and milestone are required.'});
    }
    if(netAmount>grossAmount){
      return res.status(400).json({message:'Customer payment cannot exceed gross amount.'});
    }

    const existing=(await pool.query(
      `SELECT * FROM platform_commissions
       WHERE artisan_user_id=$1 AND project_ref=$2 AND milestone_ref=$3
       LIMIT 1`,
      [req.user.id,projectRef,milestoneRef]
    )).rows[0];

    if(existing){
      return res.json({
        alreadyRecorded:true,
        confirmedAt:existing.confirmed_at,
        commission:{
          rate:Number(existing.commission_rate)*100,
          platformFee:Number(existing.platform_fee),
          artistNet:Number(existing.artist_net),
          status:existing.status
        }
      });
    }

    const rate=financeCommissionRate(grossAmount);
    const platformFee=Math.round(grossAmount*rate);
    const artistNet=Math.max(0,Math.round(netAmount-platformFee));

    const client=await pool.connect();
    try{
      await client.query('BEGIN');

      const inserted=(await client.query(
        `INSERT INTO platform_commissions(
          artisan_user_id,customer_ref,project_ref,project_title,milestone_ref,milestone_name,
          gross_amount,discount_amount,net_amount,commission_rate,platform_fee,artist_net,
          transfer_reference,status,confirmed_at
        )
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'unpaid',NOW())
        RETURNING *`,
        [
          req.user.id,customerRef,projectRef,projectTitle,milestoneRef,milestoneName,
          grossAmount,discountAmount,netAmount,rate,platformFee,artistNet,transferReference
        ]
      )).rows[0];

      const admins=(await client.query(
        `SELECT id FROM platform_admins WHERE active=TRUE ORDER BY created_at ASC`
      )).rows;

      for(const admin of admins){
        await client.query(
          `INSERT INTO admin_notifications(
             admin_id,title,body,route,related_commission_id
           ) VALUES($1,$2,$3,$4,$5)`,
          [
            admin.id,
            'New platform commission',
            `${req.user.name} confirmed ${grossAmount.toLocaleString('vi-VN')} VND received. Platform fee: ${platformFee.toLocaleString('vi-VN')} VND (${Math.round(rate*100)}%). Transfer: ${transferReference || 'not provided'}.`,
            'admin-commissions',
            inserted.id
          ]
        );
      }

      await client.query('COMMIT');

      return res.status(201).json({
        message:'Platform commission recorded.',
        confirmedAt:inserted.confirmed_at,
        commission:{rate:rate*100,platformFee,artistNet,status:'unpaid'}
      });
    }catch(error){
      await client.query('ROLLBACK');
      throw error;
    }finally{
      client.release();
    }
  })()).catch(next);
});

app.get('/api/admin/finance',requireFinanceAdmin,asyncRoute(async(_req,res)=>{
  await ensureFinanceSchema();
  const summary=(await pool.query(`
    SELECT
      COALESCE(SUM(gross_amount),0) AS gross,
      COALESCE(SUM(platform_fee),0) AS platform_fee,
      COALESCE(SUM(platform_fee) FILTER (WHERE status='unpaid'),0) AS unpaid,
      COALESCE(SUM(platform_fee) FILTER (WHERE status='collected'),0) AS collected
    FROM platform_commissions
  `)).rows[0];

  const commissions=(await pool.query(`
    SELECT pc.*,u.name AS artist_name,u.email AS artist_email
    FROM platform_commissions pc
    JOIN users u ON u.id=pc.artisan_user_id
    ORDER BY pc.confirmed_at DESC
    LIMIT 200
  `)).rows;

  res.json({
    summary:{
      gross:Number(summary.gross||0),
      platformFee:Number(summary.platform_fee||0),
      unpaid:Number(summary.unpaid||0),
      collected:Number(summary.collected||0)
    },
    commissions
  });
}));

app.get('/api/admin/notifications',requireFinanceAdmin,asyncRoute(async(req,res)=>{
  await ensureFinanceSchema();
  const notifications=(await pool.query(`
    SELECT id,title,body,route,read_at,created_at
    FROM admin_notifications
    WHERE admin_id=$1
    ORDER BY created_at DESC
    LIMIT 100
  `,[req.admin.id])).rows;
  res.json({notifications});
}));

app.post('/api/admin/notifications/:id/read',requireFinanceAdmin,asyncRoute(async(req,res)=>{
  await ensureFinanceSchema();
  await pool.query(
    `UPDATE admin_notifications
     SET read_at=COALESCE(read_at,NOW())
     WHERE id=$1 AND admin_id=$2`,
    [req.params.id,req.admin.id]
  );
  res.json({message:'Notification marked as read.'});
}));

app.post('/api/complaints',requireAuth,asyncRoute(async(req,res)=>{
  await ensureFinanceSchema();
  if(!['customer','artisan'].includes(req.user.role)){
    return res.status(403).json({message:'Chỉ Khách hàng hoặc Nghệ nhân có thể gửi khiếu nại.'});
  }

  const subjectType=financeText(req.body?.subjectType,40);
  const subjectRef=financeText(req.body?.subjectRef,120);
  const reason=financeText(req.body?.reason,3000);
  const rawEvidence=Array.isArray(req.body?.evidence)?req.body.evidence.slice(0,3):[];

  if(!['commission_request','commission_project','marketplace_order'].includes(subjectType)){
    return res.status(400).json({message:'Loại khiếu nại không hợp lệ.'});
  }
  if(!subjectRef)return res.status(400).json({message:'Thiếu mã yêu cầu/đơn hàng.'});
  if(reason.length<20)return res.status(400).json({message:'Lý do khiếu nại cần ít nhất 20 ký tự.'});
  if(!rawEvidence.length)return res.status(400).json({message:'Vui lòng đính kèm ít nhất một ảnh hoặc video bằng chứng.'});

  const evidence=rawEvidence.map(complaintMedia);

  if(subjectType==='marketplace_order'){
    const order=(await pool.query(
      'SELECT buyer_id,seller_id FROM market_orders WHERE id=$1 LIMIT 1',
      [subjectRef]
    )).rows[0];
    if(!order || (order.buyer_id!==req.user.id && order.seller_id!==req.user.id)){
      return res.status(404).json({message:'Không tìm thấy đơn hàng thuộc tài khoản của bạn.'});
    }
  }

  const complaint=(await pool.query(
    `INSERT INTO platform_complaints(
       complainant_user_id,complainant_role,subject_type,subject_ref,reason,evidence
     ) VALUES($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [req.user.id,req.user.role,subjectType,subjectRef,reason,JSON.stringify(evidence)]
  )).rows[0];

  const admins=(await pool.query('SELECT id FROM platform_admins WHERE active=TRUE')).rows;
  for(const admin of admins){
    await pool.query(
      `INSERT INTO admin_notifications(admin_id,title,body,route)
       VALUES($1,$2,$3,$4)`,
      [
        admin.id,
        'Khiếu nại mới',
        `${req.user.name} gửi khiếu nại cho ${subjectType} ${subjectRef}.`,
        'admin-complaints'
      ]
    );
  }

  res.status(201).json({complaint,message:'Đã gửi khiếu nại để DioraLink xét duyệt.'});
}));

app.get('/api/complaints/mine',requireAuth,asyncRoute(async(req,res)=>{
  await ensureFinanceSchema();
  const complaints=(await pool.query(
    `SELECT id,complainant_role,subject_type,subject_ref,reason,evidence,status,admin_note,reviewed_at,created_at
     FROM platform_complaints
     WHERE complainant_user_id=$1
     ORDER BY created_at DESC
     LIMIT 100`,
    [req.user.id]
  )).rows;
  res.json({complaints});
}));

app.get('/api/admin/complaints',requireFinanceAdmin,asyncRoute(async(req,res)=>{
  await ensureFinanceSchema();
  const status=financeText(req.query?.status,20);
  const complaints=(await pool.query(
    `SELECT pc.*,u.name AS complainant_name,u.email AS complainant_email
     FROM platform_complaints pc
     JOIN users u ON u.id=pc.complainant_user_id
     WHERE ($1='' OR pc.status=$1)
     ORDER BY pc.created_at DESC
     LIMIT 200`,
    [status]
  )).rows;
  res.json({complaints});
}));

app.post('/api/admin/complaints/:id/review',requireFinanceAdmin,asyncRoute(async(req,res)=>{
  await ensureFinanceSchema();
  const status=financeText(req.body?.status,20);
  const note=financeText(req.body?.note,3000);
  if(!['approved','rejected'].includes(status)){
    return res.status(400).json({message:'Trạng thái xét duyệt không hợp lệ.'});
  }
  if(note.length<10){
    return res.status(400).json({message:'Vui lòng ghi kết luận xét duyệt ít nhất 10 ký tự.'});
  }
  const complaint=(await pool.query(
    `UPDATE platform_complaints
     SET status=$2,admin_note=$3,reviewed_by=$4,reviewed_at=NOW(),updated_at=NOW()
     WHERE id=$1
     RETURNING *`,
    [req.params.id,status,note,req.admin.id]
  )).rows[0];
  if(!complaint)return res.status(404).json({message:'Không tìm thấy khiếu nại.'});
  res.json({complaint,message:'Đã cập nhật kết quả xét duyệt.'});
}));

app.post('/api/admin/commissions/:id/collect',requireFinanceAdmin,asyncRoute(async(req,res)=>{
  await ensureFinanceSchema();
  const result=await pool.query(`
    UPDATE platform_commissions
    SET status='collected',
        collected_at=COALESCE(collected_at,NOW()),
        updated_at=NOW()
    WHERE id=$1
    RETURNING *
  `,[req.params.id]);
  if(!result.rows[0]) return res.status(404).json({message:'Commission not found.'});
  res.json({commission:result.rows[0],message:'Commission marked as collected.'});
}));

/* Public pages are rendered on the server; private workspace remains a SPA. */
app.get('/index.html', (_req, res) => res.redirect(301, '/'));
app.use(express.static(PUBLIC_DIR, { index: false, maxAge: '7d', setHeaders(res, filePath) {
  if (filePath.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache');
    return;
  }
  res.setHeader('Cache-Control', 'public, max-age=604800');
} }));
const commissionWorkflow = createCommissionWorkflow({ pool, requireAuth });
app.use("/api/commission", commissionWorkflow.router);
const marketplace = createMarketplace({ pool, indexFile: INDEX_FILE, requireAuth, requireAdmin: requireFinanceAdmin });
app.use(marketplace.router);
app.use(createAnalyticsRouter({ pool, requireAdmin: requireFinanceAdmin }));
app.use(createSeoRouter({ pool, indexFile: INDEX_FILE, requireAuth, getHomeSection: marketplace.getHomeSection, getSitemapEntries: marketplace.getSitemapEntries }));

/* =========================
   API 404
========================= */

app.post("/api/auth/logout", (req, res) => {
  try {
    clearSessionCookie(res);

    res.status(200).json({
      message: "Signed out successfully."
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      message: "Logout failed."
    });
  }
});
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash TEXT,
        phone VARCHAR(50) DEFAULT '',
        city VARCHAR(150) DEFAULT '',
        role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'artisan')),
        avatar TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        joined VARCHAR(4),
        provider VARCHAR(30) NOT NULL DEFAULT 'email',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
      ON users (LOWER(email));
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('customer','artisan')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY(user_id,role)
      );
      CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles(role,user_id);
      INSERT INTO user_roles(user_id,role)
      SELECT id,role FROM users
      ON CONFLICT(user_id,role) DO NOTHING;
    `);

    await ensureSeoSchema(pool);
    await ensureMarketplaceSchema(pool);
    await ensureAnalyticsSchema(pool);
    await ensureCommissionWorkflowSchema(pool);
    console.log("Database schema: OK");

    app.post("/api/auth/logout", (req, res) => {
  try {
    res.clearCookie("dioralink_session", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });
    // Hard-delete the session cookie as well.
    res.cookie("dioralink_session","",{
      httpOnly:true,
      secure:NODE_ENV==="production",
      sameSite:"lax",
      expires:new Date(0),
      maxAge:0,
      path:"/"
    });

    return res.json({
      success: true,
      message: "Logged out successfully."
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      message: "Unable to logout."
    });
  }
});
app.listen(PORT, "0.0.0.0", () => {
      console.log(`DioraLink server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("PostgreSQL connection failed:");
    console.error(error.message);

    process.exit(1);
  }
}

start();











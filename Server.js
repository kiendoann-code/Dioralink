const express = require("express");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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

app.use(express.json({ limit: "6mb" }));
app.use(cookieParser());

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
      user: publicUser(user)
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


/* ====================== PLATFORM COMMISSION V2 ====================== */
function financeText(value,max=200){
  return String(value ?? '').trim().slice(0,max);
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

    CREATE INDEX IF NOT EXISTS idx_platform_commissions_artisan
      ON platform_commissions(artisan_user_id,confirmed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_platform_commissions_status
      ON platform_commissions(status,confirmed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin
      ON admin_notifications(admin_id,created_at DESC);
  `);

  const adminEmail=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
  const adminPassword=String(process.env.ADMIN_PASSWORD||'');
  const adminName=String(process.env.ADMIN_NAME||'DioraLink Admin').trim() || 'DioraLink Admin';

  console.log(
    '[Finance admin bootstrap] emailConfigured=' + Boolean(adminEmail) +
    ' passwordConfigured=' + Boolean(adminPassword) +
    ' nameConfigured=' + Boolean(process.env.ADMIN_NAME)
  );

  if(adminEmail && adminPassword){
    const existing=(await pool.query(
      `SELECT id,email,password_hash,display_name,active
       FROM platform_admins
       WHERE LOWER(email)=LOWER($1)
       LIMIT 1`,
      [adminEmail]
    )).rows[0];

    if(!existing){
      const hash=await bcrypt.hash(adminPassword,12);
      await pool.query(
        `INSERT INTO platform_admins(email,password_hash,display_name,active)
         VALUES($1,$2,$3,TRUE)`,
        [adminEmail,hash,adminName]
      );
    }else{
      const passwordMatches=await bcrypt.compare(adminPassword,existing.password_hash);
      const emailMatches=String(existing.email||'').trim().toLowerCase()===adminEmail;
      const nameMatches=String(existing.display_name||'').trim()===adminName;
      const needsPasswordUpdate=!passwordMatches;

      let passwordHash=existing.password_hash;
      if(needsPasswordUpdate){
        passwordHash=await bcrypt.hash(adminPassword,12);
      }

      if(!emailMatches || !nameMatches || !existing.active || needsPasswordUpdate){
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

  const admin=(await pool.query(
    `SELECT id,email,display_name,password_hash,active
     FROM platform_admins
     WHERE LOWER(email)=LOWER($1)
     LIMIT 1`,
    [email]
  )).rows[0];

  const passwordMatches=admin ? await bcrypt.compare(password,admin.password_hash) : false;

  console.log(
    '[Admin login diagnostic] email=' + email +
    ' found=' + Boolean(admin) +
    ' active=' + Boolean(admin?.active) +
    ' passwordMatch=' + passwordMatches
  );

  if(!admin || !admin.active || !passwordMatches){
    return res.status(401).json({message:'Admin email or password is incorrect.'});
  }

  setFinanceAdminCookie(res,signFinanceAdmin(admin));
  res.json({admin:{id:admin.id,email:admin.email,name:admin.display_name,role:'admin'}});
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

/* ====================== END PLATFORM COMMISSION V2 ====================== */app.use(express.static(PUBLIC_DIR));

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

    console.log("Database schema: OK");

    app.post("/api/auth/logout", (req, res) => {
  try {
    res.clearCookie("dioralink_session", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
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








import express from "express";
import dotenv from "dotenv";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const { Pool } = pg;

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET;

if (
  !SESSION_SECRET ||
  SESSION_SECRET ===
    "THIS_IS_A_LONG_RANDOM_SECRET_FOR_DIORALINK"
) {
  console.warn(
    "WARNING: SESSION_SECRET is using the placeholder value. Change it in .env before production."
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(cookieParser());

app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false
  })
);


/* =========================================================
   HELPERS
========================================================= */

function normalizeEmail(email) {

  return String(email || "")
    .trim()
    .toLowerCase();

}


function safeUser(row) {

  return {

    id:
      row.id,

    email:
      row.email,

    name:
      row.name,

    phone:
      row.phone || "",

    city:
      row.city || "",

    bio:
      row.bio || "",

    avatar:
      row.avatar ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",

    role:
      row.role || "customer",

    provider:
      row.provider || "email",

    email_verified:
      Boolean(row.email_verified),

    joined:
      row.created_at
        ? new Date(row.created_at)
            .getFullYear()
            .toString()
        : new Date()
            .getFullYear()
            .toString()

  };

}


function signSession(user) {

  if (!SESSION_SECRET) {

    throw new Error(
      "SESSION_SECRET is missing in .env"
    );

  }

  return jwt.sign(

    {
      sub:
        user.id,

      email:
        user.email
    },

    SESSION_SECRET,

    {
      expiresIn:
        "7d"
    }

  );

}


function setSessionCookie(
  res,
  token
) {

  res.cookie(
    "dioralink_session",
    token,
    {

      httpOnly:
        true,

      sameSite:
        "lax",

      secure:
        false,

      maxAge:
        7 * 24 * 60 * 60 * 1000,

      path:
        "/"

    }
  );

}


async function getAuthenticatedUser(
  req
) {

  const token =
    req.cookies.dioralink_session;

  if (!token) {

    return null;

  }

  if (!SESSION_SECRET) {

    throw new Error(
      "SESSION_SECRET is missing in .env"
    );

  }

  let payload;

  try {

    payload =
      jwt.verify(
        token,
        SESSION_SECRET
      );

  }

  catch {

    return null;

  }

  const result =
    await pool.query(

      `
        SELECT
          id,
          email,
          name,
          phone,
          city,
          bio,
          avatar,
          provider,
          email_verified,
          created_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,

      [
        payload.sub
      ]

    );

  if (
    !result.rows.length
  ) {

    return null;

  }

  return result.rows[0];

}


/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/health",
  async (
    req,
    res
  ) => {

    try {

      const result =
        await pool.query(
          "SELECT NOW()"
        );

      res.json({

        status:
          "ok",

        database:
          "connected",

        time:
          result.rows[0].now

      });

    }

    catch (error) {

      console.error(
        error
      );

      res.status(500).json({

        status:
          "error",

        database:
          "connection failed",

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   AUTH — REGISTER
========================================================= */

app.post(
  "/api/auth/register",
  async (
    req,
    res
  ) => {

    try {

      const name =
        String(
          req.body.name || ""
        ).trim();

      const email =
        normalizeEmail(
          req.body.email
        );

      const password =
        String(
          req.body.password || ""
        );


      /* -----------------------------------------
         VALIDATE NAME
      ----------------------------------------- */

      if (
        name.length < 2 ||
        name.length > 120
      ) {

        return res.status(400).json({

          message:
            "Tên phải có từ 2 đến 120 ký tự."

        });

      }


      /* -----------------------------------------
         VALIDATE EMAIL
      ----------------------------------------- */

      if (
        !email ||
        !email.includes("@")
      ) {

        return res.status(400).json({

          message:
            "Email không hợp lệ."

        });

      }


      /* -----------------------------------------
         VALIDATE PASSWORD
      ----------------------------------------- */

      if (
        password.length < 8
      ) {

        return res.status(400).json({

          message:
            "Mật khẩu phải có ít nhất 8 ký tự."

        });

      }


      /* -----------------------------------------
         CHECK EXISTING USER
      ----------------------------------------- */

      const existing =
        await pool.query(

          `
            SELECT id
            FROM users
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1
          `,

          [
            email
          ]

        );

      if (
        existing.rows.length
      ) {

        return res.status(409).json({

          message:
            "Email này đã được đăng ký."

        });

      }


      /* -----------------------------------------
         HASH PASSWORD
      ----------------------------------------- */

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );


      /* -----------------------------------------
         CREATE USER
      ----------------------------------------- */

      const result =
        await pool.query(

          `
            INSERT INTO users (
              email,
              password_hash,
              name,
              provider,
              email_verified
            )
            VALUES (
              $1,
              $2,
              $3,
              'email',
              FALSE
            )
            RETURNING
              id,
              email,
              name,
              phone,
              city,
              bio,
              avatar,
              provider,
              email_verified,
              created_at
          `,

          [
            email,
            passwordHash,
            name
          ]

        );


      const user =
        result.rows[0];


      /* -----------------------------------------
         CREATE SESSION
      ----------------------------------------- */

      const token =
        signSession(
          user
        );


      setSessionCookie(
        res,
        token
      );


      /* -----------------------------------------
         RESPONSE
      ----------------------------------------- */

      return res.status(201).json({

        message:
          "Đăng ký thành công.",

        session: {

          user:
            safeUser(
              user
            )

        }

      });

    }

    catch (error) {

      console.error(
        "REGISTER ERROR:",
        error
      );

      res.status(500).json({

        message:
          "Không thể tạo tài khoản.",

        error:
          error.message

      });

    }

  }
);


/* =========================================================
   AUTH — LOGIN
========================================================= */

app.post(
  "/api/auth/login",
  async (
    req,
    res
  ) => {

    try {

      const email =
        normalizeEmail(
          req.body.email
        );

      const password =
        String(
          req.body.password || ""
        );


      /* -----------------------------------------
         BASIC VALIDATION
      ----------------------------------------- */

      if (
        !email ||
        !password
      ) {

        return res.status(400).json({

          message:
            "Vui lòng nhập email và password."

        });

      }


      /* -----------------------------------------
         FIND USER
      ----------------------------------------- */

      const result =
        await pool.query(

          `
            SELECT
              id,
              email,
              password_hash,
              name,
              phone,
              city,
              bio,
              avatar,
              provider,
              email_verified,
              created_at
            FROM users
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1
          `,

          [
            email
          ]

        );


      if (
        !result.rows.length
      ) {

        return res.status(401).json({

          message:
            "Email hoặc password không đúng."

        });

      }


      const user =
        result.rows[0];


      /* -----------------------------------------
         CHECK PASSWORD
      ----------------------------------------- */

      const validPassword =
        await bcrypt.compare(

          password,

          user.password_hash

        );


      if (
        !validPassword
      ) {

        return res.status(401).json({

          message:
            "Email hoặc password không đúng."

        });

      }


      /* -----------------------------------------
         CREATE SESSION
      ----------------------------------------- */

      const token =
        signSession(
          user
        );


      setSessionCookie(
        res,
        token
      );


      /* -----------------------------------------
         RESPONSE
      ----------------------------------------- */

      return res.json({

        message:
          "Đăng nhập thành công.",

        session: {

          user:
            safeUser(
              user
            )

        }

      });

    }

    catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      res.status(500).json({

        message:
          "Không thể đăng nhập.",

        error:
          error.message

      });

    }

  }
);


/* =========================================================
   AUTH — CURRENT SESSION
========================================================= */

app.get(
  "/api/auth/me",
  async (
    req,
    res
  ) => {

    try {

      const user =
        await getAuthenticatedUser(
          req
        );


      if (!user) {

        return res.status(401).json({

          message:
            "Not authenticated."

        });

      }


      res.json({

        user:
          safeUser(
            user
          )

      });

    }

    catch (error) {

      console.error(
        "SESSION ERROR:",
        error
      );

      res.status(500).json({

        message:
          "Không thể kiểm tra session.",

        error:
          error.message

      });

    }

  }
);


/* =========================================================
   AUTH — LOGOUT
========================================================= */

app.post(
  "/api/auth/logout",
  (
    req,
    res
  ) => {

    res.clearCookie(

      "dioralink_session",

      {

        httpOnly:
          true,

        sameSite:
          "lax",

        secure:
          false,

        path:
          "/"

      }

    );


    res.json({

      message:
        "Đã đăng xuất."

    });

  }
);


/* =========================================================
   WEBSITE
========================================================= */

app.use(

  express.static(

    path.join(
      __dirname,
      "../public"
    )

  )

);


/* =========================================================
   SPA FALLBACK
========================================================= */

app.use(

  (
    req,
    res,
    next
  ) => {

    if (
      req.path.startsWith(
        "/api/"
      )
    ) {

      return next();

    }


    res.sendFile(

      path.join(

        __dirname,

        "../public/index.html"

      )

    );

  }

);


/* =========================================================
   START
========================================================= */

app.listen(

  PORT,

  async () => {

    console.log(
      "================================="
    );

    console.log(

      `DioraLink running on http://localhost:${PORT}`

    );


    try {

      await pool.query(
        "SELECT 1"
      );

      console.log(
        "PostgreSQL: CONNECTED"
      );

    }

    catch (error) {

      console.error(
        "PostgreSQL: FAILED"
      );

      console.error(
        error.message
      );

    }

  }

);
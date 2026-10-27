import pg from 'pg';
import bcrypt from 'bcryptjs';
import reportModule from '../finance-report.js';
import renderer from '../Public/admin-finance-demo.js';

export function createHandler(pool, compare = bcrypt.compare) {
  const headers = {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    'Referrer-Policy': 'no-referrer',
  };
  const response = (body, status = 200, extra = {}) => new Response(body, {status, headers: {...headers, ...extra}});
  return {
    async fetch(request) {
      const path = new URL(request.url).pathname;
      if (request.method !== 'GET') return response('Method not allowed', 405, {Allow: 'GET'});
      if (!['/', '/api/admin/finance', '/api/health'].includes(path)) return response('Not found', 404);
      try {
        if (path === '/api/health') {
          await pool.query('SELECT 1');
          return response(JSON.stringify({status: 'ok', database: 'connected', version: 'finance-neon-v1'}), 200, {'Content-Type': 'application/json'});
        }
        // Reuse existing admin credentials. No replacement accounts, tokens, schema changes or data writes.
        const authorization = request.headers.get('authorization') || '';
        const denied = () => response('Đăng nhập bằng tài khoản quản trị DioraLink để xem báo cáo nội bộ.', 401, {'WWW-Authenticate': 'Basic realm="DioraLink Internal Finance", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8'});
        if (!authorization.startsWith('Basic ') || authorization.length > 2048) return denied();
        const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
        const separator = decoded.indexOf(':');
        if (separator < 1) return denied();
        const email = decoded.slice(0, separator).trim().toLowerCase();
        const password = decoded.slice(separator + 1);
        if (!password || Buffer.byteLength(password) > 72) return denied();
        const admin = (await pool.query('SELECT id,password_hash,active FROM platform_admins WHERE LOWER(email)=$1 LIMIT 1', [email])).rows[0];
        if (!admin?.active || !await compare(password, admin.password_hash)) return denied();
        const client = await pool.connect();
        let report;
        try {
          await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
          report = await reportModule.loadFinanceReport(client);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally { client.release(); }
        if (path === '/api/admin/finance') return response(JSON.stringify({report}), 200, {'Content-Type': 'application/json'});
        const html = '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tài chính nội bộ · DioraLink</title><style>body{margin:0;background:#0b1d23;color:#e8f1ef;font:15px/1.6 system-ui,sans-serif}main{max-width:1500px;margin:auto;padding:32px 24px}h1{font-size:32px;margin:0}h2{font-size:22px}.eyebrow,.k{color:#9bb8b4}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.card{border:1px solid #2b484e;border-radius:14px;background:#102a32}.metric,.pad{padding:20px}.n{font-size:27px;font-weight:700;color:#a7efda}.k{font-size:13px}.small{max-width:1100px;color:#bad0cb}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;white-space:nowrap}th,td{padding:12px;text-align:left;border-bottom:1px solid #2b484e}th{color:#a7efda}a{color:#a7efda}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}footer{margin-top:24px;color:#9bb8b4;font-size:13px}@media(max-width:750px){.grid{grid-template-columns:1fr}main{padding:20px 12px}h1{font-size:25px}}</style></head><body><main><header><div><div class="eyebrow">DIORALINK · QUẢN TRỊ · NỘI BỘ</div><h1>Tài chính tổng hợp</h1></div><a href="/">Làm mới</a></header>' + renderer.renderReport(report) + '<footer>Nguồn dữ liệu: Neon · Cập nhật khi mở hoặc làm mới báo cáo. Chỉ tài khoản quản trị được truy cập.</footer></main></body></html>';
        return response(html, 200, {'Content-Type': 'text/html; charset=utf-8'});
      } catch (error) {
        console.error('Finance request failed', error.code || error.name, String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[database-url]')); 
        return response('Không tải được báo cáo. Vui lòng thử lại.', 503, {'Content-Type': 'text/plain; charset=utf-8'});
      }
    },
  };
}

let handler;
export default {
  fetch(request) {
    if (!handler) {
      const connection = new URL(process.env.DATABASE_URL);
      connection.pathname = '/dioralink';
      connection.searchParams.set('sslmode', 'verify-full');
      const pool = new pg.Pool({connectionString: connection.toString(), max: 5, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000, query_timeout: 15000});
      pool.on('error', error => console.error('Finance pool error', error.code || error.name));
      handler = createHandler(pool);
    }
    return handler.fetch(request);
  },
};

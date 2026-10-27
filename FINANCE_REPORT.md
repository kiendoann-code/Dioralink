# Báo cáo tài chính nội bộ

Dashboard Admin tổng hợp giao dịch dự án trực tiếp, Marketplace, dự án qua Ví Diora và bộ mô phỏng trong cùng một bảng. Không hiển thị mã demo. API giữ id, dataType và source để truy vết; bộ mô phỏng gốc vẫn giữ isDemo. Không ghi dữ liệu mô phỏng vào sổ thật.

- Phí thật lấy từ platform_commissions.platform_fee, market_orders.platform_fee và diora_holds.fee, không áp lại biểu phí.
- Tỷ lệ platform_commissions được lưu dưới dạng phân số; Marketplace lưu phần trăm. Ví chỉ có số phí đã chốt nên không suy đoán tỷ lệ.
- Marketplace chỉ ghi nhận giá trị và phí được hưởng khi completed và không tranh chấp. Phí đã thu ròng trừ phần đã hoàn, phí cần hoàn lại hiển thị riêng.
- Chỉ khoản giữ dự án đã released và có bút toán phí nền tảng mới được tính là đã thu qua Ví Diora. Không đếm lại khoản Marketplace hay tham chiếu đã có trong platform_commissions.
- Tổng mô phỏng được hiển thị riêng, thực thu bằng 0. Không có tổng doanh thu cộng lẫn mô phỏng với thật.
- Giữ nguyên summary và commissions của API cũ; dashboard mới dùng report, không bị giới hạn ở 200 dòng cũ. Endpoint giữ quyền quản trị và không lưu cache.

## Kiểm tra ngày 27/10/2026

Đã kiểm tra định nghĩa bảng trong Server.js, marketplace.js và wallet.js; chạy truy vấn mới trên PostgreSQL PGlite với chính các định nghĩa bảng này. Kiểm tra tỷ lệ riêng từng đơn, khoản ví, chống đếm trùng, 205 khoản hoa hồng, phân loại mô phỏng, escaping và quyền đọc bộ mô phỏng. Nhóm tài chính: 9/9 đạt. Toàn dự án: 55/64 đạt. Bản HEAD gốc trong thư mục tạm: 53/62 đạt; cùng 9 lỗi Marketplace, SEO và chính sách liên hệ.

Đã kiểm tra chỉ đọc trực tiếp Neon qua connector: project steep-violet-06235192, branch main (br-wispy-queen-b986jn5d), database dioralink. Cấu trúc bảng khớp truy vấn. Tại thời điểm kiểm tra, platform_commissions, market_orders và khoản hoa hồng dự án đã giải ngân qua ví đều có 0 bản ghi. Không thay đổi dữ liệu thật.

## Triển khai trực tiếp Neon

Đã triển khai báo cáo nội bộ bằng Neon Functions trong project hiện có, branch main. Function: diorafinance, deployment 3 (completed), ngày 27/10/2026.

URL: https://br-wispy-queen-b986jn5d-diorafinance.compute.c-7.eu-central-1.aws.neon.tech/

Đây là đường dẫn báo cáo nội bộ riêng trên Neon. Bản triển khai này không chuyển toàn bộ website hoặc đổi DNS. Giữ nguyên bản cập nhật dashboard trong mã nguồn. Không sử dụng hoặc kích hoạt triển khai Render.

Đăng nhập qua hộp thoại trình duyệt bằng email/mật khẩu quản trị hiện có trong platform_admins trên database dioralink; chỉ tài khoản active được xem. Không tạo tài khoản thay thế. Function chỉ cung cấp GET, truy vấn báo cáo trong transaction REPEATABLE READ READ ONLY; không ghi dữ liệu tài chính hoặc chạy migration.

Đóng gói: node functions/build-finance.cjs. Archive tạm .neon-finance/function.zip được loại khỏi Git. Deploy archive trực tiếp qua Neon deploy_function vào đúng project/branch/slug trên. DATABASE_URL do Neon cấp tự động; chọn database dioralink, không đổi kết nối của ứng dụng khác.

Kiểm thử phần tài chính và handler: 10/10 đạt. Kiểm tra trực tiếp sau triển khai: /api/health trả 200 và database connected; trang báo cáo/API tài chính trả 401 khi chưa đăng nhập hoặc sai thông tin; POST trả 405. Chưa kiểm tra đăng nhập thành công trên URL thật vì không có mật khẩu quản trị trong phiên; luồng đăng nhập đúng và quyền admin đã được kiểm thử tự động.

Chính sách lâu dài trong AGENTS.md: không dùng Render, kể cả gián tiếp qua luồng Git tự triển khai cũ.

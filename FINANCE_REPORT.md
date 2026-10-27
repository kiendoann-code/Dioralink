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

Chưa đối soát cơ sở dữ liệu đang chạy: không có DATABASE_URL/PG credentials trong phiên; kết nối PostgreSQL mặc định yêu cầu xác thực. Chưa triển khai hoặc thay đổi dữ liệu thật. Cần cấu hình kết nối phù hợp để đối soát trước khi triển khai.

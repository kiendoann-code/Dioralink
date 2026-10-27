# Báo cáo tài chính trong quản trị DioraLink

## Đích sử dụng

Hai màn hình trong website hiện có:
- /ung-dung#admin-dashboard — Tài chính.
- /ung-dung#admin-market — Kinh doanh Marketplace.

Hai màn hình dùng bảng giao dịch tổng hợp, phân biệt dữ liệu thật/mô phỏng và không hiển thị cột mã demo. Marketplace lọc cả hai loại dữ liệu theo khoảng ngày đang chọn. Không chuyển người dùng sang URL hoặc luồng đăng nhập khác.

## Cách tính

Hoa hồng thật lấy từ số phí đã lưu trong platform_commissions, market_orders và diora_holds. Tỷ lệ platform_commissions lưu dạng phân số, Marketplace lưu phần trăm; không áp lại biểu phí giả định. Phí đã thu qua ví không đếm trùng với Marketplace hay khoản đã có trong sổ hoa hồng trực tiếp.

Marketplace chỉ ghi nhận giá trị/phí được hưởng khi đơn completed và không tranh chấp. Khoản đã thu ròng, còn phải thu và cần hoàn lại được phân biệt. Giá trị mô phỏng có tổng riêng và thực thu bằng 0; không ghi vào sổ thật, ví hoặc tồn kho. Backend giữ id, dataType và source; bộ mô phỏng gốc giữ isDemo.

## Triển khai và dữ liệu

Dùng luồng GitHub main hiện có cho website. Ngày 27/10/2026 đã xác minh hai dịch vụ web Dioralink và Dioralink-1 có plan free, không bị tạm dừng, auto-deploy theo main. Người dùng đã cho phép dùng Render trở lại nhưng không phát sinh gói trả phí. Cơ sở dữ liệu vẫn là Neon hiện có; không thay đổi kết nối, không khôi phục cơ sở dữ liệu Render cũ, không cần backup mới.

Project Neon: steep-violet-06235192; branch main: br-wispy-queen-b986jn5d; database: dioralink. Kiểm tra chỉ đọc cho thấy cấu trúc bảng phù hợp; tại thời điểm kiểm tra, platform_commissions, market_orders và khoản hoa hồng dự án đã giải ngân đều có 0 bản ghi.

## Kiểm thử

33/33 ca thuộc phần tài chính và các kiểm tra CI liên quan đã đạt trước phát hành: quyền quản trị, màn hình hiện có, lọc ngày, giá trị hoa hồng riêng từng đơn, tránh đếm trùng ví, trên 200 bản ghi, XSS và tính bất biến dữ liệu thật.

Bộ kiểm thử toàn dự án từng có 9 lỗi không liên quan, đã tái hiện trên bản HEAD gốc b63eea4.

## Bản thử riêng trước đó

Function diorafinance trên Neon đã được tạo trong quá trình làm việc nhưng người dùng xác nhận đó không phải đích sử dụng. Không gắn URL function vào website và không coi function này là bản triển khai hoàn tất cho hai màn hình quản trị. Các file functions/ chỉ phục vụ bản thử riêng đó.

## Xác nhận thu tiền ngày 27/10/2026

Chủ website xác nhận đã thu đủ 20 đơn, tổng 6.000.000 VND. confirmed-receipts.json lưu từng mã nguồn, số tiền và tỷ lệ 10% tại thời điểm xác nhận. Báo cáo hiển thị trạng thái thanh toán thành công và nguồn quản trị xác nhận; dữ liệu gốc được giữ nguyên. Theo công thức được người dùng xác nhận, cột Phí được hưởng bằng giá trị đơn; Đã thu ròng bằng khoản nhận nhân tỷ lệ (tổng 600.000 VND). Phí còn phải thu vẫn dựa trên phí theo tỷ lệ, không lấy giá trị đơn trừ phí đã thu. Khoản đã lưu dưới dạng phí không nhân tỷ lệ lần nữa. Không ghi có ví hoặc tạo đơn trùng trong Neon. File xuất có bảng tài chính tổng hợp và giao dịch tổng hợp cùng số liệu với màn hình.

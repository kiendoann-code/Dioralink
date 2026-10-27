# Đơn hàng mô phỏng 23–27/10/2026

Trang `/demo-orders.html` trình bày 20 đơn marketplace giả lập, tổng giá trị hàng
6.000.000 VND. Dùng đúng ID của 20 tài khoản customer và 5 tài khoản artisan đã tạo.
Tên sản phẩm và trạng thái đã giao hàng đều là mô phỏng. Không có thanh toán hoặc giao hàng thật.

| Ngày mô phỏng | Số đơn | Giá trị hàng mô phỏng |
|---|---:|---:|
| 23/10/2026 | 4 | 900.000 VND |
| 24/10/2026 | 4 | 1.200.000 VND |
| 25/10/2026 | 4 | 1.050.000 VND |
| 26/10/2026 | 4 | 1.350.000 VND |
| 27/10/2026 | 4 | 1.500.000 VND |

## Tách dữ liệu tài chính

Demo lưu trong `demo/orders-20261023-27.json`, không dùng bảng market_orders,
commission, wallet hoặc tồn kho. Không có SQL, migration, seed hay luồng trả tiền.
Ngày mô phỏng nằm ở trường `simulatedRecordedAt`; không sửa created_at thực.
Trang và API luôn hiển thị nhãn demo. Dữ liệu không có mật khẩu, cookie, email hoặc số điện thoại.

## Phân quyền

- API `/api/demo/orders` yêu cầu phiên đăng nhập thật của một trong 25 tài khoản test.
- `/api/admin/demo/orders` yêu cầu quyền quản trị tài chính hiện có.
- Trang admin dùng `/demo-orders.html?view=admin`.
- Trang thông thường chỉ tải dữ liệu sau kiểm tra quyền; không đưa dữ liệu vào HTML công khai.
- Không có API ghi hoặc thao tác chuyển trạng thái. API demo không cache, không index.

## Triển khai

Triển khai cùng phiên bản ứng dụng hiện tại trên nền tảng đang chạy DioraLink.
Không tạo hạ tầng mới, không đổi DNS hoặc kết nối dữ liệu. Chỉ công bố đường dẫn
website chính sau khi xác minh phiên bản mới và kiểm tra truy cập thực tế.

Kiểm tra: `node --test test/demo-orders.test.js`, `npm test`.

Kết quả kiểm tra ngày 27/10/2026: 3 bài kiểm tra riêng của demo đạt, gồm
phân bổ 6 triệu, kiểm tra dữ liệu và quyền truy cập của cả 25 tài khoản.
Bộ kiểm tra chung còn lỗi ở fixture marketplace thiếu `legacy_restore_control`,
ca kiểm tra SEO và kỳ vọng chặn số điện thoại trong wallet; chưa thay đổi các phần đó.
Đã triển khai trang riêng lên `https://dioralink.xyz/demo-orders.html` từ commit `ba2e5e1`.
Kiểm tra thực tế ngày 27/10/2026: trang trả 200, API chưa đăng nhập trả 401;
một tài khoản customer và một artisan đọc được đúng 20 đơn/tổng 6.000.000 VND,
đúng khoảng ngày mô phỏng. Health báo database connected. Đối soát Neon trước/sau:
số đơn market_orders, commission_workflows và dòng diora_ledger đều không đổi.

Vị trí hiển thị hiện tại là trang Tài chính nền tảng `/ung-dung#admin-dashboard`.
Khối “Số liệu tài chính mô phỏng” nằm ở đầu trang, gồm tổng giá trị 6 triệu,
phân bổ 5 ngày và đủ 20 đơn. Các chỉ số thực tế vẫn lấy từ API tài chính riêng.
Đã gỡ khối mô phỏng khỏi trang chủ. Chỉ quản trị được xem khối tài chính demo;
không thêm thao tác xác nhận thanh toán/thu hoa hồng cho các đơn này.
Script giao diện đã đổi phiên bản để trình duyệt tải bản cập nhật.

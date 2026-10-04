# SEO công khai của DioraLink

## URL

- `/`: trang chủ tiếng Việt, HTML dựng sẵn.
- `/dich-vu`: danh mục dịch vụ.
- `/dich-vu/diorama-theo-yeu-cau`, `/dich-vu/mo-hinh-thu-nho`, `/dich-vu/custom-figure`, `/dich-vu/thiet-ke-mo-hinh-3d`.
- `/nghe-nhan`: chỉ liệt kê hồ sơ đã công khai.
- `/nghe-nhan/<slug>`: hồ sơ thật, tên/giới thiệu/chuyên môn/giá tham khảo/ảnh có sẵn trong HTML.
- `/quy-trinh`: quy trình đặt làm và thanh toán trực tiếp.
- `/ung-dung#...`: khu vực ứng dụng cũ, có `noindex`.
- `/robots.txt`, `/sitemap.xml`: văn bản/XML đúng định dạng; sitemap tự cập nhật theo trạng thái hồ sơ.

Link `#home`, `#explore`, `#trust`, `#creator/<id>` cũ được chuyển bằng JavaScript sang URL phù hợp (fragment không được gửi lên máy chủ). Hồ sơ mẫu hoặc bản nháp chỉ có trên thiết bị vẫn mở trong khu vực ứng dụng không lập chỉ mục. Các đường dẫn sai trả HTTP 404, không trả lại trang chủ.

## Công khai hồ sơ thật

Đăng nhập vai trò Nghệ nhân → Portfolio → điền tên, thành phố, giới thiệu ít nhất 30 ký tự, chuyên môn, giá tham khảo và ảnh → **Lưu và công khai**. Có nút **Ẩn hồ sơ**. Thêm/xóa ảnh là chỉnh bản nháp; bấm Lưu và công khai để cập nhật trang công khai.

Backend tự tạo bảng `public_artisan_profiles` khi khởi động; không cần đổi biến môi trường. Slug được giữ nguyên khi đổi tên. Chỉ chủ hồ sơ được ghi hoặc ẩn hồ sơ qua API xác thực. Ảnh tải lên được nén trong trình duyệt, lưu cùng dữ liệu hồ sơ và phục vụ qua URL ảnh riêng. Không công khai email, điện thoại, số tài khoản, QR thanh toán, đánh giá hay trạng thái xác minh do trình duyệt gửi lên.

Dữ liệu nghệ nhân mẫu có sẵn trong ứng dụng không được tự động công khai hoặc đưa vào sitemap. Hồ sơ cũ nằm trong localStorage cần được chủ tài khoản lưu và công khai một lần trên thiết bị đang có dữ liệu. Các luồng chat, yêu cầu, thanh toán và dự án giữ kiến trúc hiện tại; thay đổi SEO này không chuyển toàn bộ dữ liệu ứng dụng sang backend.

Mỗi trang công khai có title, description, canonical, Open Graph và JSON-LD Organization, WebSite, WebPage, BreadcrumbList. Không khai báo Product, đánh giá hoặc giá bán cố định cho dịch vụ báo giá theo brief.

## Kiểm tra

`npm ci` rồi `npm test`. Các bài kiểm tra dùng dữ liệu giả trong bộ nhớ, không ghi vào production. Bao gồm HTTP/status, nội dung không JavaScript, schema, sitemap, quyền công khai, lọc dữ liệu riêng tư, cập nhật ảnh và ẩn hồ sơ. Đã kiểm tra Chromium ở viewport 390 × 844: điều hướng link cũ, mở đăng nhập, tìm nghệ nhân, công khai và ẩn hồ sơ, không có lỗi JavaScript trong các luồng này.

Sau deploy, kiểm tra `/api/health`, `/robots.txt`, `/sitemap.xml`, trang dịch vụ, và URL sai. Với Search Console, chủ website cần đăng nhập tài khoản có quyền quản lý dioralink.xyz, gửi sitemap rồi kiểm tra URL trang chủ và trang dịch vụ. Không thể suy ra trạng thái index từ việc server trả 200 hoặc từ điểm Lighthouse.

## Khôi phục

Revert commit SEO để khôi phục giao diện và định tuyến cũ. Bảng hồ sơ công khai là bổ sung độc lập; không cần xóa bảng khi revert, dữ liệu người dùng được giữ lại.

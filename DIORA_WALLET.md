# Ví Diora và quyền riêng tư người mua — 14/10/2026

## Vận hành

- Menu tài khoản → **Ví Diora**: số dư khả dụng, tiền đang giữ, nạp, rút, lịch sử và xuất CSV.
- Nạp theo mệnh giá 50k, 100k, 200k, 500k, 1m, 2m, 5m. Mỗi yêu cầu có mã riêng và bản chụp thông tin ngân hàng/QR tại lúc tạo. Yêu cầu nạp không tự cộng tiền.
- Admin → **Ví Diora**: đối soát nạp, xác nhận chuyển tiền rút hoặc từ chối có lý do, thay ngân hàng/QR và xuất đối soát nạp. Mã giao dịch ngân hàng không được duyệt trùng.
- QR khởi tạo: ảnh người dùng cung cấp, MB / DOAN TRUNG KIEN / 885098268888. Đây là QR tĩnh; người gửi phải tự nhập đúng số tiền và mã yêu cầu. Không tự kết nối ngân hàng.
- Yêu cầu rút lập tức giữ số dư và tạo thông báo quản trị. Giao diện admin kiểm tra thông báo mới mỗi 5 giây. Admin chỉ đánh dấu đã chuyển sau khi chuyển khoản thực tế.
- Thay ngân hàng tạo phiên bản mới. Yêu cầu cũ giữ tài khoản cũ và vẫn có thể đối soát; không xóa hoặc đổi lịch sử.

## Đơn hàng và commission

- Đơn Marketplace mới có hai lựa chọn: Ví Diora hoặc COD nếu nghệ nhân bật COD. Với Ví Diora, hệ thống giữ tổng tiền sau voucher lúc đặt, hoàn khi khách hủy đơn chờ xác nhận và giải ngân khi khách nhận hàng. COD thu khi nhận hàng và đối soát trước khi hoàn tất. Tiền hàng trừ phí dịch vụ; phí giao hàng được chuyển cùng khoản cho nghệ nhân.
- Dữ liệu đơn COD/chuyển khoản cũ được giữ nguyên. Đơn mới không dùng chuyển khoản trực tiếp cho nghệ nhân vì điều đó có thể tiết lộ danh tính người gửi. Một đơn có thể chứa nhiều sản phẩm cùng nghệ nhân, phí vận chuyển chỉ tính một lần theo mức phí cao nhất trong nhóm.
- Người mua chỉ hiện mã KH theo từng đơn/yêu cầu. Tên, điện thoại, địa chỉ không được gửi về API cho nghệ nhân. Admin xem thông tin nhận hàng và cập nhật vận đơn SPX; không tích hợp API tạo vận đơn SPX tự động.
- Commission mới: khách giữ tiền từng mốc trước khi nghệ nhân bắt đầu. Nghệ nhân gửi bằng chứng; khách nghiệm thu, sau đó xác nhận thanh toán bằng ví. Chuyển tiền và thu phí diễn ra trong cùng giao dịch cơ sở dữ liệu.
- Mốc chưa bắt đầu được hoàn khoản giữ khi dừng. Mốc đang làm/bàn giao cần admin đối soát; admin có thể hoàn hoặc giải ngân với lý do. Khoản đã giải ngân không tự động thu hồi từ ví nghệ nhân.
- Phí commission tính theo tổng ngân sách dự án; phí Marketplace tính theo tiền hàng. Mức phí: 10% <2m; 8% ≤5m; 7% ≤10m; 5% >10m.
- Voucher demo ở trình duyệt không được phép tự làm giảm tiền thật trong ví. Commission mới không áp dụng voucher demo. Marketplace có voucher thật được lưu và xác thực ở máy chủ; phần giảm chỉ lấy từ phí nền tảng, không trừ tiền hàng nghệ nhân. Mỗi khách dùng tối đa một lần/mã, có giới hạn tổng lượt và điều kiện thời gian/giá trị đơn.

## Lọc nội dung

Máy chủ kiểm tra tin nhắn, brief/báo giá, ghi chú milestone, mô tả sản phẩm và trao đổi đơn hàng. Chuẩn hóa Unicode, dấu tiếng Việt, khoảng trắng, dấu phân cách, ký tự ẩn; chặn các từ yêu cầu, link/email và tin nhắn có tổng cộng trên 8 chữ số. Dữ liệu ngân hàng và thông tin giao hàng đi qua trường riêng có phân quyền, không qua bộ lọc chat.

Không có OCR/quét nội dung ảnh, PDF, video, tệp 3D hoặc đọc EXIF; không cam kết chặn toàn bộ lách luật qua tệp, viết số bằng chữ hay chia nội dung thành nhiều tin. Nội dung cũ không bị xóa. Việc ẩn danh được bảo đảm ở các trường dữ liệu tài khoản/đơn do ứng dụng trả về; người dùng vẫn có thể tự tiết lộ danh tính trong nội dung tự do hoặc ngoài nền tảng.

## Toàn vẹn tiền và triển khai

- Bảng mới `diora_*`; số nguyên VND; số dư/tiền giữ không được âm.
- Các thao tác tiền dùng transaction, khóa bản ghi và khóa tài khoản theo thứ tự ổn định. Khóa idempotency cho nạp/rút; mỗi đơn/mốc có duy nhất một khoản giữ. Ghi sổ nối tiếp trong cùng transaction với cập nhật số dư.
- Không có API cho người dùng ghi trực tiếp số dư hoặc tự xác nhận đã nhận tiền. PUT dự án không nhận số tiền, phí hay danh sách thanh toán từ trình duyệt.
- Startup thêm schema và mở rộng constraint phương thức thanh toán Marketplace; không reset user, đơn, dự án hoặc số dư. Giữ bản sao cơ sở dữ liệu trước triển khai như quy trình vận hành thông thường.
- `npm test`: kiểm tra quyền truy cập, số tiền lấy từ máy chủ, mua/rút đồng thời trong fixture PGlite, replay, duyệt nạp trùng, hoàn tiền, bảo mật thông tin khách, luồng mốc, đối soát sổ và schema/ngân hàng sau khởi động lại. Fixture tuần tự hóa kết nối PGlite; không thay thế kiểm thử tải trên PostgreSQL thật.
- Kiểm thử trình duyệt trên dữ liệu giả: màn ví desktop/mobile, modal QR, màn admin, giữ tiền commission. Không dùng tài khoản hay tiền thật để thử.
- Khi quay lui code, không xóa bảng `diora_*` hoặc sổ giao dịch. Nếu đã có giao dịch thật, cần tạm dừng ghi giao dịch và đối soát trước khi đổi phiên bản; không quay lui dữ liệu tài chính tùy tiện.

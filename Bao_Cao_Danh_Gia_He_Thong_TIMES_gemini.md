# Báo Cáo Đánh Giá Phần Mềm T.I.M.E.S

**Đơn vị áp dụng:** Khoa YHCT - PHCN, Bệnh viện Than - Khoáng sản CS2

Qua việc đánh giá cấu trúc hệ thống phần mềm T.I.M.E.S đang được áp dụng, hệ thống có lõi thuật toán rất tư duy và bám sát quy trình thực tế. Tuy nhiên, để phần mềm có thể vận hành ổn định lâu dài và an toàn ở cấp độ môi trường bệnh viện, dưới đây là bản báo cáo chi tiết về các lỗ hổng bảo mật, phần mã thừa thãi cần cấu trúc lại, cũng như các đề xuất nhằm tối ưu hóa thuật toán xếp lịch.

## 1. Các Vấn Đề Về Bảo Mật (Critical)

Lỗ hổng lớn nhất của hệ thống hiện tại nằm ở việc **ủy thác toàn bộ phân quyền cho phía Client (trình duyệt)**.

* **Thiếu xác thực (Authorization) tại Backend:** Hàm `doPost` trong `Code.gs` nhận mọi yêu cầu gọi API, nhưng chỉ kiểm tra tên hành động (`action`) có nằm trong danh sách `ALL_ACTIONS` hay không. Nó hoàn toàn bỏ qua việc kiểm tra xem `sessionId` đó có hợp lệ không, hay người dùng có phải là Admin để thực thi các hàm nhạy cảm như `deleteBenhNhan`, `deleteNhanSu`, hoặc `deleteAccount`.
* **Chỉ bảo mật bề mặt bằng giao diện:** Ở phía giao diện (Frontend), hệ thống lưu trữ `role` và `permissions` của người dùng vào bộ nhớ trình duyệt `localStorage` (`meds_session`), sau đó áp dụng class CSS (`body.read-only-user`) để làm mờ hoặc ẩn các nút bấm. Bất kỳ ai biết đôi chút về kỹ thuật đều có thể nhấn F12, đổi thông tin trong `localStorage` thành Admin hoặc dùng Postman gửi trực tiếp yêu cầu lên Google Apps Script để xóa sạch dữ liệu.
* **Rủi ro từ cơ chế Migration Mật khẩu:** Hàm `verifyLogin` hiện vẫn đang chứa lệnh kiểm tra mật khẩu gốc chưa mã hóa (`hashPasswordPlain`) song song với việc băm mật khẩu `hashPassword(password)`. Dù mục đích là để dễ dàng chuyển đổi hệ thống tài khoản cũ, điều này tạo ra rào cản bảo mật khi kẻ gian có thể đánh chặn mật khẩu thô.

## 2. Các Hàm Trùng Lặp Và Thừa Thãi (Refactoring)

Mã nguồn hiện tại lặp lại khá nhiều "Boilerplate code" (mã rập khuôn), khiến việc bảo trì và nâng cấp trở nên cồng kềnh.

* **Bơm LockService lặp lại:** Các hàm tương tác với cơ sở dữ liệu Google Sheet như `appendRow`, `updateRow`, `deleteRow`, và `clearSheet` lặp lại y hệt cấu trúc lấy khóa an toàn: `LockService.getDocumentLock().waitLock(15000)` cùng khối `try...finally` để giải phóng khóa.
* **Hàm CRUD thủ công (Backend):** Hệ thống viết riêng lẻ các cụm hàm Thêm/Sửa/Xóa cho từng đối tượng (ví dụ: `addMayMoc`, `addThuThuat`, `addNhanSu`, `addPhong`...) với logic ghép mảng và đẩy vào cuối dòng gần như giống hệt nhau. 
* **Hàm vẽ UI lặp lại (Frontend):** Các hàm kết xuất giao diện như `renderMachinesTable_Original`, `renderProceduresTable_Original`, và `renderStaffTable_Original` đều sử dụng chung một vòng lặp `.map((item, i) => ...).join('')` để tạo chuỗi HTML.
* **Hàm `updateNameEverywhere` tốn tài nguyên:** Khi sửa tên nhân sự hoặc phòng ban, hàm này sử dụng `getDataRange().getValues()` quét qua toàn bộ dữ liệu lịch trình (`LichTrinh`) và bệnh nhân (`BenhNhan`) trong vòng lặp lồng nhau O(N × M). Với lượng dữ liệu vài tháng, hàm này sẽ gây đứng hệ thống (Time-out). 

## 3. Đề Xuất Tối Ưu Hóa Thuật Toán Xếp Lịch

Lõi `_turbo_core_logic` kết hợp với thuật toán tối ưu hóa mô phỏng luyện kim (Guided Simulated Annealing) là một điểm sáng. Tuy nhiên, để cải thiện tốc độ và tránh chạm ngưỡng thực thi 6 phút của Google Apps Script, chúng ta có thể áp dụng các kỹ thuật sau:

* **Tối ưu Clone Dữ Liệu (Hạn chế Deep Copy):**
    * **Vấn đề:** Trong hàm `runBestIteration`, vòng lặp Simulated Annealing (tìm láng giềng mới) liên tục gọi `JSON.parse(JSON.stringify(currentPatients))` để sao chép mảng bệnh nhân. 
    * **Đề xuất:** Cần thiết kế lại cấu trúc trạng thái (State Immutable). Ta chỉ cần sao chép các thuộc tính thường xuyên thay đổi (như danh sách `pending` hoặc `busy`), và dùng tham chiếu cho các dữ liệu tĩnh (tên, năm sinh).
* **Sử Dụng Bitmask Cho Khung Thời Gian (Time-Slots):**
    * **Vấn đề:** Hiện tại, thuật toán kiểm tra lịch trống bằng cách lặp qua mảng `staffTimeline` và gọi hàm `is_overlap` so sánh từng đoạn `[start, end]`. Thao tác lặp mảng này tốn rất nhiều chu kỳ CPU.
    * **Đề xuất:** Hãy mã hóa 1440 phút trong một ngày thành mảng bit (hoặc mảng `Uint8Array`). Thay vì dùng vòng lặp, ta có thể dùng phép tính bit `&` để kiểm tra trùng lặp thời gian ở tốc độ O(1).
* **Tham Lam (Greedy) Ở Bước Tiền Xử Lý:**
    * Trước khi chạy vòng lặp đột biến ngẫu nhiên (chức năng `mutate` với thao tác `adjacent swap` hay `2-opt`), hãy tiền xử lý danh sách chờ của bệnh nhân bằng một thuật toán tham lam. Gom nhóm ưu tiên các bệnh nhân cần chạy nhiều thủ thuật trên cùng một loại máy, hoặc chung nhóm `phong` để tăng mật độ phủ kín (packing density) trước khi cho thuật toán Annealing sửa lỗi.

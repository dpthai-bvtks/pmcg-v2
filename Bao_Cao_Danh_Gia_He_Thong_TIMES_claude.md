# BÁO CÁO ĐÁNH GIÁ HỆ THỐNG T.I.M.E.S
### Rà soát mã nguồn `code_gs-v2.txt` (Backend Apps Script) & `index.html` (Frontend)

**Phạm vi:** ~1.850 dòng backend (Google Apps Script) + ~13.900 dòng frontend (HTML/JS thuần)
**Mục tiêu:** Xác định code thừa/trùng lặp, rủi ro bảo mật, và đề xuất tối ưu hoá module xếp lịch (thuật toán lõi của hệ thống).

---

## 1. TỔNG QUAN KIẾN TRÚC

Hệ thống theo mô hình web-app cổ điển của Apps Script:
- **Backend**: một `doPost(e)` duy nhất làm cổng vào (gateway pattern), điều hướng theo `action` qua whitelist 3 tầng (`PUBLIC/USER/ADMIN_ACTIONS`) rồi gọi `this[action].apply()`. Đây là kiến trúc hợp lý cho Apps Script, đóng vai trò như router.
- **Lõi nghiệp vụ**: một discrete-event simulation (`_turbo_core_logic`, ~520 dòng) được bọc trong thuật toán **Simulated Annealing (SA)** để tối ưu thứ tự xếp bệnh nhân.
- **Frontend**: SPA thuần JS, gọi backend qua lớp giả lập `google.script.run` (thực chất là `fetch` tới URL Web App).
- **Đồng bộ real-time**: polling version dựa trên `CacheService`, chu kỳ theo `POLL_INTERVAL`.

Nhìn chung kiến trúc **khá vững** cho quy mô 1 khoa/bệnh viện — vấn đề nằm ở chi tiết triển khai, không phải ở cấu trúc tổng thể.

---

## 2. HÀM TRÙNG LẶP / THỪA THÃI

### 2.1 Đã dọn ở các bản trước (ghi nhận, không cần làm lại)
Các hàm rác đã được loại bỏ thành công trong quá trình làm việc trước đó: `getHistorySchedule`, `initSecurityDatabase`, `layDanhSachVanBan`, `uploadTimRanhData`, cùng 5 action "ma" trong whitelist không có hàm thực thi (`saveSchedule`, `bulkUpdateMayMoc/ThuThuat/NhanSu/Phong`). Hiện whitelist khớp 100% với hàm thực tế.

### 2.2 Còn tồn đọng

**a) `getMarqueeText` / `saveMarqueeText` (dùng `PropertiesService`) song song với `layThongBaoDongChuChay` / `luuThongBaoDongChuChay` (dùng Sheet)**
Hai cặp hàm làm cùng một việc — hiển thị dòng chữ chạy (marquee) — nhưng lưu ở hai nơi khác nhau. Cặp `PropertiesService` hiện chỉ còn tác dụng làm **fallback nội bộ** bên trong cặp Sheet (không phải dead code hoàn toàn), nhưng đây là dấu hiệu của một lần refactor dở dang: hệ thống đã chuyển từ Properties sang Sheet nhưng chưa dọn code cũ.
→ **Đề xuất**: nếu cặp Sheet đã chạy ổn định, xoá hẳn cặp Properties và bỏ luôn `saveMarqueeText` khỏi `ADMIN_ACTIONS` (đang là 1 action thừa, mở thêm 1 bề mặt tấn công không cần thiết).

**b) Trùng lặp logic `t2m`/`m2t` giữa backend và frontend — và đã LỆCH NHAU**
Đây là phát hiện quan trọng nhất ở mục này. Cả 2 file đều tự định nghĩa `t2m()` (chuyển "HH:MM" → số phút) và `m2t()` (ngược lại) — điều này không tránh được vì Apps Script không cho phép chia sẻ module giữa client/server. Nhưng bản chất 2 hàm `t2m` đã **không còn giống nhau**:

| | Backend (`code_gs-v2.txt`) | Frontend (`index.html`) |
|---|---|---|
| Nhận `Date` object | ✅ Có xử lý | ❌ Không xử lý (trả về 0) |
| Chuỗi thập phân kiểu Excel serial (`0.5` = 12:00) | ✅ Có xử lý | ❌ Không xử lý |
| Chuỗi `"7:30"` thiếu số 0 | ✅ Có (split theo khoảng trắng) | ⚠️ Chỉ xử lý đúng định dạng chuẩn |

Hiện tại có thể chưa gây lỗi vì frontend luôn nhận dữ liệu qua `getDisplayValues()` (đã là chuỗi "HH:MM" chuẩn). Nhưng đây là **rủi ro âm ỉ**: bất kỳ ai sửa 1 chỗ lấy dữ liệu thô (`getValues()` thay vì `getDisplayValues()`) mà quên đồng bộ, giờ giấc sẽ ngầm tính sai thành 0 ở phía client mà không có lỗi nào được ném ra.
→ **Đề xuất**: đồng bộ 2 hàm cho giống nhau, hoặc tối thiểu thêm comment chéo giữa 2 file kiểu `// ĐỒNG BỘ VỚI t2m() trong code_gs-v2.txt — sửa 1 bên phải sửa bên kia`.

**c) Comment lạc hậu gây hiểu lầm**
Dòng `// TaiKhoan API missing` ngay phía trên hàm `getAccounts()` — hàm đã tồn tại và hoạt động, comment là tàn dư từ giai đoạn phát triển trước, nên xoá để tránh gây hiểu lầm cho người đọc code sau này (kể cả AI đọc code hộ bạn).

**d) `getSatData()` và `getTimRanhData()` — cùng đọc dữ liệu "khung giờ rảnh" nhưng khác nguồn**
Không phải trùng lặp thật (một dùng cho lịch thứ 7, một dùng cho tìm khung giờ rảnh trong tuần), nhưng tên gọi không nói rõ sự khác biệt này — chỉ cần đổi tên/thêm docstring cho dễ bảo trì, không phải lỗi.

**Kết luận mục 2**: hệ thống hiện **không còn code chết nghiêm trọng**. Vấn đề còn lại chủ yếu là dọn dẹp refactor dở dang (marquee) và rủi ro đồng bộ 2 phía (t2m).

---

## 3. VẤN ĐỀ BẢO MẬT

### 3.1 Nghiêm trọng — cần xử lý sớm

**a) `bulkUpdatePatients` không cập nhật `bumpDataVersion()`**
Không phải lỗ hổng bảo mật thuần tuý nhưng có tác động: các client khác không được thông báo khi có nhập liệu hàng loạt → dễ dẫn đến người dùng thao tác trên dữ liệu đã cũ (data staleness), có thể gây ghi đè nhầm khi 2 người cùng sửa. Đã nêu ở lượt trao đổi trước, nhắc lại vì đây là bug thực tế còn tồn tại.

**b) Cơ chế phân quyền dựa hoàn toàn vào whitelist tĩnh phía server nhưng KHÔNG kiểm tra vai trò (`role`) của người gọi**
Đọc kỹ `doPost`:
```js
if (!ALL_ACTIONS.includes(action)) { throw ... }
if (typeof this[action] !== 'function') { throw ... }
const result = this[action].apply(this, args);
```
`doPost` chỉ kiểm tra **action có tồn tại trong danh sách hay không**, chứ **không kiểm tra người gọi có quyền admin/user hay không**. Việc phân chia `PUBLIC_ACTIONS / USER_ACTIONS / ADMIN_ACTIONS` hiện tại chỉ mang tính **tổ chức code**, không phải **kiểm soát truy cập thật sự** — bất kỳ ai có URL Web App (thường là public hoặc "Anyone with link" theo cấu hình Apps Script mặc định) đều có thể gọi thẳng `saveAccount`, `deleteAccount`, `bulkUpdatePatients`... miễn họ biết tên action, **kể cả khi chưa đăng nhập**, vì phía server không có session/token nào ràng buộc request với kết quả của `verifyLogin`.

Cụ thể: `verifyLogin` chỉ trả về thông tin user cho **frontend tự lưu và tự kiểm tra** (khả năng cao là lưu vào biến JS hoặc `sessionStorage`), nhưng lần gọi `doPost` tiếp theo (VD: `deleteAccount`) **không kèm theo bất kỳ bằng chứng nào** rằng người gọi đã đăng nhập với quyền admin — chỉ cần biết đúng tên action và tham số. Đây là lỗ hổng **Broken Access Control (OWASP A01)** kinh điển.

→ **Đề xuất khắc phục** (theo mức độ công sức tăng dần):
1. Tối thiểu: mỗi request gửi kèm `sessionToken` (chuỗi random được cấp lúc `verifyLogin` thành công, lưu trong 1 sheet `Sessions` hoặc `CacheService` với TTL), `doPost` phải `validateSession(token)` lấy ra role thật trước khi cho gọi `ADMIN_ACTIONS`.
2. Tốt hơn: dùng `Session.getActiveUser()` của Apps Script nếu Web App được deploy dưới quyền "Execute as: User accessing" + giới hạn domain Google Workspace nội bộ bệnh viện — khi đó Apps Script tự xác thực danh tính, không cần tự chế cơ chế login.
3. Bổ sung kiểm tra role ngay trong `doPost`, ví dụ:
```js
function doPost(e) {
  const action = e.parameter.action;
  const session = validateSession(e.parameter.token); // trả về {role, username} hoặc null
  if (ADMIN_ACTIONS.includes(action) && (!session || session.role !== 'admin')) {
    throw new Error("Không có quyền thực hiện hành động này.");
  }
  if (USER_ACTIONS.includes(action) && !session) {
    throw new Error("Vui lòng đăng nhập.");
  }
  ...
}
```
Đây là điểm bảo mật quan trọng nhất cần vá — nếu URL Web App hiện đang public, bất kỳ ai có link đều có thể xoá tài khoản, sửa dữ liệu bệnh nhân mà không cần đăng nhập.

**c) `getAccounts()` trả nguyên `pass` (password hash) về client**
```js
function getAccounts() { return getAllData('TaiKhoan').map(r => ({ id: r[0], user: r[1], pass: r[2], role: r[3], perms: r[4] })); }
```
Kể cả khi đã hash + pepper, **không có lý do gì để gửi hash mật khẩu về trình duyệt** — hash lộ ra là mở đường cho tấn công offline brute-force/rainbow table, đặc biệt nguy hiểm nếu nhân viên dùng lại mật khẩu này ở hệ thống khác. Trường `pass` chỉ nên tồn tại phía server.
→ **Đề xuất**: bỏ hẳn field `pass` khỏi response của `getAccounts()`. Nếu frontend cần hiển thị "đã đặt mật khẩu hay chưa", trả về boolean thay vì hash thật.

### 3.2 Trung bình

**d) `verifyLogin` không có cơ chế chống brute-force / rate-limit**
Không giới hạn số lần thử sai, không delay tăng dần, không khoá tài khoản tạm thời. Với whitelist public action, ai cũng gọi `verifyLogin` liên tục để dò mật khẩu.
→ **Đề xuất**: đếm số lần sai liên tiếp theo username (lưu trong `CacheService`, TTL 15 phút), sau 5 lần sai thì tạm khoá.

**e) `PASSWORD_PEPPER` là hằng số **hardcode ngay trong mã nguồn**
Đây là điểm cải thiện tốt so với trước (đã dùng), nhưng bản thân việc để "bí mật" (secret) trực tiếp trong code là chưa chuẩn — nếu file Apps Script từng được chia sẻ dạng "view code"/export cho ai đó (kể cả để làm việc với AI như phiên hiện tại), pepper bị lộ hoàn toàn, mất tác dụng bảo vệ.
→ **Đề xuất**: chuyển `PASSWORD_PEPPER` sang `PropertiesService.getScriptProperties()` (giống cách đang làm với `CHOT_SO_TIME`), không hardcode trong file `.gs`.

**f) Không có giới hạn kích thước / kiểu dữ liệu đầu vào cho các hàm ghi (add/edit)**
VD `addBenhNhan`, `bulkUpdatePatients` nhận thẳng tham số từ `args` (JSON do client gửi lên) và ghi thẳng vào sheet, không có validate độ dài chuỗi, không escape ký tự đặc biệt (dù Sheets tự escape khi hiển thị nên rủi ro XSS thấp hơn, nhưng vẫn nên validate để tránh dữ liệu rác/rất dài làm hỏng layout Sheet hoặc vượt quota).

**g) `doGet` phục vụ trang tĩnh qua `?page=` không whitelist chặt**
```js
const page = e?.parameter?.page;
if (page && pages[page]) { ... }
```
Chỗ này thực ra **đã an toàn** vì có kiểm tra `pages[page]` tồn tại mới render (không có path traversal) — ghi nhận đây là điểm code đã làm đúng, không phải lỗi.

### 3.3 Thấp / mang tính phòng ngừa

**h) Không log lại ai đã thực hiện thao tác ghi (audit trail)**
Các hàm `deleteBenhNhan`, `deleteAccount`, `bulkUpdatePatients(replaceAll=true)` (xoá sạch danh sách bệnh nhân!) đều không ghi nhận **ai** đã bấm, **lúc nào**. Với hệ thống y tế, đây là rủi ro về truy vết trách nhiệm (accountability) khi có sự cố dữ liệu.
→ **Đề xuất**: thêm 1 sheet `AuditLog` (timestamp, username, action, tham số rút gọn), ghi log ở đúng 1 điểm duy nhất — ví dụ ngay trong `doPost` sau khi biết `session.username`, để không phải sửa từng hàm.

---

## 4. TỐI ƯU HOÁ HÀM XẾP LỊCH (`_turbo_core_logic` + `runBestIteration`)

Đây là phần lõi giá trị nhất của hệ thống nên đáng đầu tư thời gian nhất. Thuật toán hiện tại: **Simulated Annealing** bọc quanh 1 **discrete-event greedy simulation**, cấu hình:
```
T = 10.0, T_min = 0.3, alpha = 0.88, dừng sớm khi noImprove ≥ 20
+ 8 lần random-restart bổ sung sau khi SA kết thúc
```

Ước tính: vòng lặp SA chạy tối đa **~27-28 lần** (từ T=10 giảm dần theo alpha=0.88 tới khi < 0.3), cộng thêm 8 lần restart → khoảng **35-36 lần gọi `_turbo_core_logic` cho mỗi lượt xếp lịch**. Mỗi lần gọi là 1 lượt mô phỏng toàn bộ ngày làm việc từ đầu.

### 4.1 Điểm nghẽn hiệu năng đã xác định

**a) `getNextEvent()` quét toàn bộ timeline mỗi lần tìm "mốc thời gian kế tiếp"**
```js
function getNextEvent(tNow, patients, staffTimeline, machineTimeline, endOfDay) {
  patients.forEach(...)                                    // O(P)
  Object.values(staffTimeline).forEach(tl => tl.forEach(...))   // O(S × slots)
  Object.values(machineTimeline).forEach(tl => tl.forEach(...)) // O(M × slots)
  ...
}
```
Đây là **event-driven simulation** cổ điển nhưng đang cài đặt kiểu "quét lại từ đầu" mỗi tick thay vì dùng **priority queue / min-heap** cho các mốc thời gian. Với mỗi bước thời gian tiến lên, hàm này duyệt lại toàn bộ nhân sự + toàn bộ máy + toàn bộ bệnh nhân — độ phức tạp tổng thể xấp xỉ **O(số_events × (P + S×slots + M×slots))**, và bị nhân thêm **35-36 lần** bởi vòng lặp SA bên ngoài.

→ **Đề xuất cụ thể**: thay bằng 1 min-heap (hoặc mảng đã sort + con trỏ) chứa các mốc thời gian "kết thúc" sắp tới của từng nhân sự/máy/bệnh nhân đang bận. Mỗi khi 1 slot mới được thêm (`blockStaff`, đặt máy, đặt giường), chỉ cần `heap.push(end_time)` — O(log n) — thay vì quét lại toàn bộ. Việc này giúp giảm độ phức tạp từ gần O(n²) xuống O(n log n) cho riêng bước tìm mốc sự kiện, vốn được gọi rất nhiều lần trong 1 lượt mô phỏng.

**b) `mergeTimeline()` sort lại toàn bộ mảng mỗi lần có 1 slot mới**
`blockStaff()` gọi `mergeTimeline` sau **mỗi lần đặt lịch cho 1 nhân sự** — tức là sort lại O(k log k) trên timeline hiện có của người đó, dù chỉ thêm 1 phần tử mới. Vì timeline vốn đã sorted trước đó (do lần merge trước), chỉ cần **chèn đúng vị trí bằng binary search + merge cục bộ tại điểm chèn** (O(k) hoặc O(log k) thay vì O(k log k)).
→ Với quy mô hiện tại (vài chục nhân sự, timeline mỗi người dài vài chục phần tử/ngày) mức lợi thực tế không lớn, nhưng nếu tương lai mở rộng nhiều khoa/nhiều bác sĩ cùng lúc, đây là chỗ dễ trở thành nút thắt.

**c) Deep-clone bằng `JSON.parse(JSON.stringify(...))` lặp lại rất nhiều lần**
Xuất hiện ở `mutate()`, `runBestIteration()` (2 chỗ), và bên trong `_turbo_core_logic` khi copy `patients`. Đây là cách clone chậm nhất trong JS (phải serialize rồi parse lại toàn bộ cây object) — với ~36 lần gọi mô phỏng/lượt xếp lịch, tổng chi phí clone cộng dồn không nhỏ, đặc biệt khi số bệnh nhân/thủ thuật tăng.
→ **Đề xuất**: viết 1 hàm `cloneMinimal(patients)` chỉ copy đúng những field thật sự bị `mutate()` thay đổi (thứ tự `patients` và `pending` — đều là mảng nông, không cần deep-clone object `patient` bên trong nếu các trường khác không bị sửa trong quá trình mô phỏng). Việc giảm từ deep-clone sang shallow-clone có chọn lọc thường nhanh hơn 5-10 lần trong benchmark JS thông thường.

**d) Vòng lặp "8 lần random-restart" luôn deep-clone lại `db.rawPatients` từ đầu — có thể chạy song song về mặt logic nhưng Apps Script đơn luồng nên không tận dụng được**
Không phải vấn đề có thể tối ưu trong Apps Script (không có Worker/thread), nhưng đáng cân nhắc: **8 lần restart có thực sự cần thiết không**, hay có thể giảm xuống 4-5 lần và bù lại bằng việc nới `T_min` (chạy SA sâu hơn) — cần benchmark thực tế trên dữ liệu ngày đông nhất để quyết định, không nên đoán suông.

### 4.2 Đề xuất cải tiến thuật toán (không chỉ hiệu năng, mà chất lượng lịch xếp)

**e) SA hiện tại dùng `alpha = 0.88` cố định (cooling schedule tuyến tính theo cấp số nhân) — có thể thêm "reheat"**
Khi thuật toán rơi vào local optimum sớm (nhiều `noImprove` liên tiếp nhưng `T` vẫn còn cao), có thể thêm cơ chế **reheat**: nếu `noImprove` đạt ngưỡng (VD 10) mà `T` chưa xuống `T_min`, tăng `T` lên tạm thời (VD `T = T * 1.5`) để thoát local optimum, rồi tiếp tục giảm nhiệt. Đây là kỹ thuật "Simulated Annealing with Reheating" khá chuẩn, cải thiện chất lượng nghiệm mà không tốn thêm nhiều thời gian tính.

**f) Seed cố định `createSeededRandom(42)` cho vòng SA chính**
```js
let rand = createSeededRandom(42);
```
Seed cố định giúp **kết quả tái lập được (deterministic)** — điều này tốt cho việc debug/kiểm chứng, nhưng đồng nghĩa **luôn khám phá đúng 1 đường đi trong không gian nghiệm** dù chạy lại bao nhiêu lần cũng ra cùng kết quả cho cùng input. Kết hợp với 8 lần restart dùng seed `100+i` (biến thiên) thì phần restart có đa dạng hoá, nhưng phần SA chính thì không.
→ **Đề xuất**: nếu muốn tăng chất lượng nghiệm mà không đổi kiến trúc, có thể chạy **nhiều lượt SA độc lập với seed khác nhau** (thay vì 1 lượt SA + 8 lượt random thuần) rồi lấy kết quả tốt nhất — về bản chất là "SA đa khởi động" (multi-start SA), thường cho kết quả ổn định hơn single-run SA + random restart.

**g) Hàm tính điểm (`score`) không thấy xuất hiện tường minh trong đoạn đã đọc — nên tách riêng thành 1 hàm `calculateScore(sched, rot)` độc lập, có docstring liệt kê rõ trọng số từng tiêu chí**
Việc này không ảnh hưởng hiệu năng nhưng ảnh hưởng khả năng bảo trì: khi cần chỉnh "ưu tiên xếp bệnh nhân già trước" hay "giảm phạt khi máy hiếm bị trống", người sau (hoặc chính bạn 6 tháng sau) cần thấy ngay công thức tính điểm ở 1 chỗ duy nhất, không phải dò trong luồng mô phỏng 500 dòng.

**h) Cache `buildBaseDb()` giữa các lần gọi `runScheduling` trong cùng 1 phiên nếu danh mục (máy/nhân sự/thủ thuật/phòng) chưa đổi**
Hiện `buildBaseDb()` đọc lại toàn bộ 4 sheet danh mục (`DanhSachMay`, `NhanSu`, `ThuThuat`, `PhongThuThuat`) mỗi lần xếp lịch — với cơ chế `bumpDataVersion()` đã có sẵn, hoàn toàn có thể cache `db` (không phải `rawPatients`, chỉ phần danh mục tĩnh) trong `CacheService` kèm theo `dataVersion`, chỉ build lại khi version đổi. Việc này giảm số lượt gọi Sheets API (vốn có quota và độ trễ mạng đáng kể trong Apps Script) ở những lần bấm "Xếp lại lịch" liên tiếp trong cùng ngày làm việc.

---

## 5. TỔNG HỢP ƯU TIÊN HÀNH ĐỘNG

| Ưu tiên | Vấn đề | Loại | Công sức ước tính |
|---|---|---|---|
| 🔴 Cao | `doPost` không kiểm tra quyền theo session, chỉ theo whitelist action | Bảo mật | Trung bình (cần thêm cơ chế session) |
| 🔴 Cao | `getAccounts()` trả về `pass` (hash) cho client | Bảo mật | Thấp (xoá 1 field) |
| 🟠 Trung bình | `bulkUpdatePatients` thiếu `bumpDataVersion()` | Bug đồng bộ | Rất thấp |
| 🟠 Trung bình | `verifyLogin` không chống brute-force | Bảo mật | Thấp-Trung bình |
| 🟠 Trung bình | `PASSWORD_PEPPER` hardcode trong code | Bảo mật | Rất thấp |
| 🟡 Thấp | `t2m` lệch nhau giữa client/server | Bug tiềm ẩn | Thấp |
| 🟡 Thấp | Cặp hàm marquee trùng lặp | Dọn code | Rất thấp |
| 🟢 Cải tiến | `getNextEvent`/`mergeTimeline` dùng scan tuyến tính | Hiệu năng | Trung bình-Cao |
| 🟢 Cải tiến | Deep-clone bằng JSON.stringify | Hiệu năng | Trung bình |
| 🟢 Cải tiến | Cache `buildBaseDb()` theo `dataVersion` | Hiệu năng | Thấp-Trung bình |
| 🟢 Cải tiến | Thêm reheat cho SA, tách `calculateScore` riêng | Chất lượng thuật toán | Trung bình |
| 🔵 Nên có | Audit log cho thao tác xoá/ghi đè hàng loạt | Vận hành | Thấp-Trung bình |

**Gợi ý thứ tự làm**: xử lý 2 mục 🔴 trước tiên (đây là lỗ hổng có thể bị khai thác ngay nếu URL Web App không hoàn toàn kín), sau đó dọn các mục 🟠/🟡 (nhanh, ít rủi ro), rồi mới đầu tư vào tối ưu hiệu năng thuật toán xếp lịch (mục 4) — vì phần này tuy giá trị dài hạn cao nhưng cần test kỹ (thay đổi thuật toán lõi ảnh hưởng trực tiếp đến chất lượng lịch xếp thực tế cho bệnh nhân).

---

*Lưu ý: báo cáo dựa trên đọc tĩnh mã nguồn (static review), chưa chạy thử/benchmark thực tế. Các con số ước tính độ phức tạp (35-36 lượt mô phỏng, v.v.) là suy ra từ tham số thuật toán, nên kiểm chứng lại bằng cách đo thời gian chạy thực tế (`Logger.log(new Date())` trước/sau `runBestIteration`) trước khi đầu tư công sức tái cấu trúc phần hiệu năng.*

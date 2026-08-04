# Project Rules for AI Assistants

1. **Auto-Backup & Version Control**: Sau mỗi lần hoàn thành một yêu cầu thay đổi hoặc chỉnh sửa code, bắt buộc phải thực hiện các lệnh Git để đẩy (push) code mới nhất lên nhánh `main` của repository Github: `https://github.com/dpthai-bvtks/pmcg-v2`. Việc đẩy code phải bao gồm:
   - Cập nhật `index.html` (frontend)
   - Cập nhật `code.gs` (backend apps script)
   - (Nếu có) Cập nhật bất kỳ file `.js`, `.css`, hoặc tài liệu liên quan.

2. **Chat Log Archiving**: Sau mỗi phiên làm việc, bắt buộc phải lưu tóm tắt cuộc trò chuyện (bao gồm yêu cầu của user, nguyên nhân lỗi và giải pháp đã thực hiện) vào cuối file `PM-xeplich.md`.
3. **Cleanup**: Sau khi hoàn thành yêu cầu, bắt buộc phải xóa các file tạm dùng để test cú pháp trong quá trình debug.

*Đây là bộ quy tắc bắt buộc áp dụng cho mọi tương tác trong tương lai đối với project này.*

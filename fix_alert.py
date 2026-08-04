import os
import re

filepath = 'index.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        window.alert = function (message) {
            const m = String(message).toLowerCase();
            const [type, title] =
                (m.includes('lỗi') || m.includes('thất bại')) ? ['error', 'LỖI HỆ THỐNG'] :
                    (m.includes('thành công') || m.includes('xong')) ? ['success', 'THÀNH CÔNG'] :
                        (m.includes('vui lòng') || m.includes('chưa')) ? ['warning', 'LƯU Ý'] :
                            ['info', 'THÔNG BÁO'];
            (typeof showThongBao === 'function') ? showThongBao(title, message, type) : console.log(message);
        };'''

replacement = '''        window.alert = function (message) {
            const m = String(message).toLowerCase();
            const [type, title] =
                (m.includes('lỗi') || m.includes('thất bại')) ? ['error', 'LỖI HỆ THỐNG'] :
                    (m.includes('thành công') || m.includes('xong')) ? ['success', 'THÀNH CÔNG'] :
                        (m.includes('vui lòng') || m.includes('chưa')) ? ['warning', 'LƯU Ý'] :
                            ['info', 'THÔNG BÁO'];
            
            if (typeof showCustomAlert === 'function') {
                let icon = '💡', color = '#3498db';
                if (type === 'error') { icon = '🛑'; color = '#e74c3c'; }
                else if (type === 'success') { icon = '✅'; color = '#27ae60'; }
                else if (type === 'warning') { icon = '⚠️'; color = '#f39c12'; }
                
                showCustomAlert(title, message, icon, color);
            } else if (typeof showThongBao === 'function') {
                showThongBao(title, message, type);
            } else {
                console.log(message);
            }
        };'''

new_content = content.replace(target, replacement)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replaced:", target in content)

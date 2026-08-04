import os

filepath = 'index.html'
with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

target = '''                            function xepLichSat() {

                            window.viewingImportedScheduleFile = false;

                            const payload = getSatPayload();'''

replacement = '''                            function xepLichSat() {
                            const dateVal = document.getElementById('sat-schedule-date').value;
                            if (!dateVal) return alert("Vui lòng chọn Ngày làm việc Thứ 7 trước!");

                            window.viewingImportedScheduleFile = false;

                            const payload = getSatPayload();'''

new_content = content.replace(target, replacement)

# also remove the old date check
target2 = '''                            const dateVal = document.getElementById('sat-schedule-date').value;

                            if (!dateVal) return alert("Vui lòng chọn Ngày làm việc Thứ 7 trước!");'''

# since we don't know the exact encoding of the original alert, we can use regex to find and remove it
import re
new_content = re.sub(r"const dateVal = document\.getElementById\('sat-schedule-date'\)\.value;\s*if \(!dateVal\) return alert\([^\)]+\);", "", new_content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done")

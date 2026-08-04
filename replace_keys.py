
import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove inline onkeydown from busy-staff-from
content = re.sub(
    r'<input type=\x22text\x22 id=\x22busy-staff-from\x22 onfocus=\x22lastBusyContext=\x27staff\x27\x22\s+onkeydown=\x22if\(event\.key === \x27Enter\x27\) \{ saveStaffBusy\(\); setTimeout\(\(\) => document\.getElementById\(\x27busy-staff-select\x27\)\.focus\(\), 300\); \}\x22',
    '<input type=\x22text\x22 id=\x22busy-staff-from\x22 onfocus=\x22lastBusyContext=\x27staff\x27\x22',
    content, count=1
)

# Remove inline onkeydown from busy-pat-from
content = re.sub(
    r'<input type=\x22text\x22 id=\x22busy-pat-from\x22 onfocus=\x22lastBusyContext=\x27pat\x27\x22\s+onkeydown=\x22if\(event\.key === \x27Enter\x27\) \{ savePatBusy\(\); setTimeout\(\(\) => document\.getElementById\(\x27busy-pat-input\x27\)\.focus\(\), 300\); \}\x22',
    '<input type=\x22text\x22 id=\x22busy-pat-from\x22 onfocus=\x22lastBusyContext=\x27pat\x27\x22',
    content, count=1
)

# Wrap saveStaffBusy in withLock
content = re.sub(
    r'function saveStaffBusy\(\) \{',
    'const saveStaffBusy = withLock(function () {',
    content, count=1
)
content = re.sub(
    r'(const saveStaffBusy = withLock\(function \(\) \{.*?)(\n\s*\})(\n\s*function deleteSingleStaffBusy)',
    r'\1\n        });\3',
    content, flags=re.DOTALL, count=1
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')


import re
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

bad_css = '''
        .admin-nav-btn:hover {
            background: #e0e6ed !important;
        }
</style>'''
content = content.replace(bad_css, '</style>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content.replace('</head>', '<style>.admin-nav-btn:hover { background: #e0e6ed !important; }</style></head>'))

print('Fixed')

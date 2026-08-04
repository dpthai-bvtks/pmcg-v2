
const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const s1 = '<input type=\"text\" id=\"busy-staff-from\" onfocus=\"lastBusyContext=\'staff\'\"';
const r1 = '<input type=\"text\" id=\"busy-staff-from\" onfocus=\"lastBusyContext=\'staff\'\"\n                                    onkeydown=\"if(event.key === \'Enter\') { saveStaffBusy(); setTimeout(() => document.getElementById(\'busy-staff-select\').focus(), 300); }\"';

const s2 = '<input type=\"text\" id=\"busy-pat-from\" onfocus=\"lastBusyContext=\'pat\'\" class=\"time-input\"';
const r2 = '<input type=\"text\" id=\"busy-pat-from\" onfocus=\"lastBusyContext=\'pat\'\"\n                                    onkeydown=\"if(event.key === \'Enter\') { savePatBusy(); setTimeout(() => document.getElementById(\'busy-pat-input\').focus(), 300); }\"\n                                    class=\"time-input\"';

html = html.replace(s1, r1);
html = html.replace(s2, r2);

fs.writeFileSync('index.html', html);


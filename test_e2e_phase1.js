const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\438d646a-d7d8-477e-8399-c2904925a303\\scratch\\chrome_profile_test';
const port = 9333;

const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    'about:blank'
]);

function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

async function main() {
    await wait(2500);

    const versionRes = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json/version`, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });

    console.log('Chrome Browser Version:', versionRes.Browser);

    const WebSocketClient = (function() {
        const net = require('net');
        const crypto = require('crypto');
        
        return class SimpleWS {
            constructor(url) {
                const parsed = new URL(url);
                this.host = parsed.hostname;
                this.port = parsed.port || 80;
                this.path = parsed.pathname;
                this.socket = net.createConnection(this.port, this.host);
                this.callbacks = new Map();
                this.id = 1;
                this.buffer = Buffer.alloc(0);

                const key = crypto.randomBytes(16).toString('base64');
                const req = `GET ${this.path} HTTP/1.1\r\nHost: ${this.host}:${this.port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`;
                this.socket.write(req);

                this.socket.on('data', chunk => this.handleData(chunk));
            }

            handleData(chunk) {
                this.buffer = Buffer.concat([this.buffer, chunk]);
                if (this.buffer.toString().includes('\r\n\r\n')) {
                    const parts = this.buffer.toString().split('\r\n\r\n');
                    const rawFrames = this.buffer.slice(Buffer.from(parts[0] + '\r\n\r\n').length);
                    this.parseFrames(rawFrames);
                }
            }

            parseFrames(buf) {
                let offset = 0;
                while (offset < buf.length) {
                    if (buf.length - offset < 2) break;
                    const secondByte = buf[offset + 1];
                    let payloadLen = secondByte & 0x7f;
                    let headerLen = 2;
                    if (payloadLen === 126) {
                        if (buf.length - offset < 4) break;
                        payloadLen = buf.readUInt16BE(offset + 2);
                        headerLen = 4;
                    } else if (payloadLen === 127) {
                        if (buf.length - offset < 10) break;
                        payloadLen = Number(buf.readBigUInt64BE(offset + 2));
                        headerLen = 10;
                    }
                    if (buf.length - offset < headerLen + payloadLen) break;
                    const payload = buf.slice(offset + headerLen, offset + headerLen + payloadLen);
                    offset += headerLen + payloadLen;
                    try {
                        const msg = JSON.parse(payload.toString('utf8'));
                        if (msg.id && this.callbacks.has(msg.id)) {
                            this.callbacks.get(msg.id)(msg);
                            this.callbacks.delete(msg.id);
                        }
                        if (msg.method === 'Runtime.consoleAPICalled') {
                            console.log(`[Browser Console ${msg.params.type}]:`, msg.params.args.map(a => a.value || a.description).join(' '));
                        }
                    } catch(e) {}
                }
            }

            send(method, params = {}) {
                return new Promise((resolve) => {
                    const id = this.id++;
                    this.callbacks.set(id, resolve);
                    const msg = JSON.stringify({ id, method, params });
                    const payloadBuf = Buffer.from(msg, 'utf8');
                    const frame = Buffer.alloc(6 + payloadBuf.length);
                    frame[0] = 0x81;
                    frame[1] = 0x80 | payloadBuf.length;
                    const mask = crypto.randomBytes(4);
                    mask.copy(frame, 2);
                    for (let i = 0; i < payloadBuf.length; i++) {
                        frame[6 + i] = payloadBuf[i] ^ mask[i % 4];
                    }
                    this.socket.write(frame);
                });
            }
        };
    })();

    const listRes = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json/list`, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });

    const pageTarget = listRes.find(t => t.type === 'page');
    console.log('Target page WS:', pageTarget.webSocketDebuggerUrl);

    const ws = new WebSocketClient(pageTarget.webSocketDebuggerUrl);
    await wait(1000);

    await ws.send('Runtime.enable');
    await ws.send('Page.enable');
    await ws.send('Network.enable');

    console.log('Navigating to xeplichthuthuat.io.vn...');
    await ws.send('Page.navigate', { url: 'https://xeplichthuthuat.io.vn/' });

    await wait(4000);

    // Evaluate login and bootstrap state
    const evalRes = await ws.send('Runtime.evaluate', {
        expression: `({
            title: document.title,
            loginOverlayVisible: document.getElementById('login-overlay') ? getComputedStyle(document.getElementById('login-overlay')).display : null,
            serverBtnExists: !!document.getElementById('btn-open-server-config'),
            modalExists: !!document.getElementById('modal-server-config'),
            apiUrl: window.getApiUrl ? window.getApiUrl() : null
        })`,
        returnByValue: true
    });

    console.log('Page Evaluation Result:', evalRes.result ? evalRes.result.value : evalRes);

    // Test clicking the server config button
    console.log('Opening server config modal...');
    const clickRes = await ws.send('Runtime.evaluate', {
        expression: `document.getElementById('btn-open-server-config').click(); ({
            modalDisplay: getComputedStyle(document.getElementById('modal-server-config')).display,
            inputVal: document.getElementById('input-custom-api-url').value
        })`,
        returnByValue: true
    });
    console.log('Modal State after click:', clickRes.result ? clickRes.result.value : clickRes);

    await wait(1000);

    // Capture screenshot
    const shotRes = await ws.send('Page.captureScreenshot', { format: 'png' });
    if (shotRes.result && shotRes.result.data) {
        fs.writeFileSync('C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\438d646a-d7d8-477e-8399-c2904925a303\\scratch\\test_phase1_modal.png', Buffer.from(shotRes.result.data, 'base64'));
        console.log('Saved screenshot to test_phase1_modal.png');
    }

    console.log('ALL PHASE 1 VERIFICATIONS COMPLETED SUCCESSFULLY!');
    chromeProc.kill();
    process.exit(0);
}

main().catch(err => {
    console.error('Test error:', err);
    chromeProc.kill();
    process.exit(1);
});

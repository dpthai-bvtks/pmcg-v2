const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\438d646a-d7d8-477e-8399-c2904925a303\\scratch\\chrome_test_modal';
const port = 9444;

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
    await wait(2000);

    const versionRes = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json/version`, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });

    const net = require('net');
    const crypto = require('crypto');

    class SimpleWS {
        constructor(url) {
            const parsed = new URL(url);
            this.socket = net.createConnection(parsed.port || 80, parsed.hostname);
            this.callbacks = new Map();
            this.id = 1;
            this.buffer = Buffer.alloc(0);

            const key = crypto.randomBytes(16).toString('base64');
            const req = `GET ${parsed.pathname} HTTP/1.1\r\nHost: ${parsed.hostname}:${parsed.port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`;
            this.socket.write(req);
            this.socket.on('data', chunk => this.handleData(chunk));
        }

        handleData(chunk) {
            this.buffer = Buffer.concat([this.buffer, chunk]);
            if (this.buffer.toString().includes('\r\n\r\n')) {
                const parts = this.buffer.toString().split('\r\n\r\n');
                const rawFrames = this.buffer.slice(Buffer.from(parts[0] + '\r\n\r\n').length);
                let offset = 0;
                while (offset < rawFrames.length) {
                    if (rawFrames.length - offset < 2) break;
                    let payloadLen = rawFrames[offset + 1] & 0x7f;
                    let headerLen = 2;
                    if (payloadLen === 126) {
                        if (rawFrames.length - offset < 4) break;
                        payloadLen = rawFrames.readUInt16BE(offset + 2);
                        headerLen = 4;
                    } else if (payloadLen === 127) {
                        if (rawFrames.length - offset < 10) break;
                        payloadLen = Number(rawFrames.readBigUInt64BE(offset + 2));
                        headerLen = 10;
                    }
                    if (rawFrames.length - offset < headerLen + payloadLen) break;
                    const payload = rawFrames.slice(offset + headerLen, offset + headerLen + payloadLen);
                    offset += headerLen + payloadLen;
                    try {
                        const msg = JSON.parse(payload.toString('utf8'));
                        if (msg.id && this.callbacks.has(msg.id)) {
                            this.callbacks.get(msg.id)(msg);
                            this.callbacks.delete(msg.id);
                        }
                    } catch(e) {}
                }
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
    }

    const listRes = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json/list`, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });

    const pageTarget = listRes.find(t => t.type === 'page');
    const ws = new SimpleWS(pageTarget.webSocketDebuggerUrl);
    await wait(1000);

    await ws.send('Runtime.enable');
    await ws.send('Page.enable');

    await ws.send('Page.navigate', { url: 'https://xeplichthuthuat.io.vn/' });
    await wait(5000);

    // Click config button
    await ws.send('Runtime.evaluate', {
        expression: `if (document.getElementById('btn-open-server-config')) document.getElementById('btn-open-server-config').click();`
    });

    await wait(1000);

    const shotRes = await ws.send('Page.captureScreenshot', { format: 'png' });
    if (shotRes.result && shotRes.result.data) {
        fs.writeFileSync('C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\438d646a-d7d8-477e-8399-c2904925a303\\phase1_modal_success.png', Buffer.from(shotRes.result.data, 'base64'));
        console.log('SUCCESS: Saved phase1_modal_success.png!');
    }

    chromeProc.kill();
}

main().then(() => process.exit(0)).catch(e => { console.error(e); chromeProc.kill(); process.exit(1); });

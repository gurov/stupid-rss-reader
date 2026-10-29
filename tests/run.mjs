// Opens the test pages in headless Chrome and prints the results. Node 22+, no
// packages: Chrome is driven over the DevTools protocol with the built-in WebSocket.
// Started by tests/run.sh, which also serves the files and the evil proxy.
//
//   node tests/run.mjs http://127.0.0.1:4201/tests/index.html http://127.0.0.1:4201/tests/no-csp.html

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pages = process.argv.slice(2);
const chromeBinary = process.env.CHROME || 'google-chrome';
const profile = mkdtempSync(join(tmpdir(), 'srr-tests-'));
const port = 9300 + Math.floor(Math.random() * 600);
const chrome = spawn(chromeBinary, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connect() {
    for (let i = 0; i < 50; i++) {
        try {
            const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
            const page = targets.find((t) => t.type === 'page');
            if (page) {
                return page.webSocketDebuggerUrl;
            }
        } catch {
            // Chrome is still starting
        }
        await sleep(200);
    }
    throw new Error(`Chrome did not start (${chromeBinary})`);
}

const socket = new WebSocket(await connect());
await new Promise((resolve) => socket.addEventListener('open', resolve));
let lastId = 0;
const pending = new Map();
const exceptions = [];
socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
        pending.get(message.id)(message);
        pending.delete(message.id);
    } else if (message.method === 'Runtime.exceptionThrown') {
        const details = message.params.exceptionDetails;
        exceptions.push(`${details.exception?.description || details.text} (${details.url}:${details.lineNumber})`);
    }
});
const send = (method, params = {}) => new Promise((resolve) => {
    const id = ++lastId;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;

let failed = false;
try {
    await send('Runtime.enable');
    for (const url of pages) {
        exceptions.length = 0;
        await send('Page.navigate', { url });
        let done = false;
        for (let i = 0; i < 240 && !done; i++) {
            await sleep(250);
            done = await evaluate("document.body?.dataset.done === '1'");
        }
        const lines = (await evaluate("[...document.querySelectorAll('#results div')].map((d) => d.textContent)")) || [];
        const name = url.split('/').pop();
        const result = lines.at(-1) || 'no result';
        console.log(`${name}: ${done ? result : `did not finish (${result})`}`);
        for (const line of lines.filter((l) => l.startsWith('FAIL:'))) {
            console.log(`  ${line}`);
        }
        for (const exception of exceptions) {
            console.log(`  exception: ${exception}`);
        }
        if (!done || !result.includes(' 0 failed')) {
            failed = true;
        }
    }
} finally {
    socket.close();
    chrome.kill();
    await sleep(300);
    rmSync(profile, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);

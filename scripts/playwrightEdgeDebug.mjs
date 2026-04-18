import { chromium } from 'playwright';
import http from 'http';

async function post(url, body, extraHeaders = {}) {
  const parsed = new URL(url);
  const lib = parsed.protocol === 'https:' ? require('https') : http;
  const data = JSON.stringify(body);

  const options = {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + (parsed.search || ''),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      ...extraHeaders,
    },
  };

  return new Promise((resolve, reject) => {
    const req = lib.request(options, (res) => {
      let out = '';
      res.on('data', (chunk) => (out += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(out) });
        } catch (e) {
          resolve({ status: res.statusCode, body: out });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('playwright debug script starting');
  const baseApi = 'http://localhost:5002/api';
  const baseRooms = 'http://localhost:5002';

  // register/login
  const testEmail = `devroom_debug_${Date.now()}@example.com`;
  await post(`${baseApi}/register`, { name: 'DevRoom Debug', email: testEmail, password: 'Passw0rd!' });
  console.log('registered', testEmail);
  const login = await post(`${baseApi}/login`, { email: testEmail, password: 'Passw0rd!' });
  console.log('login response', login.status);
  const token = login.body.token;

  // create room
  const createRoom = await post(`${baseRooms}/rooms`, { name: 'Playwright Debug Room' }, token ? { Authorization: `Bearer ${token}` } : {});
  const roomId = createRoom.body.room._id;

  console.log('created room id', roomId);

  // Launch browser and open app with token in localStorage
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:5173');
  console.log('page loaded');

  // Perform UI login (AuthContext no longer auto-reads token)
  await page.waitForSelector('input[placeholder="you@example.com"]', { timeout: 10000 });
  await page.fill('input[placeholder="you@example.com"]', testEmail);
  await page.fill('input[placeholder="Enter your password"]', 'Passw0rd!');
  page.on('requestfinished', (req) => {
    try {
      const url = req.url();
      if (url.includes('/api/')) {
        const res = req.response();
        console.log('REQ', req.method(), url, 'status', res ? res.status() : 'no-resp');
      }
    } catch (e) {}
  });

  await page.click('text=Sign in');
  console.log('submitted login');

  // Wait for sidebar and click the room
  await page.waitForSelector('aside', { timeout: 30000 });
  await page.waitForSelector(`text=Playwright Debug Room`, { timeout: 30000 });
  console.log('room item present, clicking');
  await page.click(`text=Playwright Debug Room`);
  console.log('clicked room');

  // Wait for Tldraw to mount and the dev editor global to be available
  await page.waitForFunction(() => !!window.__DEVROOM_TL_EDITOR, null, { timeout: 5000 });
  console.log('dev editor available');

  // Create two nodes and an arrow using the exposed editor
  const createResult = await page.evaluate(() => {
    const editor = window.__DEVROOM_TL_EDITOR;
    const createId = window.__DEVROOM_CREATE_SHAPE_ID;

    const idA = createId();
    const idB = createId();
    const idEdge = createId();

    editor.createShapes([
      { id: idA, type: 'geo', x: 100, y: 100, props: { geo: 'rectangle', w: 160, h: 80, richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] }, fill: 'solid', color: 'violet' }, meta: { templateType: 'service' } },
      { id: idB, type: 'geo', x: 400, y: 100, props: { geo: 'rectangle', w: 160, h: 80, richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] }, fill: 'solid', color: 'violet' }, meta: { templateType: 'service' } },
      { id: idEdge, type: 'arrow', props: { start: { boundShapeId: idA }, end: { boundShapeId: idB } } },
    ]);

    // Click the Save canvas button
    const btn = Array.from(document.querySelectorAll('button')).find(b => /save canvas/i.test(b.textContent || ''));
    if (btn) btn.click();

    return { idA, idB, idEdge };
  });

  // Wait a moment for save to complete
  await page.waitForTimeout(1500);
  console.log('waited after save');

  // Fetch canvas via API to verify
  const res = await (async () => {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `http://localhost:5002/api/canvas/${roomId}`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onload = () => resolve({ status: xhr.status, body: JSON.parse(xhr.responseText) });
      xhr.send();
    });
  })();

  console.log('Canvas fetch status', res.status, 'nodes', (res.body.nodes || []).length, 'edges', (res.body.edges || []).length);

  await browser.close();
  process.exit(0);
})();

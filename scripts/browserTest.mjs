import { chromium } from 'playwright';

const baseApi = 'http://localhost:5002';
const api = `${baseApi}/api`;

function randEmail() {
  return `devroom_e2e_${Date.now()}@example.com`;
}

async function post(url, body, token) {
  const opts = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, opts);
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch (e) {
    return { status: res.status, data: text };
  }
}

async function get(url, token) {
  const opts = { headers: {} };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, opts);
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch (e) {
    return { status: res.status, data: text };
  }
}

(async () => {
  try {
    const email = randEmail();
    console.log('Registering', email);
    const reg = await post(`${api}/register`, { name: 'E2E Test', email, password: 'Passw0rd!' });
    console.log('Register:', reg.status, JSON.stringify(reg.data));

    const login = await post(`${api}/login`, { email, password: 'Passw0rd!' });
    console.log('Login:', login.status);
    if (!login.data || !login.data.token) throw new Error('Login failed: ' + JSON.stringify(login.data));
    const token = login.data.token;

    // Create room
    const createRoom = await post(`${baseApi}/rooms`, { name: 'E2E Room', description: 'Created by e2e' }, token);
    console.log('Create room:', createRoom.status, JSON.stringify(createRoom.data));
    if (!createRoom.data || !createRoom.data.room || !createRoom.data.room._id) throw new Error('Room creation failed');
    const roomId = createRoom.data.room._id;

    // Launch browser
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    // Ensure token is set before app loads
    await context.addInitScript({ content: `window.localStorage.setItem('devroom_token', ${JSON.stringify(token)});` });

    const page = await context.newPage();
    console.log('Opening app');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Wait for room title to appear
    await page.waitForSelector(`text=E2E Room`, { timeout: 15000 });

    // Programmatically create a shape via the mounted tldraw editor
    const created = await page.evaluate(() => {
      const editor = window.__DEVROOM_TL_EDITOR;
      if (!editor || typeof editor.createShapes !== 'function') return false;

      const shape = {
        id: `shape:${Date.now()}`,
        type: 'geo',
        x: 200,
        y: 150,
        props: {
          geo: 'rectangle',
          w: 160,
          h: 80,
          fill: 'solid',
          color: 'violet',
        },
        meta: { templateType: 'service' },
      };

      editor.createShapes([shape]);
      return true;
    });

    if (!created) {
      throw new Error('Failed to create shape via editor');
    }

    // Save canvas and wait for the save network response
    console.log('Clicking Save');
    const [saveResp] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/canvas/save') && resp.status() === 200, { timeout: 15000 }),
      page.click('text=Save canvas'),
    ]);
    console.log('Save response status:', saveResp.status());

    // Verify backend has node
    const loaded = await get(`${api}/canvas/${roomId}`, token);
    console.log('Loaded canvas:', loaded.status, JSON.stringify(loaded.data));

    const nodeCount = (loaded.data && loaded.data.nodes && loaded.data.nodes.length) || 0;
    if (nodeCount > 0) {
      console.log('E2E PASS: Node persisted:', nodeCount);
      await browser.close();
      process.exit(0);
    } else {
      console.error('E2E FAIL: No nodes found after save');
      await browser.close();
      process.exit(2);
    }
  } catch (err) {
    console.error('E2E error:', err);
    process.exit(3);
  }
})();

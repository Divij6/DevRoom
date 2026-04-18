import http from 'http';
import https from 'https';

function request(url, method = 'GET', body = null, headers = {}) {
  const parsed = new URL(url);
  const lib = parsed.protocol === 'https:' ? https : http;
  const data = body ? JSON.stringify(body) : '';

  const options = {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + (parsed.search || ''),
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      ...headers,
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
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const baseApi = 'http://localhost:5002/api';
    const baseRooms = 'http://localhost:5002';
    const testEmail = `devroom_test_${Date.now()}@example.com`;

    console.log('Registering user', testEmail);
    const reg = await request(`${baseApi}/register`, 'POST', { name: 'DevRoom Test', email: testEmail, password: 'Passw0rd!' });
    console.log('Register status', reg.status);

    const login = await request(`${baseApi}/login`, 'POST', { email: testEmail, password: 'Passw0rd!' });
    console.log('Login status', login.status, login.body && login.body.message ? login.body.message : 'ok');

    if (!login.body || !login.body.token) {
      console.error('Login failed', login.body);
      process.exit(1);
    }

    const token = login.body.token;
    const userId = login.body.user?.id || null;
    console.log('Token length', token.length, 'userId', userId);

    console.log('Creating room...');
    const createRoom = await request(`${baseRooms}/rooms`, 'POST', { name: 'Canvas Edge Test Room' }, { Authorization: `Bearer ${token}` });
    console.log('Create room status', createRoom.status);

    const roomId = (createRoom.body && createRoom.body.room && createRoom.body.room._id) ? createRoom.body.room._id : createRoom.body._id || null;
    if (!roomId) {
      console.error('Failed to get roomId', createRoom.body);
      process.exit(1);
    }
    console.log('Room created', roomId);

    const nodes = [
      { tempShapeId: 'shape:temp1', title: 'A', type: 'service', position: { x: 100, y: 100 }, width: 160, height: 80, createdBy: userId, roomId },
      { tempShapeId: 'shape:temp2', title: 'B', type: 'service', position: { x: 400, y: 100 }, width: 160, height: 80, createdBy: userId, roomId },
    ];

    const edges = [
      { sourceTempId: 'shape:temp1', targetTempId: 'shape:temp2', sourcePoint: { x: 100, y: 100 }, targetPoint: { x: 400, y: 100 }, createdBy: userId },
    ];

    const notes = [];

    console.log('Saving canvas...');
    const save = await request(`${baseApi}/canvas/save`, 'POST', { roomId, nodes, edges, notes }, { Authorization: `Bearer ${token}` });
    console.log('Save response', save.status, save.body && save.body.message ? save.body.message : save.body);

    console.log('Fetching canvas...');
    const get = await request(`${baseApi}/canvas/${roomId}`, 'GET', null, { Authorization: `Bearer ${token}` });
    console.log('Get canvas status', get.status);
    if (get.body) {
      console.log('Nodes:', (get.body.nodes || []).length, 'Edges:', (get.body.edges || []).length);
    } else {
      console.log('No response body from GET canvas');
    }

    process.exit(0);
  } catch (err) {
    console.error('Test script error:', err);
    process.exit(1);
  }
})();

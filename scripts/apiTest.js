import http from 'http';
import https from 'https';

async function post(url, body) {
  const parsed = new URL(url);
  const lib = parsed.protocol === 'https:' ? https : http;
  const data = JSON.stringify(body);

  const options = {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + (parsed.search || ''),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
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
  try {
    const base = 'http://localhost:5002/api';
    const testEmail = `devroom_test_${Date.now()}@example.com`;
    console.log('Registering user:', testEmail);
    const reg = await post(`${base}/register`, { name: 'DevRoom Test', email: testEmail, password: 'Passw0rd!' });
    console.log('Register response:', reg.status, JSON.stringify(reg.body));

    const login = await post(`${base}/login`, { email: testEmail, password: 'Passw0rd!' });
    console.log('Login response:', login.status, JSON.stringify(login.body));

    if (login.body && login.body.token) {
      console.log('Token received (first 40 chars):', login.body.token.slice(0, 40));
    }
  } catch (err) {
    console.error('API test error:', err.message || err);
  }
})();

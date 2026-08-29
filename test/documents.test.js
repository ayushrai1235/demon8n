const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/server');
const { getDb } = require('../src/db');

let server;
let baseUrl;

before(async () => {
  await getDb();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '2',
        ...(options.headers || {})
      }
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

test('GET /health returns 200 status ok', async () => {
  const res = await request('/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ok');
});

test('GET /documents lists user documents', async () => {
  const res = await request('/documents');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length >= 4);
});

test('GET /documents/search filters documents by title keyword', async () => {
  const res = await request('/documents/search?category=engineering&q=Optimization');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.strictEqual(res.body.data.length, 1);
  assert.strictEqual(res.body.data[0].title, 'Backend Optimization Guide');
});

test('GET /documents/:id retrieves specific document', async () => {
  const res = await request('/documents/2');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.id, 2);
  assert.strictEqual(res.body.data.title, 'Backend Optimization Guide');
});

test('POST /documents creates new document', async () => {
  const newDoc = {
    title: 'Testing Strategy 2026',
    content: 'Comprehensive integration test plan for Node microservices.',
    category: 'engineering',
    is_private: 0
  };

  const res = await request('/documents', {
    method: 'POST',
    body: newDoc
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.title, 'Testing Strategy 2026');
});

test('PUT /documents/:id updates document information', async () => {
  const updates = {
    title: 'Updated UI Design Guidelines',
    category: 'design'
  };

  const res = await request('/documents/4', {
    method: 'PUT',
    body: updates
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.title, 'Updated UI Design Guidelines');
});

test('GET /documents/:id/export returns document export data', async () => {
  const res = await request('/documents/2/export');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.document);
  assert.ok(res.body.data.exportMetadata);
});

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

test('GET /activities lists user activity logs', async () => {
  const res = await request('/activities');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length >= 4);
});

test('GET /activities/search filters activity logs by action and detail query', async () => {
  const res = await request('/activities/search?action=USER_LOGIN&q=Successful');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.strictEqual(res.body.data.length, 1);
  assert.strictEqual(res.body.data[0].action, 'USER_LOGIN');
});

test('GET /activities/:id retrieves specific activity log', async () => {
  const res = await request('/activities/2');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.id, 2);
  assert.strictEqual(res.body.data.action, 'EXPORT_DATA');
});

test('POST /activities creates new activity log entry', async () => {
  const newLog = {
    action: 'SYSTEM_BACKUP',
    resource_type: 'database',
    resource_id: 1,
    details: 'Completed scheduled night backup',
    is_flagged: 0
  };

  const res = await request('/activities', {
    method: 'POST',
    body: newLog
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.action, 'SYSTEM_BACKUP');
});

test('PUT /activities/:id updates activity log information', async () => {
  const updates = {
    details: 'Updated audit details for asset deletion',
    is_flagged: 0
  };

  const res = await request('/activities/4', {
    method: 'PUT',
    body: updates
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.details, 'Updated audit details for asset deletion');
});

test('GET /activities/:id/export returns activity log export data', async () => {
  const res = await request('/activities/2/export');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.logRecord);
  assert.ok(res.body.data.exportMetadata);
});

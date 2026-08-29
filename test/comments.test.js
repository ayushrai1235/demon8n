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

test('GET /comments lists user comments', async () => {
  const res = await request('/comments');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length >= 4);
});

test('GET /comments/search filters comments by topic and keyword', async () => {
  const res = await request('/comments/search?topic=architecture&q=microservice');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.strictEqual(res.body.data.length, 1);
  assert.strictEqual(res.body.data[0].topic, 'architecture');
});

test('GET /comments/:id retrieves specific comment', async () => {
  const res = await request('/comments/2');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.id, 2);
  assert.strictEqual(res.body.data.author_name, 'Bob Jones');
});

test('POST /comments creates new comment entry', async () => {
  const newComment = {
    author_name: 'Bob Jones',
    comment_text: 'Reviewed and verified SQLite connection pools.',
    topic: 'database',
    is_pinned: 0
  };

  const res = await request('/comments', {
    method: 'POST',
    body: newComment
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.topic, 'database');
});

test('PUT /comments/:id updates comment content', async () => {
  const updates = {
    comment_text: 'Updated comment note for dark mode theme.',
    topic: 'frontend'
  };

  const res = await request('/comments/4', {
    method: 'PUT',
    body: updates
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.comment_text, 'Updated comment note for dark mode theme.');
});

test('GET /comments/:id/export returns comment export payload', async () => {
  const res = await request('/comments/2/export');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.commentRecord);
  assert.ok(res.body.data.exportMetadata);
});

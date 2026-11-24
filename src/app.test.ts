import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApplication } from './app.js';
import { APP_CONFIG, type AppConfig } from './core/config/app-config.js';
import { createHash } from 'node:crypto';
import { AUTH_REPOSITORY, type AuthRepository } from './modules/auth/auth.repository.js';
import type { Permission } from './modules/auth/identity.js';

test('the backend serves APIs and media routes, guards admin endpoints, and validates public inputs', async () => {
  const app = await createApplication();
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const config = app.get<AppConfig>(APP_CONFIG);
    for (const path of [
      '/',
      '/admin',
      '/admin.html',
      '/screen/main',
      '/screen.html',
      '/assets/admin.js',
      '/assets/screen.js',
    ]) {
      assert.equal((await fetch(base + path)).status, 404, path);
    }

    for (const route of ['news', 'settings', 'ticker', 'screens', 'video-schedules', 'users']) {
      const result = await fetch(base + '/api/admin/' + route);
      assert.equal(result.status, 401, route);
      assert.equal(result.headers.get('cache-control'), 'no-store');
    }
    const upload = await fetch(base + '/api/admin/uploads/video', {
      method: 'POST',
      headers: { Origin: config.origin },
    });
    assert.equal(upload.status, 401);

    const badOrigin = await fetch(base + '/api/auth/login', { method: 'POST' });
    assert.equal(badOrigin.status, 403);
    const badScreen = await fetch(base + '/api/screens/INVALID/feed');
    assert.equal(badScreen.status, 400);
    assert.equal((await fetch(base + '/uploads/cloud/bad')).status, 404);
  } finally {
    await app.close();
  }
});

test('editors need the exact news permission and admin-only routes stay restricted', async () => {
  const app = await createApplication();
  let permissions: Permission[] = ['news.create'];
  const csrf = 'a'.repeat(64);
  const csrfHash = createHash('sha256').update(csrf).digest('hex');
  const repository = app.get<AuthRepository>(AUTH_REPOSITORY);
  repository.session = async () => ({
    user: { id: 1, email: 'editor@example.invalid', role: 'editor', permissions },
    csrfHash,
  });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const headers = {
      Cookie: 'union_session=' + 'b'.repeat(64),
      Origin: app.get<AppConfig>(APP_CONFIG).origin,
      'X-CSRF-Token': csrf,
      'Content-Type': 'application/json',
    };
    const call = async (route: string, method = 'GET') =>
      (
        await fetch(base + '/api/' + route, {
          method,
          headers,
          body: method === 'POST' || method === 'PUT' ? '{}' : undefined,
        })
      ).status;

    const me = await fetch(base + '/api/auth/me', { headers });
    assert.deepEqual((await me.json()).permissions, ['news.create']);
    assert.equal(await call('admin/news', 'POST'), 400);
    assert.equal(await call('admin/news/invalid', 'PUT'), 403);
    assert.equal(await call('admin/news/invalid', 'DELETE'), 403);
    assert.equal(await call('admin/news/invalid/archive', 'POST'), 403);
    assert.equal(await call('admin/uploads', 'POST'), 400);
    assert.equal(await call('admin/uploads/video', 'POST'), 400);
    for (const path of ['users', 'ticker', 'settings', 'screens', 'video-schedules']) {
      assert.equal(await call('admin/' + path), 403);
    }
    assert.equal(await call('admin/users/1/permissions', 'PUT'), 403);

    permissions = ['news.archive'];
    assert.equal(await call('admin/news', 'POST'), 403);
    assert.equal(await call('admin/news/invalid/archive', 'POST'), 400);
    assert.equal(await call('admin/news/invalid/restore', 'POST'), 400);
    assert.equal(await call('admin/uploads', 'POST'), 403);
    assert.equal(await call('admin/uploads/video', 'POST'), 403);

    permissions = [];
    assert.equal(await call('admin/news'), 403);
  } finally {
    await app.close();
  }
});

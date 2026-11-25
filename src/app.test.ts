import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApplication } from './app.js';
import { APP_CONFIG, type AppConfig } from './core/config/app-config.js';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
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

test('Firebase Hosting gets isolated cookies, exact-origin CORS and CSRF protection', async () => {
  const app = await createApplication();
  const repository = app.get<AuthRepository>(AUTH_REPOSITORY);
  const email = 'test-dashboard@example.invalid';
  const password = 'test-dashboard-password';
  const passwordHash = await bcrypt.hash(password, 4);
  let storedSession: string | undefined;
  let storedCsrf: string | undefined;
  repository.account = async () => ({ id: 1, passwordHash });
  repository.createSession = async (hash, _userId, csrfHash) => {
    storedSession = hash;
    storedCsrf = csrfHash;
  };
  repository.session = async (hash) =>
    hash === storedSession && storedCsrf
      ? { user: { id: 1, email, role: 'admin', permissions: [] }, csrfHash: storedCsrf }
      : undefined;
  repository.removeSession = async (hash) => {
    if (hash === storedSession) storedSession = undefined;
  };

  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl() + '/api/auth';
    const origin = 'https://control-board-2d1be.web.app';
    const preflight = await fetch(`${base}/login`, {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal(preflight.headers.get('Access-Control-Allow-Credentials'), 'true');

    const login = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(login.status, 200);
    const cookies = login.headers.getSetCookie();
    assert.equal(cookies.length, 2);
    for (const cookie of cookies) {
      assert.match(cookie, /^__Host-dashboard_(session|csrf)=/);
      for (const attribute of ['Path=/', 'HttpOnly', 'Secure', 'Partitioned', 'SameSite=None']) {
        assert.ok(cookie.includes(attribute), attribute);
      }
    }
    const Cookie = cookies.map((cookie) => cookie.split(';', 1)[0]).join('; ');
    const foreign = await fetch(`${base}/me`, { headers: { Origin: origin + '.invalid', Cookie } });
    assert.equal(foreign.status, 401);
    assert.equal(foreign.headers.get('Access-Control-Allow-Origin'), null);
    const me = await fetch(`${base}/me`, { headers: { Origin: origin, Cookie } });
    assert.equal(me.status, 200);
    assert.equal(me.headers.get('Access-Control-Expose-Headers'), 'X-CSRF-Token');
    const csrf = me.headers.get('X-CSRF-Token');
    assert.match(csrf ?? '', /^[a-f0-9]{64}$/);
    const denied = await fetch(`${base}/logout`, { method: 'POST', headers: { Origin: origin, Cookie } });
    assert.equal(denied.status, 403);
    const logout = await fetch(`${base}/logout`, {
      method: 'POST', headers: { Origin: origin, Cookie, 'X-CSRF-Token': csrf! },
    });
    assert.equal(logout.status, 204);
    assert.equal(logout.headers.getSetCookie().length, 2);
    assert.equal((await fetch(`${base}/me`, { headers: { Origin: origin, Cookie } })).status, 401);
  } finally {
    await app.close();
  }
});

test('the Firebase display can read published feeds and sign in without admin API access', async () => {
  const app = await createApplication();
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl() + '/api';
    const origin = 'https://petroleum-union.web.app';
    for (const path of ['/display', '/news/petroleum', '/prices/petroleum']) {
      const response = await fetch(base + path, {
        method: 'OPTIONS',
        headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' },
      });
      assert.equal(response.status, 204, path);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin, path);
      assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null, path);
    }
    const login = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(login.status, 400);
    assert.equal(login.headers.get('Access-Control-Allow-Credentials'), 'true');

    const admin = await fetch(base + '/admin/news', {
      method: 'POST',
      headers: { Origin: origin },
    });
    assert.equal(admin.status, 403);
    assert.equal(admin.headers.get('Access-Control-Allow-Origin'), null);

    const session = await fetch(base + '/auth/me', { headers: { Origin: origin } });
    assert.equal(session.status, 401);
    assert.equal(session.headers.get('Access-Control-Allow-Origin'), null);
  } finally {
    await app.close();
  }
});

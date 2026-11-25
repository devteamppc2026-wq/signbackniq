const firebaseDashboardOrigins = new Set([
  'https://control-board-2d1be.web.app',
  'https://control-board-2d1be.firebaseapp.com',
]);

const firebaseDisplayOrigins = new Set([
  'https://petroleum-union.web.app',
  'https://petroleum-union.firebaseapp.com',
]);

export function isFirebaseDashboardOrigin(origin: string | undefined): origin is string {
  return origin !== undefined && firebaseDashboardOrigins.has(origin);
}

export function isFirebaseDisplayOrigin(origin: string | undefined): origin is string {
  return origin !== undefined && firebaseDisplayOrigins.has(origin);
}

export function isFirebaseSignInOrigin(origin: string | undefined) {
  return isFirebaseDashboardOrigin(origin) || isFirebaseDisplayOrigin(origin);
}

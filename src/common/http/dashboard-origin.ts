const firebaseDashboardOrigins = new Set([
  'https://control-board-2d1be.web.app',
  'https://control-board-2d1be.firebaseapp.com',
]);

export function isFirebaseDashboardOrigin(origin: string | undefined): origin is string {
  return origin !== undefined && firebaseDashboardOrigins.has(origin);
}

const firebaseDashboardOrigins = new Set([
  'https://screen-control-1cc40.web.app',
  'https://screen-control-1cc40.firebaseapp.com',
]);

export function isFirebaseDashboardOrigin(origin: string | undefined): origin is string {
  return origin !== undefined && firebaseDashboardOrigins.has(origin);
}

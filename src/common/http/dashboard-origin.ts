const firebaseDashboardOrigins = new Set([
  'https://screen-controller-8594e.web.app',
  'https://screen-controller-8594e.firebaseapp.com',
]);

export function isFirebaseDashboardOrigin(origin: string | undefined): origin is string {
  return origin !== undefined && firebaseDashboardOrigins.has(origin);
}

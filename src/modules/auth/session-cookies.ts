import type { CookieOptions, Request } from 'express';
import { isFirebaseDashboardOrigin } from '../../common/http/dashboard-origin.js';

export const directDashboardCookies = {
  session: '__Host-dashboard_session',
  csrf: '__Host-dashboard_csrf',
  options: { path: '/', sameSite: 'none', secure: true, partitioned: true, httpOnly: true } as CookieOptions,
};

export function requestSession(request: Request): unknown {
  return isFirebaseDashboardOrigin(request.get('origin'))
    ? request.cookies[directDashboardCookies.session]
    : request.cookies.union_session;
}

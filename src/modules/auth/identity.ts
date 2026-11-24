export const NEWS_PERMISSIONS = [
  'news.create',
  'news.update',
  'news.delete',
  'news.archive',
] as const;
export type Permission = (typeof NEWS_PERMISSIONS)[number];
export type Role = 'admin' | 'editor';
export type UserIdentity = { id: number; email: string; role: Role; permissions: Permission[] };

export function hasAnyPermission(user: UserIdentity, allowed: readonly Permission[]) {
  return (
    user.role === 'admin' || allowed.some((permission) => user.permissions.includes(permission))
  );
}

export function toIdentity(
  user: { id: number; email: string; role: Role },
  permissions: Permission[],
): UserIdentity {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: user.role === 'admin' ? [...NEWS_PERMISSIONS] : permissions,
  };
}

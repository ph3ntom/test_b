export function maskName(name: string): string {
  if (!name || name.length <= 2) {
    return name;
  }
  const first = name.charAt(0);
  const last = name.charAt(name.length - 1);
  const middle = '*'.repeat(name.length - 2);
  return first + middle + last;
}

export function maskUserId(userId: string): string {
  if (!userId || userId.length <= 2) {
    return userId;
  }
  const visible = userId.slice(0, -2);
  const masked = '**';
  return visible + masked;
}

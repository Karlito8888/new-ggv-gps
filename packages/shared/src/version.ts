/**
 * Whether `version` is strictly below `floor`, comparing dotted numeric segments ("1.10.0" is
 * above "1.9.0"; a missing segment counts as 0). A malformed value on either side answers
 * `false`: a typo in the published floor must never lock users out of the app.
 */
export function isBelowVersion(version: string, floor: string): boolean {
  if (![version, floor].every((v) => /^\d+(\.\d+)*$/.test(v))) return false;
  const a = version.split(".").map(Number);
  const b = floor.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff < 0;
  }
  return false;
}

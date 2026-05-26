const userScanLog = new Map<string, number[]>();

export function checkBurstAnomaly(userId: string): boolean {
  const now = Date.now();
  const window = 5 * 60 * 1000;
  const scans = (userScanLog.get(userId) || []).filter(t => now - t < window);
  scans.push(now);
  userScanLog.set(userId, scans);
  return scans.length > 10;
}

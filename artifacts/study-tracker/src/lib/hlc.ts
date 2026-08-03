let lastTimestamp = 0;
let counter = 0;
let nodeId = Math.random().toString(36).substring(2, 6);

export function generateHLC(): string {
  let now = Date.now();
  if (now > lastTimestamp) {
    lastTimestamp = now;
    counter = 0;
  } else {
    counter++;
  }
  return `${lastTimestamp.toString().padStart(15, '0')}-${counter.toString().padStart(4, '0')}-${nodeId}`;
}

export function updateHLC(remoteHLC: string): void {
  if (!remoteHLC) return;
  const parts = remoteHLC.split('-');
  if (parts.length >= 2) {
    const remoteTime = parseInt(parts[0], 10);
    if (!isNaN(remoteTime) && remoteTime > lastTimestamp) {
      lastTimestamp = remoteTime;
      counter = 0;
    }
  }
}

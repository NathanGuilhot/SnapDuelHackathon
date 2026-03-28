export function snapLog(step: string, metadata?: Record<string, unknown>): void {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");
  const ms = now.getMilliseconds().toString().padStart(3, "0");
  const time = `${hh}:${mm}:${ss}.${ms}`;
  const meta = metadata ? ` ${JSON.stringify(metadata)}` : "";
  console.log(`[SNAP] ${time} ${step}${meta}`);
}

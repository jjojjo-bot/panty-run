export interface SharePayload {
  i: string;
  h: string;
  c: string;
  e: string;
  t: number;
  d: number;
  n: number;
}

export function encodeSharePayload(p: SharePayload): string {
  const json = JSON.stringify(p);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeSharePayload(s: string): Partial<SharePayload> {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as Partial<SharePayload>;
  } catch {
    return {};
  }
}

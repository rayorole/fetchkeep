import { createHash } from "node:crypto";

export function sha256(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Short, stable content hash used for block identity. */
export function shortHash(data: string): string {
  return sha256(data).slice(0, 16);
}

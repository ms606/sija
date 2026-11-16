/**
 * The sync passphrase as it is checked: lower case, words joined by single
 * dashes, so a phrase pasted with extra spaces, capitals or a trailing newline
 * still matches. Shared by the Worker and the tool that sets the passphrase.
 */
export function normalizePassphrase(input: string): string {
  return input.trim().toLowerCase().split(/[\s-]+/).filter(Boolean).join('-')
}

/** SHA-256 of a text, as bytes. */
export async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** The value stored as the Worker secret SYNC_PASSPHRASE_HASH. */
export async function passphraseHash(phrase: string): Promise<string> {
  return toHex(await sha256(normalizePassphrase(phrase)))
}

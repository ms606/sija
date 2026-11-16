/**
 * The sync passphrase as it is checked: lower case, words joined by single
 * dashes, so a phrase pasted with extra spaces, capitals or a trailing newline
 * still matches. Shared by the Worker and the tool that sets the passphrase.
 */
export function normalizePassphrase(input: string): string {
  return input.trim().toLowerCase().split(/[\s-]+/).filter(Boolean).join('-')
}

/** Crockford's base32 in lower case: no i, l, o or u, so nothing is mistaken for 1, 0 or v. */
const KEY_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz'

/**
 * A new random sync passphrase: five groups of five characters, e.g.
 * "k7qm2-xvd9r-2bhwe-n4tq8-pz6cy". That is 125 bits, far beyond guessing even
 * with the hash in hand, which is why one SHA-256 is enough to store it.
 * Already in normalized form. (Only the passphrase tool uses this.)
 */
export function generatePassphrase(): string {
  const groups: string[] = []
  for (let g = 0; g < 5; g++) {
    let group = ''
    // 32 divides 256, so taking each byte modulo 32 keeps every character equally likely.
    for (const byte of crypto.getRandomValues(new Uint8Array(5))) group += KEY_ALPHABET[byte % 32]
    groups.push(group)
  }
  return groups.join('-')
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

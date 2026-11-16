import { createHash } from 'node:crypto'
import { normalizePassphrase } from '../../worker/passphrase'

/** Used only by these tests, against a throwaway local database. */
export const E2E_PHRASE = 'e2e only lantern meadow pebble violin'
export const E2E_PORT = 8790

export const e2eHash = () => createHash('sha256').update(normalizePassphrase(E2E_PHRASE)).digest('hex')

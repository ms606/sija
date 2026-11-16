/*
 * Makes a new sync passphrase and stores its hash as the Worker secret
 * SYNC_PASSPHRASE_HASH. Run it in your own terminal:
 *
 *   npm run sync:passphrase
 *
 * The passphrase is printed once, only after the secret has been stored, and is
 * kept nowhere else: save it in your password manager. Connected devices stay
 * connected; after a leaked passphrase, also use Settings → Sync → Disconnect
 * all devices.
 */
import { spawnSync } from 'node:child_process'
import { generatePassphrase, normalizePassphrase, passphraseHash } from '../worker/passphrase'

const phrase = generatePassphrase()
if (normalizePassphrase(phrase) !== phrase) throw new Error('The new passphrase is not in normalized form.')
const hash = await passphraseHash(phrase)

console.log('Storing the hash of a new sync passphrase as the Worker secret SYNC_PASSPHRASE_HASH…')
const put = spawnSync('npx', ['wrangler', 'secret', 'put', 'SYNC_PASSPHRASE_HASH'], {
  input: `${hash}\n`,
  stdio: ['pipe', 'ignore', 'inherit'],
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
})
if (put.status !== 0) {
  console.error('\nThe secret was not stored, so this passphrase would not work and is not shown. Fix the error above and run the command again.')
  process.exit(1)
}

console.log(`
Your new sync passphrase (shown only now):

    ${phrase}

Save it in your password manager. Then connect each device in Sija: Settings → Sync.
Devices that were already connected stay connected.`)

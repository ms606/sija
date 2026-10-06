// Dev helper: Playwright launch options for the system Chrome.
// On Apple Silicon, an x86_64 Node (running under Rosetta) makes Playwright start
// Chrome's x86_64 slice too, and V8's JIT is extremely slow when translated.
// Launching through `arch -arm64` keeps Chrome native.
import { execSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

function underRosetta() {
  if (process.platform !== 'darwin' || process.arch !== 'x64') return false
  try {
    return execSync('sysctl -n sysctl.proc_translated', { encoding: 'utf8' }).trim() === '1'
  } catch {
    return false
  }
}

/** Options to spread into `chromium.launch()` / Playwright `use.launchOptions`. */
export function chromeLaunchOptions() {
  if (!underRosetta() || !existsSync(CHROME)) return { channel: 'chrome' }
  const dir = join(process.cwd(), 'node_modules', '.cache', 'chrome-native')
  const wrapper = join(dir, 'chrome-arm64.sh')
  if (!existsSync(wrapper)) {
    mkdirSync(dir, { recursive: true })
    writeFileSync(wrapper, `#!/bin/sh\nexec /usr/bin/arch -arm64 "${CHROME}" "$@"\n`)
    chmodSync(wrapper, 0o755)
  }
  return { executablePath: wrapper }
}

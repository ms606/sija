/**
 * Verifies every lexeme's declension type and gradation letter against the
 * Kotus "Nykysuomen sanalista" (2024, CC BY 4.0, Institute for the Languages
 * of Finland). The list is downloaded once into tools/kotus/.cache (dev-only).
 *
 * Checks:
 *  - the lexeme's `kotus` string appears for that headword in the list
 *  - `typeId` matches the Kotus type number
 *  - the Kotus gradation letter matches the lexeme's gradation pattern
 *    (and direction: inverse for types 32–49)
 *  - compounds inflect exactly like their head lexeme
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEXICON, getNoun } from '../../src/data/lexicon/index.ts'
import { getType } from '../../src/grammar/declension/registry.ts'
import { GRADATION_PATTERNS } from '../../src/grammar/gradation.ts'
import type { Noun } from '../../src/types/content.ts'

const URL = 'https://kaino.kotus.fi/lataa/nykysuomensanalista2024.txt'
const here = dirname(fileURLToPath(import.meta.url))
const cacheFile = join(here, '.cache', 'nykysuomensanalista2024.txt')

async function loadList(): Promise<Map<string, { homonym: string; pos: string; info: string }[]>> {
  if (!existsSync(cacheFile)) {
    console.log(`Downloading ${URL} …`)
    const res = await fetch(URL)
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    mkdirSync(dirname(cacheFile), { recursive: true })
    writeFileSync(cacheFile, await res.text())
  }
  const map = new Map<string, { homonym: string; pos: string; info: string }[]>()
  const lines = readFileSync(cacheFile, 'utf8').split(/\r?\n/).slice(1)
  for (const line of lines) {
    const [word, homonym = '', pos = '', info = ''] = line.split('\t')
    if (!word) continue
    const list = map.get(word) ?? []
    list.push({ homonym, pos, info: info.trim() })
    map.set(word, list)
  }
  return map
}

function checkInternal(n: Noun, problems: string[]): void {
  const m = /^(\d+)(?:\*([A-M]))?$/.exec(n.kotus)
  if (!m) {
    problems.push(`${n.id}: malformed kotus "${n.kotus}"`)
    return
  }
  const [, num, letter] = m
  if (n.typeId !== `k${num}`) problems.push(`${n.id}: typeId ${n.typeId} ≠ Kotus type ${num}`)
  const def = getType(n.typeId)
  if (letter) {
    if (!n.gradation) {
      problems.push(`${n.id}: Kotus letter ${letter} but no gradation declared`)
      return
    }
    const p = GRADATION_PATTERNS[n.gradation.pattern]
    if (p.kotusLetter !== letter) problems.push(`${n.id}: pattern ${p.id} is ${p.kotusLetter}, Kotus says ${letter}`)
    const inverse = n.gradation.inverse === true
    if (inverse !== (def.gradation === 'inverse')) problems.push(`${n.id}: gradation direction does not match type ${def.id}`)
  } else if (n.gradation) {
    problems.push(`${n.id}: declares ${n.gradation.pattern} but Kotus has no gradation letter`)
  }
}

async function main() {
  const list = await loadList()
  const problems: string[] = []
  let checked = 0
  for (const n of LEXICON) {
    if (n.compound) {
      const head = getNoun(n.compound.headId)
      if (!head) {
        problems.push(`${n.id}: unknown compound head ${n.compound.headId}`)
        continue
      }
      if (head.typeId !== n.typeId || head.gradation?.pattern !== n.gradation?.pattern) {
        problems.push(`${n.id}: does not inflect like its head ${head.id}`)
      }
      if (!n.lemma.endsWith(head.lemma)) problems.push(`${n.id}: lemma does not end with head ${head.lemma}`)
      checked++
      continue
    }
    const rows = list.get(n.lemma)
    if (!rows) {
      problems.push(`${n.id}: "${n.lemma}" not found in the Kotus list`)
      continue
    }
    const infos = rows.flatMap((r) => r.info.split(/,\s*/))
    if (!infos.includes(n.kotus)) {
      problems.push(`${n.id}: kotus "${n.kotus}" not among ${JSON.stringify(rows.map((r) => r.info))}`)
    }
    checkInternal(n, problems)
    checked++
  }
  console.log(`Checked ${checked} lexemes against Kotus 2024.`)
  if (problems.length) {
    console.log(`${problems.length} problem(s):`)
    for (const p of problems) console.log('  ✗ ' + p)
    process.exit(1)
  }
  console.log('All declension types and gradation letters match.')
}

void main()

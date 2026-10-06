import type { DiagnosisId } from '../../grammar'
import type { ModeText } from '../../types/content'
import { m } from './text'

/**
 * Feedback for a wrong answer, keyed by the engine's diagnosis.
 * Placeholders: {answer} {correct} {slot} {treatedAs} {actual} {strong} {weak} {used}.
 */
/** Engine diagnoses plus feedback that only exercises produce (choosing the wrong person). */
export type FeedbackId = DiagnosisId | 'wrong-person' | 'unknown'

export const DIAGNOSES: Record<FeedbackId, ModeText> = {
  'missing-umlaut': m(
    'Almost! The letters are right except the dots: write {correct}. ä and a (ö and o) are different sounds in Finnish.',
    'Melkein! Pisteet puuttuvat: {correct}.',
  ),
  'wrong-number': m(
    'You wrote the {slot}. The question asks for the other number — check singular vs plural.',
    'Kirjoitit muodon {slot}. Tarkista yksikkö ja monikko.',
  ),
  'wrong-case': m('You wrote the {slot} — a real form of this word, but a different case.', 'Kirjoitit muodon {slot}: eri sijamuoto.'),
  'rare-slot': m('That is a rare form of this word ({slot}), not the one asked for.', 'Harvinainen muoto ({slot}).'),
  'wrong-igroup': m(
    'You inflected it like a {treatedAs}-type word. This word is {actual}-type, so its stem changes differently.',
    'Taivutit sanan {treatedAs}-tyypin mukaan. Sana on {actual}-tyyppiä.',
  ),
  'no-gradation': m(
    'Remember consonant gradation: this form needs the weak grade ({strong} → {weak}).',
    'Muista astevaihtelu: heikko aste ({strong} → {weak}).',
  ),
  'wrong-grade': m(
    'This form keeps the strong grade ({strong}), not the weak grade ({weak}) — the syllable stays open.',
    'Tässä muodossa on vahva aste ({strong}).',
  ),
  'wrong-partitive-ending': m(
    'The partitive ending depends on the stem: you used {used}. Check what the stem ends in.',
    'Partitiivin pääte riippuu vartalosta.',
  ),
  'wrong-illative': m(
    'The illative ending depends on the stem: you used {used}. One-syllable words take -hVn (maahan); long-vowel stems in longer words take -seen (perheeseen); others repeat the vowel + n (taloon).',
    'Illatiivin pääte riippuu vartalosta.',
  ),
  'lemma-plus-ending': m(
    'You added the ending to the base form. This word changes its stem first.',
    'Pääte lisätään vartaloon, ei perusmuotoon.',
  ),
  'wrong-harmony': m(
    'Check vowel harmony: the ending must match the vowels of the word (a/o/u vs ä/ö/y).',
    'Tarkista vokaalisointu.',
  ),
  'wrong-person': m('That suffix is for another person ({person}). Check which possessive the question asks for.', 'Väärä persoona ({person}).'),
  unknown: m('Not quite. Compare your answer with {correct} and look at how it is built.', 'Ei aivan. Oikea muoto on {correct}.'),
}

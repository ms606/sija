import type { ModeText, RuleId } from '../../types/content'
import { m } from './text'

/**
 * Explanation for every rule id the engine can emit (enforced by a test).
 * Placeholders in {braces} are filled from the step's params by the UI:
 * {from} {to} {ending} {pattern} {strong} {weak} {kotus} {model} {group}
 * {slot} {suffix} {person} {vowels} {part} {primary} {modifier} {head}.
 */
export const RULES: Record<RuleId, ModeText> = {
  /* ---------------- derivation frame ---------------- */
  'step.lemma': m('The base form (perusmuoto) — the form you find in a dictionary.', 'Perusmuoto eli sanakirjamuoto.'),
  'step.result': m('The finished form.', 'Valmis muoto.'),
  'step.result.variant': m('This is also correct. The most common form is {primary}.', 'Myös tämä on oikein. Tavallisin muoto on {primary}.'),
  'compound.head': m(
    'This is a compound word ({modifier} + {head}). Only the last part changes; the first part stays as it is.',
    'Yhdyssana ({modifier} + {head}): vain viimeinen osa taipuu.',
  ),
  'lexical.auto-no-gradation': m(
    'auto has a t between vowels but does not alternate (auton, not *audon). Newer loanwords often have no consonant gradation — this has to be learned with the word.',
    'Uusissa lainasanoissa ei usein ole astevaihtelua: auto → auton.',
  ),

  /* ---------------- declension types (why this word inflects like this) ---------------- */
  'type.k1.membership': m('Words in -o, -u, -y, -ö like talo, koulu (Kotus type {kotus}, model valo). Very regular.', 'Valo-tyyppi: talo, koulu.'),
  'type.k2.membership': m('Three-syllable words in -o/-u like kirjasto (Kotus {kotus}, model palvelu). Two accepted plural series.', 'Palvelu-tyyppi.'),
  'type.k3.membership': m('Words in -io, -iö, -eo like radio, keittiö (Kotus {kotus}, model valtio). Partitive -ta/-tä.', 'Valtio-tyyppi: partitiivi -ta/-tä.'),
  'type.k5.membership': m(
    'Pankki-type (Kotus {kotus}, model risti): the -i stays in the stem. Typical of loanwords and newer words — but you cannot always tell from spelling: lasi is pankki-type, käsi is not.',
    'Pankki-tyyppi: i säilyy vartalossa (pankin, pankkia). Tyyppi on opittava sanan mukana.',
  ),
  'type.k6.membership': m('Longer loanwords in -i like paperi (Kotus {kotus}): -i stays, and the plural has two series (papereita / papereja).', 'Paperi-tyyppi.'),
  'type.k7.membership': m(
    'Lehti-type (Kotus {kotus}, model ovi): an old Finnish word whose -i turns into -e- in the stem, and the partitive is built on that stem (lehteä). Must be learned with the word.',
    'Lehti-tyyppi: i → e vartalossa, partitiivi vokaalivartalosta (lehteä).',
  ),
  'type.k9.membership': m(
    'Two-syllable -a word with a, e or i in the first syllable (Kotus {kotus}, model kala): before the plural -i- the a becomes o (kauppoja).',
    'Kala-tyyppi: monikossa a → o (kauppoja).',
  ),
  'type.k10.membership': m(
    'An -ä word, or an -a word with o or u in the first syllable (Kotus {kotus}, model koira): the final vowel drops before the plural -i- (koiria, päiviä).',
    'Koira-tyyppi: loppuvokaali katoaa monikossa (koiria).',
  ),
  'type.k11.membership': m('omena-type (Kotus {kotus}): two complete plural series, both correct (omenia / omenoita).', 'Omena-tyyppi: kaksi monikkosarjaa.'),
  'type.k12.membership': m('Three-syllable -a/-ä words like ravintola (Kotus {kotus}, model kulkija): plural -oi-/-öi- (ravintoloita).', 'Kulkija-tyyppi: ravintoloita.'),
  'type.k13.membership': m('katiska-type (Kotus {kotus}): like ravintola, but the short plural forms are also accepted (sairaaloja).', 'Katiska-tyyppi.'),
  'type.k14.membership': m(
    'Three-syllable words with kk/pp/tt before the last vowel (Kotus {kotus}, model solakka): lusikka → lusikoita ~ lusikkoja.',
    'Solakka-tyyppi.',
  ),
  'type.k15.membership': m('Words in -ea, -eä like vihreä, vaikea (Kotus {kotus}, model korkea).', 'Korkea-tyyppi.'),
  'type.k18.membership': m('One-syllable word with a long vowel (Kotus {kotus}, model maa): partitive -ta/-tä, illative -h + vowel + n (maahan).', 'Maa-tyyppi: maata, maahan.'),
  'type.k19.membership': m('One-syllable word with ie, uo or yö (Kotus {kotus}, model suo): the plural changes the diphthong (työ → töitä).', 'Suo-tyyppi: työ → töitä.'),
  'type.k23.membership': m(
    'Kieli-type (Kotus {kotus}, model tiili): -i → -e- in the vowel stem, and the partitive uses the short consonant stem (tiiltä, tulta).',
    'Kieli-tyyppi (tiili): partitiivi konsonanttivartalosta.',
  ),
  'type.k24.membership': m(
    'Kieli-type (Kotus {kotus}, model uni): -i → -e-, partitive from the consonant stem (unta, merta); plural genitive -ien or -ten.',
    'Kieli-tyyppi (uni): unta, unien ~ unten.',
  ),
  'type.k25.membership': m('lumi-type (Kotus {kotus}, model toimi): the consonant stem has n instead of m (lumi → lunta).', 'Toimi-tyyppi: lumi → lunta.'),
  'type.k26.membership': m(
    'Kieli-type (Kotus {kotus}, model pieni): -i → -e- in the vowel stem (kielen); the partitive uses the consonant stem (kieltä). Must be learned with the word: tili and tuoli look similar but are pankki-type.',
    'Kieli-tyyppi: kielen, kieltä. Tyyppi opitaan sanan mukana.',
  ),
  'type.k27.membership': m(
    'Uusi-type (Kotus {kotus}, model käsi): the s of the base form alternates with t and d in the stems (uusi → uuden, uutta). Must be learned with the word: lasi looks similar but is pankki-type.',
    'Uusi-tyyppi: s ~ t ~ d (uusi, uuden, uutta).',
  ),
  'type.k28.membership': m('kansi-type (Kotus {kotus}, model kynsi): -nsi/-rsi words with stems -nte-/-nne- (kansi → kannen, kantta).', 'Kynsi-tyyppi: kansi → kannen.'),
  'type.k29.membership': m('lapsi is the only word of its type (Kotus {kotus}): ps → s before the partitive (lasta, lasten). Memorize.', 'Lapsi: lasta, lasten.'),
  'type.k30.membership': m('veitsi-type (Kotus {kotus}): ts → s before the partitive (veistä).', 'Veitsi: veistä.'),
  'type.k31.membership': m('kaksi and yksi (Kotus {kotus}): ks ~ ht ~ hd (kaksi → kahden, kahta). Memorize.', 'Kaksi: kahden, kahta.'),
  'type.k32.membership': m('Consonant-final word like sisar (Kotus {kotus}): add -e- for the vowel stem (sisaren).', 'Sisar-tyyppi.'),
  'type.k33.membership': m('-in words like puhelin (Kotus {kotus}, model kytkin): vowel stem -ime- (puhelimen), partitive -inta.', 'Kytkin-tyyppi: puhelin → puhelimen.'),
  'type.k35.membership': m('lämmin is irregular (Kotus {kotus}): vowel stem lämpimä-. Memorize.', 'Lämmin: lämpimän.'),
  'type.k38.membership': m('Every -nen word (Kotus {kotus}, model nainen): vowel stem -se-, consonant stem -s- (naisen, naista). Fully predictable.', 'Nainen-tyyppi: kaikki -nen-sanat.'),
  'type.k39.membership': m('-s words like vastaus (Kotus {kotus}): vowel stem -kse- (vastauksen).', 'Vastaus-tyyppi: vastauksen.'),
  'type.k40.membership': m('-us/-ys nouns made from adjectives like terveys (Kotus {kotus}, model kalleus): -ude-/-ute- in the singular, -uksi- in the plural.', 'Kalleus-tyyppi: terveyden, terveyksiä.'),
  'type.k41.membership': m('-as/-äs/-is words like vieras (Kotus {kotus}): vowel stem with a long vowel (vieraan).', 'Vieras-tyyppi: vieraan.'),
  'type.k42.membership': m('mies is the only word of its type (Kotus {kotus}): stem miehe-. Memorize.', 'Mies: miehen, miestä.'),
  'type.k43.membership': m('-ut/-yt words like olut (Kotus {kotus}, model ohut): vowel stem -ue-/-ye- (oluen).', 'Ohut-tyyppi: oluen.'),
  'type.k44.membership': m('kevät (Kotus {kotus}): vowel stem with a long vowel (kevään). Memorize.', 'Kevät: kevään.'),
  'type.k48.membership': m(
    '-e word (Kotus {kotus}, model hame): the vowel stem has a long ee (perhe → perheen), partitive -tta/-ttä.',
    'Hame-tyyppi: perheen, perhettä.',
  ),

  /* ---------------- stems ---------------- */
  'stem.same': m('The vowel stem (vokaalivartalo) is the base form itself: {to}.', 'Vokaalivartalo on sama kuin perusmuoto.'),
  'stem.i-to-e': m('The final -i becomes -e- in the stem: i → e.', 'Vartalossa i → e.'),
  'stem.consonant.drop-i': m(
    'Consonant stem (konsonanttivartalo): drop the final -i. Endings beginning with t (-ta/-tä, -ten) attach here.',
    'Konsonanttivartalo: i katoaa (kiel-).',
  ),
  'stem.consonant.m-to-n': m('Consonant stem: -mi becomes -n- (lumi → lun-), because Finnish has no m before t.', 'Konsonanttivartalo: m → n (lunta).'),
  'stem.si-to-te': m(
    'Vowel stem: -si becomes -te-. The s of the base form goes back to an old t that changed to s before i.',
    'Vokaalivartalo: si → te (uute-, vete-).',
    { en: 'Historical assibilation: *ti > si before i. The stem keeps t: uute-/uude-.', fi: 'Historiallinen ti > si -muutos; vartalossa t.' },
  ),
  'stem.consonant.si-to-t': m('Consonant stem: -si becomes -t (uusi → uut-). With the partitive -ta this gives tt: uutta.', 'Konsonanttivartalo: si → t (uutta).'),
  'stem.consonant.psi-to-s': m('Consonant stem: lapsi → las- (ps simplifies to s). This is why the partitive is lasta.', 'Konsonanttivartalo: las- (lasta).'),
  'stem.consonant.tsi-to-s': m('Consonant stem: veitsi → veis- (ts simplifies to s): veistä.', 'Konsonanttivartalo: veis-.'),
  'stem.ksi-to-hte': m('Vowel stem: -ksi becomes -hte-/-hde- (kaksi → kahte-, kahde-).', 'Vokaalivartalo: kahte-, kahde-.'),
  'stem.consonant.ksi-to-h': m('Consonant stem: kaksi → kah-, so the partitive is kahta.', 'Konsonanttivartalo: kah- (kahta).'),
  'stem.e-to-ee': m('Vowel stem: -e words get a long ee (perhe → perhee-).', 'Vokaalivartalossa pitkä ee (perhee-).'),
  'stem.add-e': m('Vowel stem: add -e- after the final consonant (sisar → sisare-).', 'Vokaalivartaloon tulee e.'),
  'stem.n-to-me': m('Vowel stem: -in becomes -ime- (puhelin → puhelime-).', 'Vokaalivartalo: n → me (puhelime-).'),
  'stem.n-to-ma': m('Vowel stem: lämmin → lämpimä- (irregular).', 'Vokaalivartalo: lämpimä-.'),
  'stem.nen-to-se': m('Vowel stem: -nen becomes -se- (nainen → naise-). This works for every -nen word.', 'Vokaalivartalo: nen → se (naise-).'),
  'stem.consonant.nen-to-s': m('Consonant stem: -nen becomes -s- (nais-): naista, naisten.', 'Konsonanttivartalo: nais-.'),
  'stem.s-to-kse': m('Vowel stem: final -s becomes -kse- (vastaus → vastaukse-).', 'Vokaalivartalo: s → kse.'),
  'stem.s-to-te': m('Vowel stem: final -s becomes -te-/-de- (terveys → terveyte-, terveyde-).', 'Vokaalivartalo: s → te/de.'),
  'stem.consonant.s-to-t': m('Consonant stem: final -s becomes -t (terveys → terveyt-): terveyttä.', 'Konsonanttivartalo: s → t.'),
  'stem.s-lengthen': m('Vowel stem: the -s disappears and the vowel before it becomes long (vieras → vieraa-).', 'Vokaalivartalo: s katoaa, vokaali pitenee.'),
  'stem.s-to-he': m('Vowel stem: mies → miehe- (s becomes he). Irregular — memorize.', 'Vokaalivartalo: miehe-.'),
  'stem.t-to-e': m('Vowel stem: final -t becomes -e- (olut → olue-).', 'Vokaalivartalo: t → e.'),
  'stem.t-lengthen': m('Vowel stem: the -t disappears and the vowel becomes long (kevät → kevää-).', 'Vokaalivartalo: kevää-.'),
  'stem.consonant.lemma': m('The consonant stem is the base form itself. Endings beginning with t attach directly: {to}-ta.', 'Konsonanttivartalo on sama kuin perusmuoto.'),

  /* ---------------- consonant gradation ---------------- */
  'grade.weak': m('Weak grade (heikko aste): {from} → {to}.', 'Heikko aste: {from} → {to}.'),
  'grade.weak.closed-syllable': m(
    'Weak grade (heikko aste) {from} → {to}: the ending {ending} closes the syllable after the consonant, so the weak grade appears.',
    'Heikko aste {from} → {to}, koska pääte {ending} sulkee tavun.',
    { en: 'Gradation: the onset of a closed syllable takes the weak grade.', fi: 'Umpitavun alussa heikko aste.' },
  ),
  'grade.weak.long-plural': m(
    'Weak grade {from} → {to} in the long plural (-oita, -oiden): in these three-syllable words the plural syllable counts as closed.',
    'Pitkissä monikkomuodoissa heikko aste.',
  ),
  'grade.strong.open-syllable': m(
    'Strong grade (vahva aste) {strong} stays: the ending {ending} keeps the syllable open.',
    'Vahva aste {strong}: tavu pysyy avoimena.',
  ),
  'grade.strong.illative': m(
    'Strong grade {strong} in the illative, even though the syllable looks closed — the illative ending was historically -hen, which kept the syllable open.',
    'Illatiivissa aina vahva aste.',
  ),
  'grade.strong.base': m('The base form has the strong grade (vahva aste): {strong}.', 'Perusmuodossa on vahva aste: {strong}.'),
  'grade.inverse.strong-stem': m(
    'Inverse gradation (käänteinen astevaihtelu): the base form has the weak grade, the stem has the strong grade: {from} → {to}.',
    'Käänteinen astevaihtelu: perusmuodossa heikko aste, vartalossa vahva ({from} → {to}).',
  ),
  'grade.inverse.weak-base': m(
    'This form is built on the base form, which has the weak grade ({weak}) — the stem forms have the strong grade.',
    'Perusmuodossa heikko aste ({weak}).',
  ),

  /* ---------------- plural ---------------- */
  'plural.t': m('Plural nominative: weak-grade stem + -t (the -t is the plural marker here).', 'Monikon nominatiivi: vartalo + t.'),
  'plural.i': m('The plural marker -i- (monikon tunnus).', 'Monikon tunnus i.'),
  'plural.append': m('Plural stem: add the plural marker -i- (talo → taloi-).', 'Monikkovartalo: talo + i.'),
  'plural.a-to-o': m('Plural stem: {from} → {to} before the plural -i- (kauppa → kauppoi-).', 'Monikossa {from} → {to}.'),
  'plural.drop-final': m('Plural stem: the final -{from} drops before the plural -i- (koira → koiri-, kiele- → kieli-).', 'Monikossa {from} katoaa.'),
  'plural.i-to-e': m('Plural stem: the stem -i becomes -e- before the plural -i- (pankki → pankkei-).', 'Monikossa i → e (pankkeja).'),
  'plural.shorten': m('Plural stem: the long vowel {from} shortens before the plural -i- (maa → mai-, perhee- → perhei-).', 'Pitkä vokaali lyhenee (maita).'),
  'plural.diphthong': m('Plural stem: the diphthong {from} loses its first vowel before -i- (työ → töi-, tie → tei-).', 'Diftongi muuttuu (töitä).'),
  'plural.lemma': m('Plural stem: the -si- stays (uusi- + a → uusia). In the singular stems you see t/d instead.', 'Monikkovartalo uusi-.'),
  'plural.ks': m('Plural stem: -s becomes -ksi- (terveys → terveyksi-).', 'Monikkovartalo -ksi-.'),

  /* ---------------- endings ---------------- */
  'ending.nominative': m('Nominative (nominatiivi): no ending.', 'Nominatiivi: ei päätettä.'),
  'ending.genitive': m('Genitive (genetiivi): -n on the vowel stem. The -n closes the syllable, so words with gradation show the weak grade (kaupan); inverse words like sade keep the strong vowel stem (sateen).', 'Genetiivi: vokaalivartalo + n.'),
  'ending.partitive.a': m('Partitive (partitiivi) {ending}: after a short vowel at the end of the stem.', 'Partitiivi {ending} lyhyen vokaalin jälkeen.'),
  'ending.partitive.ta-vowel': m('Partitive {ending}: after a long vowel or two vowels (maata, radiota).', 'Partitiivi {ending} pitkän vokaalin tai kahden vokaalin jälkeen.'),
  'ending.partitive.ta-consonant': m('Partitive {ending}: on the consonant stem (kieltä, naista, uutta).', 'Partitiivi {ending} konsonanttivartaloon.'),
  'ending.partitive.tta': m('Partitive {ending}: -e words take -tta/-ttä (perhettä, huonetta).', 'E-loppuiset sanat: -tta/-ttä.'),
  'ending.inessive': m('Inessive (inessiivi) {ending}: "in, inside".', 'Inessiivi {ending}: missä?'),
  'ending.elative': m('Elative (elatiivi) {ending}: "from inside, out of".', 'Elatiivi {ending}: mistä?'),
  'ending.illative.vn': m('Illative (illatiivi): repeat the last vowel + n ({ending}): "into".', 'Illatiivi: vokaali + n ({ending}).'),
  'ending.illative.hvn': m('Illative after a one-syllable long vowel or diphthong: h + the vowel + n ({ending}): maahan, työhön.', 'Illatiivi -hVn yksitavuisissa: maahan.'),
  'ending.illative.seen': m('Illative -seen after a long vowel in a longer word (perheeseen, vieraaseen).', 'Illatiivi -seen pitkän vokaalin jälkeen.'),
  'ending.adessive': m('Adessive (adessiivi) {ending}: "on, at; having; by means of".', 'Adessiivi {ending}: millä? missä?'),
  'ending.ablative': m('Ablative (ablatiivi) {ending}: "from (a surface or person)".', 'Ablatiivi {ending}: miltä? mistä?'),
  'ending.allative': m('Allative (allatiivi) {ending}: "to, onto; to a person".', 'Allatiivi {ending}: mille? kenelle?'),
  'ending.essive': m('Essive (essiivi) {ending}: "as, in the role of"; also times (maanantaina).', 'Essiivi {ending}: minä? millaisena?'),
  'ending.translative': m('Translative (translatiivi) {ending}: "becoming, into (a state)".', 'Translatiivi {ending}: miksi?'),
  'ending.abessive': m('Abessive (abessiivi) {ending}: "without" — rare; usually ilman + partitive is used.', 'Abessiivi {ending}: ilman. Harvinainen.'),
  'ending.comitative': m('Comitative (komitatiivi) -ine-: "together with". Nouns always add a possessive suffix.', 'Komitatiivi -ine- + omistusliite.'),
  'ending.comitative.agreement': m('Adjectives and numerals in the comitative take -ine without a possessive suffix (uusine taloineen).', 'Määrite: -ine ilman omistusliitettä.'),
  'ending.instructive': m('Instructive (instruktiivi) -in: "by means of" — only in fixed expressions (käsin, omin silmin, paljain jaloin).', 'Instruktiivi: vakiintuneet ilmaukset.'),
  'ending.genitive-pl.en': m('Plural genitive -en after the plural -i- (written -jen between vowels: talojen; koirien).', 'Monikon genetiivi -en/-jen.'),
  'ending.genitive-pl.vowel-en': m('Plural genitive: pankki-type words add -en to the -i stem (pankkien).', 'Monikon genetiivi: pankkien.'),
  'ending.genitive-pl.den': m('Plural genitive -den after a long plural stem (maiden, perheiden).', 'Monikon genetiivi -iden.'),
  'ending.genitive-pl.tten': m('Plural genitive -tten — a less common alternative to -den (maitten).', 'Monikon genetiivi -itten.'),
  'ending.genitive-pl.ten': m('Plural genitive -ten on the consonant stem (kielten, naisten, lasten).', 'Monikon genetiivi -ten konsonanttivartaloon.'),
  'ending.partitive-pl.a': m('Plural partitive {ending} after the plural -i- (written -ja/-jä between vowels: taloja; kieliä).', 'Monikon partitiivi -a/-ja.'),
  'ending.partitive-pl.ta': m('Plural partitive -ita/-itä after a long plural stem (maita, perheitä).', 'Monikon partitiivi -ita.'),
  'ending.illative-pl.hin': m('Plural illative -hin after a vowel + i (taloihin, maihin).', 'Monikon illatiivi -ihin.'),
  'ending.illative-pl.in': m('Plural illative: the plural -i- becomes long (-iin) after a consonant (kieliin, koiriin).', 'Monikon illatiivi -iin.'),
  'ending.illative-pl.siin': m('Plural illative -isiin after a long-vowel stem (perheisiin, vieraisiin).', 'Monikon illatiivi -isiin.'),

  /* ---------------- vowel harmony & spelling ---------------- */
  'harmony.back': m('Vowel harmony (vokaalisointu): the word has back vowels ({vowels}), so the ending uses a/o/u: {ending}.', 'Takavokaalit ({vowels}) → pääte {ending}.'),
  'harmony.front': m('Vowel harmony: the word has front vowels ({vowels}), so the ending uses ä/ö/y: {ending}.', 'Etuvokaalit ({vowels}) → pääte {ending}.'),
  'harmony.neutral-only': m('Vowel harmony: the word has only e and i (neutral vowels), so it takes front endings: {ending}.', 'Vain e ja i → etuvokaalipääte {ending}.'),
  'harmony.compound-head': m('In a compound, vowel harmony follows the last part ({part}): {ending}.', 'Yhdyssanassa viimeinen osa ({part}) ratkaisee.'),
  'harmony.lexical': m('This word has fixed vowel harmony that must be learned.', 'Sanan vokaalisointu on opittava.'),
  'spelling.plural-glide': m('Spelling: the plural -i- is written j between two vowels (talo + i + a → taloja).', 'Monikon i kirjoitetaan j vokaalien välissä.'),
  'spelling.j-glide': m(
    'Spelling: when k disappears, the i between vowels is written j (aika → ajan, poika → pojan). Only in some words — taika → taian.',
    'Joissakin sanoissa i → j (ajan, pojan).',
  ),
  'spelling.apostrophe': m('Spelling: when k disappears between two identical vowels, an apostrophe marks the syllable break (vaaka → vaa’an).', 'Heittomerkki: vaa’an.'),

  /* ---------------- possessive suffixes ---------------- */
  'px.1sg': m('Possessive suffix -ni "my" (omistusliite).', 'Omistusliite -ni (minun).'),
  'px.2sg': m('Possessive suffix -si "your" (one person).', 'Omistusliite -si (sinun).'),
  'px.3.nsa': m('Possessive suffix -nsa/-nsä "his, her, their".', 'Omistusliite -nsa/-nsä (hänen, heidän).'),
  'px.3.vn': m(
    'Third person: after a short vowel, the suffix can also be the vowel repeated + n (talossaan = talossansa). Not after the genitive or illative, which end in -n: taloonsa, taloihinsa.',
    'Kolmas persoona: myös -Vn (talossaan), mutta ei genetiivissä eikä illatiivissa (taloonsa).',
  ),
  'px.1pl': m('Possessive suffix -mme "our".', 'Omistusliite -mme (meidän).'),
  'px.2pl': m('Possessive suffix -nne "your" (several people).', 'Omistusliite -nne (teidän).'),
  'px.3.comitative-vn': m('The comitative carries a possessive suffix; -en is the usual third-person form (taloineen).', 'Komitatiivi: -ineen.'),
  'px.3.comitative-nsa': m('The comitative can also take -nsa/-nsä (taloinensa).', 'Komitatiivi: myös -inensa.'),
  'px.base.strong-grade': m(
    'Before a possessive suffix the ending {ending} disappears; the syllable becomes open again, so the strong grade comes back (kaupan → kauppani).',
    'Pääte {ending} katoaa ja vahva aste palaa (kauppani).',
  ),
  'px.base.vowel-stem': m('Before a possessive suffix the ending {ending} disappears; the suffix attaches to the vowel stem.', 'Omistusliite vokaalivartaloon.'),
  'px.drop-n': m('The final -n of the ending drops before the possessive suffix (taloon → talooni).', 'Päätteen n katoaa (talooni).'),
  'px.ksi-to-kse': m('Translative -ksi becomes -kse- before a possessive suffix (taloksi → talokseni).', 'Translatiivi -ksi → -kse- (talokseni).'),
  'px.not-used': m('This case is not used with possessive suffixes.', 'Ei käytetä omistusliitteen kanssa.'),

  /* ---------------- accusative & status ---------------- */
  'acc.sg.n': m('Accusative (akkusatiivi) = the -n form: a whole, finished object (Ostan auton).', 'Akkusatiivi -n: Ostan auton.'),
  'acc.sg.zero': m(
    'Accusative = the base form in some sentences: after commands, in passive and with "täytyy" (Osta auto! Auto ostettiin.).',
    'Akkusatiivi ilman päätettä: Osta auto!',
  ),
  'acc.pl.t': m('Plural accusative = plural nominative (-t): Ostin autot.', 'Monikon akkusatiivi -t.'),
  'slot.comitative.singular': m('There is no singular comitative: the comitative always uses the plural stem, even for one thing (vaimoineen).', 'Komitatiivi on aina monikkomuotoinen.'),
  'slot.instructive.singular': m('The singular instructive is not used productively — only the plural appears, in fixed expressions.', 'Yksikön instruktiivia ei käytetä.'),
  'number.mass': m('Usually only singular: this is a mass noun (ainesana). Plural forms exist but are rare.', 'Ainesana: monikko harvinainen.'),
  'number.pl-rare': m('The plural of this word is rarely used.', 'Monikkoa käytetään harvoin.'),

  /* ---------------- lexical exceptions & variants ---------------- */
  'exception.merta-verta': m(
    'Exception: by vowel harmony you would expect -tä, but the partitive is merta / verta. Memorize these two.',
    'Poikkeus: merta, verta (ei *mertä).',
  ),
  'irregular.vuonna': m(
    'vuonna is a special essive used for years and with tänä/viime/ensi: vuonna 2024, tänä vuonna. The regular vuotena also exists ("as a year, during a year").',
    'Vuonna 2024, tänä vuonna. Myös säännöllinen vuotena.',
  ),
  'variant.ruoka-ruua': m('Both ruoan and ruuan are correct (also ruoassa ~ ruuassa).', 'Sekä ruoan että ruuan ovat oikein.'),

  /* ---------------- word notes ---------------- */
  'note.koti-kotona': m(
    '"At home" is kotona, "from home" kotoa and "(to) home" kotiin — old forms that you learn as words. The regular kodissa means "in a (care) home".',
    'Kotona, kotoa, kotiin.',
  ),
  'note.mokilla': m('Mökki takes outer locative cases: olla mökillä, mennä mökille.', 'Mökillä, mökille.'),
  'note.laakarissa': m('lääkärissä means "at the doctor\'s": Olin lääkärissä.', 'Olla lääkärissä.'),
  'note.jarvella': m('järvellä = on/at the lake (boating, at a lakeside cottage); järvessä = in the water of the lake (swimming).', 'Järvellä / järvessä.'),
  'note.henkea': m('In counting people: viisi henkeä = five people. The plural genitive appears in henkien.', 'Viisi henkeä.'),
  'note.onnea': m('Onnea! = "Good luck!" or "Congratulations!" (partitive).', 'Onnea!'),
  'note.jalkeen': m('The postposition jälkeen "after" is originally the illative of jälki: syömisen jälkeen.', 'Jälkeen = jonkin jälkeen.'),
  'note.juuri-adverb': m('juuri is also an adverb "just, exactly" — a different word that does not inflect.', 'Juuri myös adverbi.'),
  'note.tuli-verb': m('tuli is also a verb form: Hän tuli = "He came".', 'Tuli myös verbi (hän tuli).'),
  'note.uusin': m('uusin is a real word — but it means "newest" (the superlative), not the genitive of uusi.', 'Uusin = superlatiivi.'),
  'note.kasin': m('käsin "by hand" is the plural instructive: tehty käsin.', 'Käsin = instruktiivi.'),
  'note.vuonna': m('With years: vuonna 2024, tänä vuonna, viime vuonna.', 'Vuonna 2024.'),
  'note.totta': m('totta "true": Se on totta. tosi is also an intensifier: tosi hyvä "really good".', 'Se on totta.'),
  'note.ajoissa': m('ajoissa "on time" is the plural inessive of aika: Olin ajoissa.', 'Ajoissa = oikeaan aikaan.'),
  'note.kassalla': m('kassalla "at the checkout" uses the outer locative.', 'Kassalla.'),
  'note.kylassa': m('olla kylässä also means "to be visiting someone".', 'Olla kylässä.'),
  'note.kello': m('Telling time: kello kolme "at three o\'clock"; Paljonko kello on?', 'Kello on kolme.'),
  'note.kerroksessa': m('Floors: kolmannessa kerroksessa "on the third floor".', 'Kolmannessa kerroksessa.'),
  'note.toissa': m('töissä "at work" and töihin "to work" are the everyday plural forms of työ.', 'Töissä, töihin.'),
  'note.suomi': m(
    'suomi (lower case) is the Finnish language: Puhun suomea, Mitä se on suomeksi? Suomi (capital S) is Finland: Asun Suomessa.',
    'suomi = kieli (puhun suomea), Suomi = maa (asun Suomessa).',
  ),
  'note.torilla': m('Market squares take the outer cases: torilla "at the market", torille "to the market".', 'Torilla, torille.'),
  'note.jonossa': m('olla jonossa "to be in a queue"; Jonota tähän = "Queue here".', 'Olla jonossa.'),
  'note.maanantaina': m('Days of the week take the essive: maanantaina "on Monday".', 'Maanantaina.'),

  /* ---------------- classification of unknown words ---------------- */
  'classify.verify': m('This is a guess from the spelling. Check the word in a dictionary (Kielitoimiston sanakirja) before relying on it.', 'Arvio kirjoitusasun perusteella.'),
  'classify.i-cannot-know': m(
    'Words ending in -i come in several types that cannot be told apart by spelling (lasi / käsi, tili / tiili). Learn the genitive and partitive with the word.',
    'I-loppuisten sanojen tyyppi ei näy kirjoitusasusta.',
  ),
  'classify.nen': m('Every -nen word follows nainen.', 'Kaikki -nen-sanat.'),
  'classify.us-verbal': m('-us/-ys nouns made from verbs follow vastaus (vastauksen).', 'Verbistä: vastaus.'),
  'classify.us-adjectival': m('-us/-ys nouns made from adjectives follow kalleus (terveyden).', 'Adjektiivista: terveys.'),
  'classify.os': m('-os/-ös words usually follow vastaus (kerroksen).', 'Vastaus-tyyppi.'),
  'classify.as': m('-as/-äs/-is words usually follow vieras (vieraan).', 'Vieras-tyyppi.'),
  'classify.in': m('-in words usually follow puhelin (puhelimen).', 'Kytkin-tyyppi.'),
  'classify.at': m('-ät/-at words like kevät have a long-vowel stem.', 'Kevät-tyyppi.'),
  'classify.ut': m('-ut/-yt words usually follow ohut (oluen).', 'Ohut-tyyppi.'),
  'classify.monosyllable-diphthong': m('One-syllable words with ie, uo, yö follow suo (työ → töitä).', 'Suo-tyyppi.'),
  'classify.monosyllable-long': m('One-syllable words with a long vowel follow maa (maata, maahan).', 'Maa-tyyppi.'),
  'classify.e': m('Most -e words follow hame (perheen); some short loanwords like nalle do not.', 'Useimmiten hame-tyyppi.'),
  'classify.si': m('-si words are often uusi-type (uuden) — but not lasi or suksi.', 'Usein uusi-tyyppi.'),
  'classify.i-new-word': m('Newer words and loanwords in -i are usually pankki-type (bussin, bussia).', 'Uudet sanat: pankki-tyyppi.'),
  'classify.i-old-word': m('Old Finnish words in -i are often lehti-type (lehden, lehteä).', 'Vanhat sanat: lehti-tyyppi.'),
  'classify.li-ni-ri': m('Old words in -li, -ni, -ri with a long vowel or diphthong are often kieli-type (tuulen, tuulta).', 'Usein kieli-tyyppi.'),
  'classify.i-long-loan': m('Longer loanwords in -i usually follow paperi (paperin, papereita).', 'Paperi-tyyppi.'),
  'classify.ea': m('-ea/-eä words follow korkea (vihreän).', 'Korkea-tyyppi.'),
  'classify.a-front': m('Two-syllable -ä words follow koira: the ä drops in the plural (päiviä).', 'Koira-tyyppi.'),
  'classify.a-first-ou': m('Two-syllable -a words with o or u in the first syllable follow koira (koiria).', 'Koira-tyyppi.'),
  'classify.a-first-aei': m('Two-syllable -a words with a, e or i in the first syllable follow kala (kaloja).', 'Kala-tyyppi.'),
  'classify.a-three-syllables': m('Longer -a/-ä words often follow kulkija (ravintoloita).', 'Kulkija-tyyppi.'),
  'classify.a-drop': m('Some longer -a/-ä words drop the vowel in the plural (ystäviä).', 'Koira-tyyppi.'),
  'classify.io': m('Words in -io, -iö, -eo follow valtio (radiota).', 'Valtio-tyyppi.'),
  'classify.o-two-syllables': m('Two-syllable -o/-u/-y/-ö words follow valo (talon, taloja).', 'Valo-tyyppi.'),
  'classify.o-three-syllables': m('Longer -o/-u words often follow palvelu (two plural series).', 'Palvelu-tyyppi.'),
  'classify.consonant': m('Consonant-final words are usually loanwords or follow sisar.', 'Konsonanttiloppuinen.'),
  'classify.loanword-consonant': m('New loanwords ending in a consonant usually add -i- (rock → rockin).', 'Lainasana.'),
  'classify.may-gradate': m(
    'This word has kk/pp/tt/k/p/t before the last vowel, so it may have consonant gradation — if it is an older Finnish word.',
    'Sanassa voi olla astevaihtelua.',
  ),
}

import type { ExampleSentence } from '../../types/content'
import { s } from './build'

/** Sentences that show each case in use. Ids: c.<case>.<n>. */
export const CASE_SENTENCES: ExampleSentence[] = [
  // Nominative — subject, "X on Y", existential with one countable thing
  s('c.nom.1', '{*koira} nukkuu sohvalla.', 'The dog is sleeping on the sofa.'),
  s('c.nom.2', 'Tämä on {*talo}.', 'This is a house.'),
  s('c.nom.3', '{*lapsi:pl.nom} leikkivät {piha:ade}.', 'The children are playing in the yard.'),
  s('c.nom.4', '{pöytä:ade} on {*kirja}.', 'There is a book on the table.'),
  s('c.nom.5', '{*kauppa} on lähellä.', 'The shop is nearby.'),
  s('c.nom.6', '{*vesi} on kylmää.', 'The water is cold.', { level: 8 }),

  // Genitive — possession, relations, postpositions, necessity
  s('c.gen.1', '{*talo:gen} {ovi} on {punainen}.', 'The door of the house is red.'),
  s('c.gen.2', '{*pankki:gen} {johtaja} tulee huomenna.', 'The bank manager is coming tomorrow.', { level: 2 }),
  s('c.gen.3', '{*lapsi:gen} lelu on {lattia:ade}.', "The child's toy is on the floor."),
  s('c.gen.4', '{auto} on {*talo:gen} edessä.', 'The car is in front of the house.'),
  s('c.gen.5', '{*kieli:gen} rakenne on looginen.', 'The structure of the language is logical.', { level: 2 }),
  s('c.gen.6', '{*kauppa:gen} {ovi} on kiinni.', 'The shop door is closed.'),
  s('c.gen.7', '{*lapsi:gen} täytyy nukkua.', 'The child has to sleep.', { level: 8 }),
  s('c.gen.8', '{kirja} on {*pöytä:gen} alla.', 'The book is under the table.'),
  s('c.gen.9', 'Pidän {*uusi+auto:gen} väristä.', 'I like the colour of the new car.', { level: 8 }),

  // Partitive — mass, negation, numbers, unfinished action, some verbs
  s('c.par.1', 'Juon {*vesi:par}.', 'I drink water.'),
  s('c.par.2', 'En juo {*kahvi:par}.', "I don't drink coffee."),
  s('c.par.3', 'Minulla ei ole {*auto:par}.', "I don't have a car."),
  s('c.par.4', 'Meillä on {kaksi} {*lapsi:par}.', 'We have two children.'),
  s('c.par.5', 'Ostan {*omena:pl.par}.', "I'm buying (some) apples."),
  s('c.par.6', 'Luen {*kirja:par}.', "I'm reading a book (I haven't finished it)."),
  s('c.par.7', 'Odotan {*bussi:par}.', "I'm waiting for the bus."),
  s('c.par.8', 'Ostan {kilo:acc} {*mansikka:pl.par}.', "I'm buying a kilo of strawberries.", { level: 6 }),
  s('c.par.9', '{lasi} on täynnä {*vesi:par}.', 'The glass is full of water.', { level: 5 }),
  s('c.par.10', 'Autan {*äiti:par}.', "I'm helping mother."),
  s('c.par.11', 'Puhun {*suomi:par}.', 'I speak Finnish.'),
  s('c.par.12', '{kauppa:ine} on paljon {*ihminen:pl.par}.', 'There are a lot of people in the shop.', { level: 3 }),
  s('c.par.13', 'Ostan {*auto:par}.', "I'm buying a car (in the middle of buying — not finished)."),
  s('c.par.14', 'Ostan {*auto:pl.par}.', "I'm buying (some) cars."),

  // Accusative — a whole, completed object
  s('c.acc.1', 'Ostan {*auto:acc}.', "I'll buy the car (the whole car, the purchase is completed)."),
  s('c.acc.2', 'Osta {*maito:acc0}!', 'Buy the milk!', { level: 8 }),
  s('c.acc.3', 'Söin {*omena:acc}.', 'I ate an apple (all of it).'),
  s('c.acc.4', 'Ostin {*omena:pl.acc}.', 'I bought the apples.'),
  s('c.acc.5', 'Luin {*kirja:acc} loppuun.', 'I read the book to the end.'),
  s('c.acc.6', 'Näen {*kauppa:acc}.', 'I see the shop.'),

  // Inessive — in, inside
  s('c.ine.1', 'Minä olen {*talo:ine}.', 'I am in the house.'),
  s('c.ine.2', 'Asumme {*kaupunki:ine}.', 'We live in a city.'),
  s('c.ine.3', 'Istun {*bussi:ine}.', "I'm sitting on the bus."),
  s('c.ine.4', '{lapsi:pl.nom} ovat {*päiväkoti:ine}.', 'The children are at daycare.', { level: 5 }),
  s('c.ine.5', 'Käyn {*kauppa:ine} joka {päivä}.', 'I go to the shop every day.', { tags: ['shop', 'yki'] }),
  s('c.ine.6', 'Teen sen {*tunti:ine}.', "I'll do it in an hour.", { level: 2 }),
  s('c.ine.7', 'Asun {*^suomi:ine}.', 'I live in Finland.'),

  // Elative — out of, from inside; about; liking; material
  s('c.ela.1', 'Tulen {*kauppa:ela}.', "I'm coming from the shop."),
  s('c.ela.2', 'Otan {maito:acc} {*kaappi:ela}.', 'I take the milk out of the cupboard.', { level: 4 }),
  s('c.ela.3', 'Pidän {*kahvi:ela}.', 'I like coffee.'),
  s('c.ela.4', 'Puhumme {*ruoka:ela}.', "We're talking about food."),
  s('c.ela.5', '{pöytä} on tehty {*puu:ela}.', 'The table is made of wood.'),

  // Illative — into, to
  s('c.ill.1', 'Menen {*kauppa:ill}.', "I'm going to the shop."),
  s('c.ill.2', 'Muutamme {*uusi+asunto:ill}.', "We're moving into a new apartment."),
  s('c.ill.3', 'Laitan {maito:acc} {*kaappi:ill}.', 'I put the milk in the cupboard.', { level: 4 }),
  s('c.ill.4', 'Lähden {*työ:pl.ill}.', "I'm leaving for work."),
  s('c.ill.5', 'Menemme {*sauna:ill}.', "We're going to the sauna."),
  s('c.ill.6', '{lapsi} menee {*koulu:ill}.', 'The child goes to school.'),
  s('c.ill.7', 'He muuttivat toiseen {*maa:ill}.', 'They moved to another country.'),
  s('c.ill.8', 'Menen {*huone:ill}.', "I'm going into the room.", { level: 2 }),
  s('c.ill.9', 'Menin {*kauppa:ill}.', 'I went to the shop.'),
  s('c.ill.10', 'Muutin {*^suomi:ill} {kaksi} {vuosi:par} sitten.', 'I moved to Finland two years ago.', { level: 2 }),

  // Adessive — on, at; having; by means of; time
  s('c.ade.1', '{kirja} on {*pöytä:ade}.', 'The book is on the table.'),
  s('c.ade.2', '{*äiti:ade} on {uusi+auto}.', 'Mother has a new car.'),
  s('c.ade.3', 'Matkustan {työ:pl.ill} {*bussi:ade}.', 'I travel to work by bus.'),
  s('c.ade.4', 'Olemme {*asema:ade}.', "We're at the station.", { level: 2 }),
  s('c.ade.5', '{*ilta:ade} katson {elokuva:acc}.', 'In the evening I watch a film.', { level: 2 }),
  s('c.ade.6', '{*talvi:ade} on {kylmä}.', "It's cold in winter.", { level: 2 }),
  s('c.ade.7', 'Maksan {*kortti:ade}.', "I'll pay by card.", { level: 4 }),
  s('c.ade.8', 'Ostan vihanneksia {*tori:ade}.', 'I buy vegetables at the market.', { level: 2 }),

  // Ablative — from (a surface, outer place or person); looks/tastes like
  s('c.abl.1', 'Otan {kirja:acc} {*pöytä:abl}.', 'I take the book from the table.'),
  s('c.abl.2', 'Sain {kirje:acc} {*ystävä:abl}.', 'I got a letter from a friend.', { level: 2 }),
  s('c.abl.3', 'Tulen {*asema:abl}.', "I'm coming from the station.", { level: 2 }),
  s('c.abl.4', '{ruoka} näyttää {*hyvä:abl}.', 'The food looks good.'),
  s('c.abl.5', 'Kysyn {*lääkäri:abl}.', "I'll ask the doctor.", { level: 2 }),
  s('c.abl.6', 'Lähdemme {*mökki:abl} {sunnuntai:ess}.', "We'll leave the cottage on Sunday.", { level: 2 }),

  // Allative — onto, to (a surface, outer place or person)
  s('c.all.1', 'Laitan {kirja:acc} {*pöytä:all}.', 'I put the book on the table.'),
  s('c.all.2', 'Annan {lahja:acc} {*äiti:all}.', 'I give the present to mother.', { level: 2 }),
  s('c.all.3', 'Soitan {*lääkäri:all}.', "I'll call the doctor.", { level: 2 }),
  s('c.all.4', 'Menemme {*mökki:all}.', "We're going to the cottage.", { level: 2 }),
  s('c.all.5', 'Tämä sopii {*lapsi:all}.', 'This suits the child.'),
  s('c.all.6', 'Menen {*tori:all}.', "I'm going to the market.", { level: 2 }),

  // Essive — as, in the role of; time
  s('c.ess.1', 'Hän työskentelee {*lääkäri:ess}.', 'She works as a doctor.', { level: 2 }),
  s('c.ess.2', '{*lapsi:ess} asuin {kylä:ine}.', 'As a child I lived in a village.'),
  s('c.ess.3', 'Tulen {*maanantai:ess}.', "I'll come on Monday.", { tags: ['time'], level: 2 }),
  s('c.ess.4', '{*vuosi:ess#1} 2024 muutin {^suomi:ill}.', 'In 2024 I moved to Finland.', { level: 2 }),
  s('c.ess.5', 'Käytän laatikkoa {*pöytä:ess}.', 'I use a box as a table.'),
  s('c.ess.6', 'Olen {*=kotona|koti:ess}.', "I'm at home."),

  // Translative — becoming; in a language
  s('c.tra.1', 'Hän opiskelee {*lääkäri:tra}.', 'She is studying to become a doctor.', { level: 2 }),
  s('c.tra.2', 'Mitä tämä on {*suomi:tra}?', 'What is this in Finnish?'),
  s('c.tra.3', '{sää} muuttui {*kylmä:tra}.', 'The weather turned cold.', { level: 2 }),
  s('c.tra.4', '{lapsi} kasvoi {*suuri:tra}.', 'The child grew big.'),
  s('c.tra.5', 'Haluan {*opettaja:tra}.', 'I want to become a teacher.'),

  // Abessive, comitative, instructive — rare cases
  s('c.abe.1', 'Hän lähti kotoa {*raha:abe}.', 'He left home without money.', { level: 2, tags: ['formal'] }),
  s('c.abe.2', 'Lähdin ilman {*raha:par}.', 'I left without money.', { level: 2 }),
  s('c.com.1', 'Hän tuli {juhla:pl.ill} {*lapsi:pl.com}.', 'She came to the party with her children.', { tags: ['formal'], level: 2 }),
  s('c.com.2', '{isä} saapui {*perhe:pl.com}.', 'Father arrived with his family.', { tags: ['formal'] }),
  s('c.ins.1', 'Tämä on tehty {*käsi:pl.ins}.', 'This is made by hand.'),
  s('c.ins.2', 'Näin sen omin {*silmä:pl.ins}.', 'I saw it with my own eyes.', { level: 2 }),
]

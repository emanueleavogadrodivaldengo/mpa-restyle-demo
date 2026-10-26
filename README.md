# MPA Style · demo del nuovo sito

Demo statica del nuovo mpastyle.it: HTML, CSS e pochissimo JavaScript, senza framework.
Segue la struttura approvata in "Nuovo sito MPA: proposta di struttura" ed è scritta per
diventare poi un tema WordPress.

Pagine di questa prima versione (italiano; l'inglese è previsto ma non ancora fatto):

| Pagina | File generato | In WordPress diventa |
|---|---|---|
| Home | `docs/index.html` | `front-page.php` |
| Lista news | `docs/news/index.html` | `home.php` / `archive.php` |
| Articolo (Heimtextil 2027, testo reale) | `docs/heimtextil-2027-si-presenta-a-milano/index.html` | `single.php` |
| Riviste (le sei testate) | `docs/magazines/index.html` | `page-magazines.php` |
| Pagina di ogni testata (sei, da un solo modello) | `docs/magazines/<testata>/index.html` | `category.php` |
| Calendario fiere | `docs/fairs/index.html` | `archive-fiera.php` |
| Academy | `docs/academy/index.html` | `page-academy.php` |
| Chi siamo | `docs/company/index.html` | `page-company.php` |
| Pubblicità e media kit (pagina nuova) | `docs/pubblicita/index.html` | `page-pubblicita.php` |
| Contatti | `docs/contacts/index.html` | `page-contacts.php` |

Gli indirizzi sono quelli di oggi (`/news/`, `/magazines/tannery/`, `/fairs/`, `/company/`,
`/academy/`, `/contacts/`, articoli alla radice; `/pubblicita/` è nuova): così, quando il tema andrà online, Google non perde nessuna pagina.

## Come si usa

```bash
node build.mjs                 # rigenera docs/ a partire da src/
npx serve docs                 # oppure: cd docs && python3 -m http.server
```

Serve Node.js 18 o più recente, nessun `npm install`. Va aperto con un piccolo server e non
con doppio clic sul file, perché i link puntano a cartelle (`news/`) e il browser da disco non
apre da solo `index.html`.

La cartella `docs/` è già generata e inclusa nel repo, così si può pubblicare con GitHub Pages
(Settings → Pages → branch `main`, cartella `/docs`). Non va modificata a mano: si cambia
`src/` e si rilancia la build.

## Prendere news e foto dal sito attuale

```bash
node scripts/scarica-news.mjs 20   # le ultime 20 news, con foto, titoli, date, estratti e categorie
```

Usa l'API che ogni WordPress ha all'indirizzo `/wp-json/`. Le foto finiscono in
`src/assets/img/news/`, i dati in `scripts/news-dal-sito.json`.

## Com'è organizzato

```
src/
  pages/      una cartella per pagina, con l'URL finale
  partials/   i blocchi riutilizzabili: header, footer, card news, copertina...
  data/       news.json e riviste.json: i contenuti, separati dalla grafica
  assets/     css/style.css, js/main.js, img/
build.mjs     ~140 righe: unisce pagine, blocchi e dati e scrive docs/
```

Nei file sorgente ci sono tre istruzioni, pensate per ricalcare WordPress:

| Nella demo | In WordPress |
|---|---|
| `{{> header}}` | `get_header()` |
| `{{> card-news}}` | `get_template_part('template-parts/card-news')` |
| `{{#news limit=6 offset=1}}` | il loop: `WP_Query` + `while (have_posts())` |
| `{{#fiere}}`, `{{#partner}}` | loop su tipi di contenuto "Fiera" e "Partner" |
| `pages/magazines/[rivista]/` | `category.php`: un modello, sei pagine |
| `{{title}}`, `{{date_human}}` | `the_title()`, `get_the_date()` |
| `data/news.json` | gli articoli nel database |

Ogni blocco inizia con un commento `<!-- BLOCCO ... → in WordPress ... -->` che dice in quale
file PHP andrà.

## Le scelte principali

**Prima il telefono.** Il CSS di base è per lo schermo piccolo; le regole `@media (min-width)`
aggiungono il desktop. Su telefono le card della lista hanno la foto piccola a sinistra, così in
una schermata si leggono 3-4 notizie invece di una.

**Velocità.** Niente librerie, un solo CSS (~24 KB) e un solo JS piccolo caricato con `defer`.
Un solo font da scaricare, per i titoli (vedi sotto); il testo usa i font del sistema. L'immagine dell'apertura ha
`fetchpriority="high"` e niente lazy loading; tutte le altre hanno `loading="lazy"`. Ogni
immagine ha `width` e `height`, così la pagina non "salta" mentre carica. Nel primo schermo non ci
sono animazioni: il contenuto principale compare subito (oggi ci mette ~5,9 s).

**Leggibilità delle news.** Articolo a 18 px con righe da ~70 caratteri, titolo sopra la foto,
sottotitolo e riga "di Redazione · data · tempo di lettura" in italiano, titoli in minuscolo
normale, date scritte per intero.

**Un font tutto nostro per i titoli.** Oswald (licenza libera OFL, `assets/fonts/`), condensato e
deciso come il logo STYLE. È un file da 28 KB servito dal sito stesso, non da Google Fonts: niente
richieste a server esterni e niente problemi di privacy. `font-display: swap` mostra subito il
testo e cambia font appena è arrivato; il `preload` nell'header lo fa partire per primo.

**Le riviste hanno un volto.** Ogni testata ha un colore (`--c-tannery` ecc.). Basta mettere
`data-rivista="tannery"` su un elemento e etichetta, foto segnaposto e copertina prendono quel
colore. In WordPress sarà il nome della categoria.

**Menu senza JavaScript.** Su telefono il menu è un `popover`: il pulsante ha
`popovertarget="menu"` e il browser apre e chiude il pannello da solo, con tasto Esc e clic fuori
già gestiti. Su desktop lo stesso `<nav>` diventa una barra orizzontale.

**Filtri come link.** I filtri per rivista sono link alle pagine delle testate, non pulsanti che
nascondono card: funzionano senza JavaScript, si possono condividere e in WordPress sono
semplicemente le categorie.

**Niente cookie.** La demo non carica Google Analytics, mappe incorporate o font di Google, quindi
non scrive cookie e non serve un banner. Sul sito vero il banner va messo prima di Analytics.
La mappa dei contatti è un link a OpenStreetMap invece di un iframe.

## Effetti (dalla demo "Effetti per MPA Style")

- **Scroll-reveal in CSS** (`.reveal`, `animation-timeline: view()`): le sezioni sotto il primo
  schermo salgono mentre scorri. 0 KB di JavaScript. Su Firefox il contenuto c'è, senza
  animazione.
- **Carosello scroll-snap** (`.carousel`): riviste in home, numeri precedenti, articoli
  correlati. Si trascina col dito; il JS serve solo alle frecce. Nessuna rotazione automatica.
- **View Transitions** (`@view-transition { navigation: auto; }`): dissolvenza tra le pagine, e la
  foto della card che "vola" nell'articolo grazie allo stesso `view-transition-name`.

Tutti e tre si spengono se nel sistema è attivo "riduci movimento". GSAP per ora no.

## Cosa è segnaposto

- **Foto delle news**: vere, scaricate dal sito con `scripts/scarica-news.mjs` (20 news). Larghe
  1024 px: per il carosello d'apertura ne servirebbero di più grandi.
- **Copertine**: vera solo Safety First n. 14; le altre sono segnaposto dichiarati.
- **Logo**: quello vero, in WebP. Meglio averlo in SVG (più nitido e più leggero).
- **Le più lette**: classifica di esempio, dichiarata. Sul sito vero arriva dalle statistiche. Le
  miniature quadrate 200×200 si rigenerano con `python3 scripts/miniature.py` (in WordPress le crea lui).
- **In evidenza**: le 4 notizie del carosello le ho scelte io (`"featured": true` in `news.json`).
- **Numeri per gli inserzionisti** (copie, iscritti, fiere, paesi): `00.000`, dichiarati.
- **Estratti delle news**: presi dal sito attuale, ripuliti dai codici di WPBakery e accorciati.
- **Rivista di ogni news**: dalla categoria WordPress quando c'è (Tannery, Safety First, Shoes and
  Bags); per le altre l'ho assegnata io in base all'argomento, da verificare.
- **Date e indirizzi**: veri, dal sito attuale.
- **Descrizioni delle riviste**, periodicità, link "Sfoglia" e "Abbonati": da completare.
- **Contatti**: numeri ed email sono quelli del sito di oggi; quale numero e quale email per
  la pubblicità va confermato. Nel footer resta un solo numero (redazione).
- **Moduli** (newsletter, contatti) e **ricerca**: grafica pronta, non inviano nulla.
- **Fiere**: le 27 del sito di oggi (`data/fiere.json`); quelle già finite spariscono da sole a
  ogni build.
- **Chi siamo**: testo e partner dal sito di oggi; storia, persone e loghi dei partner da completare.
- **Academy**: testo dal sito di oggi; date, sedi e costi dei corsi da completare.
- **Pubblicità**: pagina nuova. Formati ricavati dagli spazi della demo e dalla distribuzione delle
  riviste; formati esatti, prezzi e numeri da confermare.
- **Pagine delle testate**: Outerwear oggi non ha notizie fra le 20 scaricate, quindi mostra un
  messaggio al posto della griglia.

Contenuti reali usati: le 20 news più recenti con titoli, date, estratti e foto (dal sito, 26/10/2026), il
testo completo dell'articolo Heimtextil 2027, le sei testate, il calendario fiere, i partner,
indirizzi, telefoni, P.IVA e link social (aggiornati a https e x.com).

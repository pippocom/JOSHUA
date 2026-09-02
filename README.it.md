# JOSHUA Terminal

**Versione 0.69.0** · [Read this document in English](README.md)

Un terminale rétro che si gioca nel browser, tributo a *WarGames* (1983). Funziona interamente lato client: nessun backend, nessuno stato lato server e nessun passo di build necessario per eseguirlo.

## Di cosa si tratta

JOSHUA Terminal ricrea l'atmosfera del terminale WOPR del film: un prompt verde su sfondo nero, un'intelligenza artificiale severa, una partita a tris e, se si insiste abbastanza, una simulazione di guerra termonucleare globale.

Gli arsenali del mondo sono cambiati dal 1983. L'esito di una guerra termonucleare globale no. È tutta qui l'idea, travestita da gioco.

Il progetto nasce come Easter egg nascosto dentro [pippo.com](https://pippo.com/), un sito personale con un proprio "sistema operativo" in stile terminale. **Questo repository pubblico è un'applicazione standalone.** Non comprende il terminale generale di pippo.com, i suoi altri Easter egg, né il comando shell `joshua` usato per raggiungere il gioco da quel terminale. Qui trovate JOSHUA Terminal da solo, a partire dal proprio splash screen dei crediti.

JOSHUA conserva il comportamento, le parole e la presentazione riconoscibili di *WarGames*. Per il tributo al film vedi [TRIBUTE.md](TRIBUTE.md); per come è organizzato il software vedi [ARCHITECTURE.md](ARCHITECTURE.md).

## Funzionalità principali

- Interfaccia terminale rétro, guidata da tastiera, nel browser
- Un breve menu di giochi, raggiungibile digitando comandi
- TIC-TAC-TOE (con modalità "zero giocatori"), HANGMAN e SUDOKU
- GLOBAL THERMONUCLEAR WAR: una simulazione narrativa e visuale con mappa del mondo e log eventi a scorrimento
- Inglese e italiano, selezionabili dallo splash screen
- Narrazione vocale tramite Web Speech API (a livello di best-effort; se non disponibile, il gioco resta silenzioso senza bloccarsi)
- Effetti sonori sintetizzati dal vivo con la Web Audio API — nessun file audio da scaricare
- Accessibilità: navigazione da tastiera, una live region mirata per gli screen reader, focus visibile e supporto a `prefers-reduced-motion`
- Funziona interamente nel browser: si apre un file HTML (servito via HTTP) e tutto il resto viene caricato dalla stessa origine

## Prova JOSHUA online

Puoi usare JOSHUA direttamente dal browser all'indirizzo:

https://pippo.com/human-systems/interactive-fiction/joshua/

E sì, hai letto bene: pippo.com non è un placeholder. È davvero un dominio esistente ed è il sito personale di Marco Iannacone.

## Test rapido - in locale

È necessario servire l'app tramite HTTP, utilizzando un server di sviluppo locale oppure un server web pubblico, perché l'app carica i moduli JavaScript e i dati tramite percorsi relativi. Nella maggior parte dei browser, aprire direttamente `index.html` tramite `file://` non funziona.

```sh
cd src
python3 -m http.server 4173
```

Poi aprire:

```
http://localhost:4173/index.html
```

Esiste anche una pagina di prova per lo sviluppo, dedicata alla regolazione di audio e voce, in `src/dev/media-lab.html` (ad es. `http://localhost:4173/dev/media-lab.html`). **Non** è collegata dall'app e non fa parte dell'esperienza di gioco normale: esiste solo per test manuali locali del codice audio e della sintesi vocale.

## Compilazione e pacchetto

L'app si esegue direttamente da `src/`, senza passi di build. Un `Makefile` opzionale genera gli artefatti distribuibili (per il dettaglio completo vedi [ARCHITECTURE.md](ARCHITECTURE.md)):

```sh
make test          # test unitari/di regressione (veloci)
make check         # test unitari + suite browser Chromium e WebKit
make serve         # serve src/ su http://localhost:4173
make build         # dist/standalone/ + dist/pippo.com/ (EN + IT) + dist/build-info.json
make package       # dist/joshua-0.69.0.tar.gz (archivio di rilascio standalone)
make clean         # rimuove solo dist/
```

`make build` è deterministico (salvo il timestamp di build e i metadati Git) e non esegue alcun deploy.

## Compatibilità browser

L'app dipende da due API browser opzionali e degrada in modo controllato quando non sono disponibili o sono limitate:

- **Web Audio API** — usata per gli effetti sonori sintetizzati. La maggior parte dei browser richiede un gesto dell'utente (come il pulsante BOOT) prima di poter riprodurre audio; l'app sblocca l'audio proprio dentro quel click.
- **Web Speech API (`speechSynthesis`)** — usata per la narrazione vocale. Disponibilità delle voci, qualità e copertura linguistica variano molto tra browser e sistema operativo. Se la sintesi vocale non è disponibile, l'app prosegue in silenzio: il testo continua comunque a comparire normalmente.

Le versioni recenti dei browser basati su Chromium, Firefox e Safari dovrebbero far girare correttamente il terminale e i giochi. La narrazione vocale è in genere più completa su Safari/macOS e su Chrome: consideratela un valore aggiunto, non un requisito.

## Accessibilità

L'app è utilizzabile da tastiera, etichetta i propri controlli, annuncia i cambi di stato significativi tramite un'unica live region per screen reader (invece di leggere ad alta voce l'intero terminale) e rispetta la preferenza di riduzione del movimento del sistema operativo. Non è ancora stata validata con vere tecnologie assistive e non viene dichiarato alcun livello di conformità WCAG. Vedi [ARCHITECTURE.md](ARCHITECTURE.md#accessibility-architecture).

## Altra documentazione

- [PLAYING.it.md](PLAYING.it.md) — come giocare, senza svelare il finale
- [ARCHITECTURE.md](ARCHITECTURE.md) — come è organizzato il software
- [CONTRIBUTING.md](CONTRIBUTING.md) — come contribuire (in inglese, rivolto alla community internazionale su GitHub)
- [TRIBUTE.md](TRIBUTE.md) — il tributo a *WarGames*
- [CREDITS.md](CREDITS.md) — crediti e tecnologie utilizzate
- [CHANGELOG.md](CHANGELOG.md) — storico delle versioni
- [NOTICE](NOTICE) — nota su copyright e licenza

## Articolo di accompagnamento

Un articolo di accompagnamento sulle idee alla base di JOSHUA e sul perché questo progetto è stato pubblicato come open source è in arrivo su Codemotion.

[Articolo Codemotion — in arrivo]

## Una nota sul realismo

Scenari, fazioni e log degli eventi della simulazione bellica sono fittizi e scritti per effetto narrativo. Nulla qui rappresenta informazioni militari operative, dati di targeting reali, o un'affermazione su capacità o dottrine effettive. La simulazione esiste per comunicare un'idea, non per essere accurata.

## Licenza

Distribuito sotto **GNU Affero General Public License v3.0** (`AGPL-3.0-only`). Vedere [LICENSE](LICENSE) per il testo integrale e [NOTICE](NOTICE) per la nota di copyright.

Concept originale e sviluppo di Marco Iannacone, pubblicato originariamente su [pippo.com](https://pippo.com/).

## Stato del progetto

Questa è la versione **0.69.0**, la prima release pubblica open source. L'applicazione è giocabile dall'inizio alla fine, con localizzazione EN/IT, test automatici unitari e browser, miglioramenti di accessibilità e un flusso di build/pacchetto riproducibile.

# Come giocare a JOSHUA Terminal

Questa è una breve guida ai comandi. Non descrive volutamente come si conclude l'esperienza: quella parte va scoperta giocando.

## Avvio

Ci si trova davanti a uno splash screen con il titolo JOSHUA TERMINAL, una breve descrizione e un pulsante **AVVIA JOSHUA TERMINAL**. Cliccandolo si avvia il terminale — questo sblocca anche l'audio nel browser, così suoni e narrazione possono essere riprodotti. Se il pulsante ha già il focus, si può anche premere Invio.

Prima di avviare è possibile passare da italiano a inglese tramite il piccolo link della lingua sullo splash screen.

## Digitare i comandi

Una volta avviato, compare un prompt (`JOSHUA>`). Si digita un comando e si preme Invio (oppure il pulsante SEND). I comandi non distinguono maiuscole/minuscole.

- **HELP** (o **AIUTO**) — mostra i comandi disponibili.
- **GAMES** (o **GIOCHI**) — mostra l'elenco dei giochi disponibili.
- **ASK ME SOMETHING** (o **CHIEDI**) — fa una domanda a JOSHUA; si scrive la domanda al prompt successivo (si può provare a chiedere di "guerra", "esseri umani", "gioco", oppure se è "intelligente").
- **CLEAR** (o **PULISCI**) — pulisce lo schermo.
- **EXIT** (o **ESCI**) — torna allo splash screen.

Dal menu principale si possono anche digitare semplicemente `1`, `2` o `3` al posto dei nomi completi dei comandi.

## Scegliere un gioco

Si digita `PLAY` seguito dal nome del gioco, ad esempio `PLAY GLOBAL THERMONUCLEAR WAR`. I giochi si possono avviare anche digitando direttamente il loro nome.

### TIC-TAC-TOE (tris)

È un gioco nascosto, come nel film. Si avvia con `PLAY TIC-TAC-TOE` (o `TIC TAC TOE`, `TRIS`). Si premono i tasti **1–9** per occupare una casella; la griglia è mappata da sinistra a destra, dall'alto in basso.

Si può giocare normalmente contro il sistema. Oppure, in qualsiasi momento della partita, si può digitare **ZERO** o premere **0** per chiedere se si preferisce lasciare che il sistema giochi contro se stesso — si conferma con S (o Y in inglese) per osservare, oppure con N per continuare a giocare in prima persona.

### HANGMAN (impiccato)

Presente nel menu GIOCHI. Si digita **HANGMAN** (o **IMPICCATO**) per iniziare, poi si indovina una lettera alla volta. Una lettera sbagliata viene contata contro di te; dopo sei errori la partita è persa e la parola viene rivelata.

### SUDOKU

Presente nel menu GIOCHI. Si digita **SUDOKU** per iniziare. Le mosse si inseriscono come `SET <riga> <colonna> <valore>` con valori da 1 a 4 (ad esempio `SET 2 1 3`); `SET` è facoltativo. Si digita **SOLVE** per lasciare che JOSHUA completi il puzzle.

### GLOBAL THERMONUCLEAR WAR

JOSHUA non è un moderno motore di ricerca, e il WOPR non era progettato per indovinare che cosa intendessero i suoi utenti. Per avviare la simulazione, digita per intero il nome mostrato nell'elenco dei giochi:

`GUERRA TERMONUCLEARE TOTALE`

Funziona anche la forma generale `PLAY GUERRA TERMONUCLEARE TOTALE`. Le abbreviazioni come `WAR` non vengono riconosciute intenzionalmente: i vecchi computer pretendevano comandi precisi.

Viene chiesto di scegliere una fazione e poi uno scenario per quella fazione, digitando il numero mostrato oppure cliccando uno dei pulsanti. La simulazione si svolge su una mappa del mondo, con un log eventi in tempo reale a fianco.

Al termine di uno scenario è possibile proseguire con un altro scenario, oppure lasciare che il terminale prosegua da solo. Il pulsante **ABORT**, visibile durante la simulazione, permette di tornare al menu principale in qualsiasi momento.

## Audio

Il pulsante **AUDIO** (o **SOUND** in inglese) nella barra superiore permette di silenziare o riattivare sia la narrazione sia gli effetti sonori. È un interruttore: si clicca di nuovo per riattivare il suono.

## Accessibilità

- Tutta l'app è utilizzabile da tastiera: il pulsante di avvio e il campo dei comandi ricevono il focus automaticamente nei momenti giusti, i pulsanti rispondono a Invio e il tris si gioca interamente con i tasti numerici.
- L'app annuncia i cambi di stato significativi agli screen reader tramite un'unica regione di stato; il terminale e il log eventi non vengono letti riga per riga.
- Se il sistema operativo o il browser è impostato per ridurre il movimento, gli effetti visivi lampeggianti o ciclici (il tremolio di sovraccarico del tris, il tratteggio delle traiettorie, la panoramica/zoom della mappa) vengono attenuati o disattivati.

## Opzioni di velocità solo per sviluppo

L'app supporta alcuni parametri nell'URL pensati per lo sviluppo e i test, non per il gioco normale:

- `?fast=1` — velocizza alcuni tempi propri dell'app (non la velocità di digitazione/narrazione), utile per testare più rapidamente sequenze lunghe.
- `?presentationSpeed=<numero>` — regola il ritmo complessivo di digitazione/narrazione.

Non servono per giocare normalmente.

## Un'ultima cosa

Il significato di tutto questo, e come si conclude, è pensato per essere scoperto giocando, non leggendolo qui.

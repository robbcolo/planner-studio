# Planner Studio Dentistico

Web app per progettare in 3D lo studio dentistico partendo dalla planimetria: muri e cartongesso modificabili, porte e finestre, riuniti con zone di lavoro, sterilizzazione, impianti, budget, export PDF, PNG, DXF e USDZ (realtà aumentata). Funziona su Mac e iPad dal browser e si installa con "Aggiungi a Home".

## Pubblicazione su GitHub Pages

1. Crea un repository pubblico vuoto, per esempio `planner-studio`.
2. Carica tutti i file di questa cartella (anche `.nojekyll` e la cartella `icons`).
3. In **Settings › Pages** scegli *Deploy from a branch*, branch `main`, cartella `/ (root)`, poi Salva.
4. Dopo un minuto l'app è su `https://<tuo-utente>.github.io/planner-studio/`.

Le planimetrie dei tuoi locali **non sono nel repository**, che è pubblico: arrivano come file progetto `.json` a parte. Al primo avvio scegli *Importa i file dei tuoi locali* e selezionali insieme. Se importi di nuovo un progetto che hai già, puoi aggiornare solo la planimetria di sfondo lasciando com'erano muri e arredi.

## Installazione su iPad e Mac

- **iPad**: apri il link in Safari › Condividi › *Aggiungi alla schermata Home*. Dopo la prima apertura funziona anche offline.
- **Mac**: in Safari *File › Aggiungi al Dock*, oppure in Chrome l'icona di installazione nella barra degli indirizzi.

## Progetti nel cloud (Mac, iPhone, iPad)

I progetti si salvano online con Firebase Firestore: accedi una volta su ogni dispositivo con email e password e ritrovi sempre l'ultima versione. Le modifiche fatte su un dispositivo compaiono sugli altri in pochi secondi; senza rete l'app salva sul dispositivo e invia tutto quando la connessione torna.

1. In `config.js` c'è la configurazione web del progetto Firebase (`window.PLANNER_FIREBASE`). Questi valori non sono segreti: i dati li proteggono l'accesso e le regole.
2. Nel progetto Firebase servono **Authentication › Email/Password** attivo e queste regole di Firestore (le stesse dell'app Magazzino):

   ```
   match /studi/{uid}/{document=**} {
     allow read, write: if request.auth != null && request.auth.uid == uid;
   }
   ```

3. Nell'app: alla prima apertura (o in **Progetto › Cloud**) accedi o tocca *Crea account*. I progetti già presenti sul dispositivo vengono copiati online.

I progetti stanno in `studi/<id account>/planner_progetti`, le planimetrie di sfondo (fino a circa 900 KB ciascuna) in `studi/<id account>/planner_sfondi`. Se `config.js` è vuoto, l'app salva solo sul dispositivo.

## File

| File | Contenuto |
|---|---|
| `index.html` | struttura della pagina |
| `style.css` | grafica (tema chiaro) |
| `app.js` | tutta la logica: editor 2D, vista 3D e passeggiata, catalogo, salvataggio, export |
| `sw.js` | cache per l'uso offline |
| `manifest.webmanifest`, `icons/` | installazione come app |
| `config.js` | configurazione Firebase per il cloud dei progetti |
| `vendor/` | librerie ospitate nel repository: three.js 0.169 (3D, controlli, esportazione USDZ), jsPDF 2.5.1 (PDF), pdf.js 3.11 (lettura planimetrie PDF), Firebase 10.12 (cloud) |

Tutte le librerie sono nel repository: l'app si apre anche offline.

## Se la vista 3D non parte

Al posto del 3D compare una scheda con il messaggio d'errore e il browser in uso: fotografala e inviala, serve per capire il problema.

## Note

- Gli ingombri del riunito (tipo Sinius TS, 105 × 195 cm) e dell'OPT sono indicativi: verificali sui fogli di installazione del produttore.
- Le zone di lavoro seguono lo schema a orologio con raggio regolabile: sono un aiuto alla disposizione, non un requisito normativo.
- Per aggiornare l'app basta sostituire i file nel repository: alla riapertura online l'iPad scarica la versione nuova.

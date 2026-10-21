# Planner Studio Dentistico

Web app per progettare in 3D lo studio dentistico partendo dalla planimetria: muri e cartongesso modificabili, porte e finestre, riuniti con zone di lavoro, sterilizzazione, impianti, budget, export PDF, PNG, DXF e USDZ (realtà aumentata). Funziona su Mac e iPad dal browser e si installa con "Aggiungi a Home".

## Pubblicazione su GitHub Pages

1. Crea un repository pubblico vuoto, per esempio `planner-studio`.
2. Carica tutti i file di questa cartella (anche `.nojekyll` e la cartella `icons`).
3. In **Settings › Pages** scegli *Deploy from a branch*, branch `main`, cartella `/ (root)`, poi Salva.
4. Dopo un minuto l'app è su `https://<tuo-utente>.github.io/planner-studio/`.

Le planimetrie dei tuoi locali **non sono nel repository**, che è pubblico: arrivano come file progetto `.json` a parte. Al primo avvio scegli *Importa i file dei tuoi locali* e selezionali insieme.

## Installazione su iPad e Mac

- **iPad**: apri il link in Safari › Condividi › *Aggiungi alla schermata Home*. Dopo la prima apertura funziona anche offline.
- **Mac**: in Safari *File › Aggiungi al Dock*, oppure in Chrome l'icona di installazione nella barra degli indirizzi.

## Sincronizzazione Mac ↔ iPad (facoltativa)

Senza sincronizzazione ogni dispositivo salva i progetti per conto suo (si possono spostare con *Esporta file progetto* / *Importa*). Per avere gli stessi progetti ovunque si usa Firebase Firestore, anche lo stesso progetto Firebase del magazzino.

1. Nella console Firebase › Impostazioni progetto › *Le tue app* copia l'oggetto `firebaseConfig` dell'app web (se non c'è, aggiungi un'app web).
2. In **Firestore › Regole** aggiungi questo blocco **dentro** `match /databases/{database}/documents { … }`, senza cancellare le regole che usi già per le altre app:

   ```
   match /planner/{space}/{document=**} {
     allow read, write: if space.size() >= 20;
   }
   ```

3. Nell'app: tab **Progetto › Sincronizzazione Mac ↔ iPad**, incolla la configurazione, lascia il codice spazio generato e premi *Attiva sincronizzazione*. I progetti già presenti sul dispositivo vengono copiati su Firebase.
4. Sull'altro dispositivo incolla la **stessa configurazione** e lo **stesso codice spazio**.

Il codice spazio fa da password: chi conosce sia la configurazione sia il codice può leggere e modificare i progetti. Le planimetrie (fino a circa 900 KB ciascuna) vengono salvate in Firestore accanto ai progetti.

## File

| File | Contenuto |
|---|---|
| `index.html` | struttura della pagina |
| `style.css` | grafica (tema chiaro e scuro) |
| `app.js` | tutta la logica: editor 2D, vista 3D e passeggiata, catalogo, salvataggio, export |
| `sw.js` | cache per l'uso offline |
| `manifest.webmanifest`, `icons/` | installazione come app |

Librerie caricate dalle CDN: three.js 0.169 (3D), jsPDF 2.5.1 (PDF), pdf.js 3.11 (planimetrie PDF), Firebase 10.12 (solo se attivi la sincronizzazione).

## Note

- Gli ingombri del riunito (tipo Sinius TS, 105 × 195 cm) e dell'OPT sono indicativi: verificali sui fogli di installazione del produttore.
- Le zone di lavoro seguono lo schema a orologio con raggio regolabile: sono un aiuto alla disposizione, non un requisito normativo.
- Per aggiornare l'app basta sostituire i file nel repository: alla riapertura online l'iPad scarica la versione nuova.

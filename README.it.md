:en: [English](README.md)

# Studio One

Creato da Flavio Biundo - potenziato da Google Antigravity.

**Studio One** è una collezione di strumenti moderna ed elegante per l'elaborazione di foto, video e tracce audio direttamente nel browser.

> [!TIP]
> Per prestazioni e compatibilità ottimali, usa browser basati su Chrome.

## 🚀 Per Iniziare

### Prerequisiti

⚠️ **È necessario installare [Node.js](https://nodejs.org/)**

**Nota**: _Procedere all'installazione anche se Windows potrebbe mostrare avvisi, e consentire le connessioni se il firewall o l'antivirus lo richiedono._

## 🌱 Installazione per Principianti (solo Windows)

1. Dalla pagina principale del repository di "Studio One" su GitHub, clicca sul pulsante verde "Code" e scarica il repository come file ZIP

2. Estrai il file ZIP e posiziona la cartella chiamata "Studio-One-main" dove preferisci sul tuo dispositivo

3. Esegui il file "Start_Production_Server.bat" all'interno della cartella "Studio-One-main" - se Windows blocca il file, fai clic con il tasto destro e seleziona "Esegui come amministratore"

4. Attendi il completamento delle installazioni

5. Al completamento, il browser si dovrebbe aprire automaticamente - se questo non succede, naviga manualmente verso l'indirizzo locale (local server) mostrato nel terminale alla fine del processo.

6. Ora puoi usare gli strumenti. Buon divertimento!

## ⬆️ Aggiornamento da una versione precedente

### Se hai installato tramite file zip

> [!WARNING]
> Eliminare o sostituire la vecchia cartella eliminerà anche eventuali file (come immagini o video esportati) che hai scelto di salvare manualmente al suo interno!

1. Scarica nuovamente il file ZIP da GitHub ed elimina/sostituisci la vecchia cartella (e i file)

2. Esegui il file "Start_Production_Server.bat" all'interno della cartella "Studio-One-main".

## 🧑💻 Installazione per Sviluppatori (qualsiasi piattaforma, con Git)

1. Clona il repository

2. Installa le dipendenze:

   ```bash
   npm install
   ```

3. Avvia il server di sviluppo:
   ```bash
   npm run dev
   ```

## 🛠️ Tecnologie Utilizzate

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Linguaggio**: [TypeScript](https://www.typescriptlang.org/)
- **Testing**: [Vitest](https://vitest.dev/)

## 📜 Script Disponibili

- `npm run dev`: Avvia il server di sviluppo Vite.
- `npm run build`: Compila l'applicazione per la produzione.
- `npm run preview`: Mostra un'anteprima locale della build di produzione.
- `npm run test`: Esegue la suite di test utilizzando Vitest.
- `npm run test:ui`: Apre l'interfaccia utente di Vitest per test interattivi.
- `npm run format`: Formatta il codice utilizzando Prettier.
- `npm run format:check`: Controlla se il codice è formattato con Prettier.
- `npm version`: Incrementa il numero di versione.

# Studio One

*Leggi in un'altra lingua: [English](README.md), [Italiano](README.it.md).*

Creato da Flavio Biundo - potenziato da Google Antigravity.

**Studio One** è una suite moderna ed elegante di strumenti per elaborare foto, video e tracce audio direttamente nel tuo browser.

> [!TIP]
> Usa browser basati su Chrome per prestazioni e compatibilità ottimali.

## 🚀 Per Iniziare

### Prerequisiti

⚠️ **È necessario installare [Node.js](https://nodejs.org/)**

## 🌱 Installazione per Principianti (solo Windows)

1. Dalla pagina principale del repository di Studio One su GitHub, clicca sul pulsante verde "Code" e scarica il repository come file ZIP

2. Il file ZIP scaricato contiene una cartella chiamata "Studio-One-main" - posizionala dove preferisci sul tuo disco rigido

3. Esegui il file "Start_Production_Server.bat" all'interno della cartella "Studio-One-main" (se Windows blocca il file, fai clic con il tasto destro e seleziona "Esegui come amministratore")

4. Attendi il completamento delle installazioni. Se il browser non si apre automaticamente, naviga manualmente verso l'indirizzo locale mostrato nel terminale alla fine del processo

5. Ora puoi usare gli strumenti. Buon divertimento!

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

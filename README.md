:it: [Italiano](README.it.md)

# Studio One

Created by Flavio Biundo - powered by Google Antigravity.

**Studio One** is a sleek, modern suite of tools for processing pictures, videos, and audio tracks directly in your browser.

> [!TIP]
> Use Chrome-based browsers for the best performance and compatibility.

## 🚀 Getting Started

### Prerequisites

⚠️ **Installing [Node.js](https://nodejs.org/) is required**

**Note**: _Proceed with the installation regardless of any warnings Windows might display, and allow network connections if prompted by your firewall or antivirus._

## 🌱 Beginner Friendly Installation Steps (Windows only)

1. From the GitHub "Studio One" repository main page, click on the green "Code" button and download the repository as a ZIP file

2. Extract the ZIP file and place the directory named "Studio-One-main" wherever you prefer on your device

3. Run the file "Start_Production_Server.bat" inside the "Studio-One-main" directory - if the file is blocked by Windows, right-click on it and select "Run as administrator"

4. Wait for installations to complete

5. At the end of the process, the browser should open automatically - if that does not happen, manually navigate to the local server address displayed in the terminal

6. You can now use the tools. Enjoy!

## ⬆️ Update from an older version

### If you installed the zip file

1. Download again the ZIP file from GitHub and delete/replace the old folder (and files)

2. Run the file "Start_Production_Server.bat" inside the "Studio-One-main" directory.

## 🧑💻 Developers Installation Steps (any platform, with Git)

1. Clone the repository

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## 🛠️ Built With

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Testing**: [Vitest](https://vitest.dev/)

## 📜 Available Scripts

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Builds the application for production.
- `npm run preview`: Locally previews the production build.
- `npm run test`: Runs the test suite using Vitest.
- `npm run test:ui`: Opens the Vitest UI for interactive testing.
- `npm run format`: Formats the code using Prettier.
- `npm run format:check`: Checks if the code is formatted using Prettier.
- `npm version`: Increments the version number.

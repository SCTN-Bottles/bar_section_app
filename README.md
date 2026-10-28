# Bar Section App

A Next.js web application for browsing Columbia, Missouri venues, comparing bar sections, and viewing section availability, capacity, minimum spend, and deposit information.

## Requirements

This project runs on Node.js and does not require Python or Conda.

Install the current Node.js LTS release from the official website:

- [Download Node.js](https://nodejs.org/en/download)

The Node.js installer includes `npm`, which is used to install project dependencies and run the app.

### Do I need Conda?

No. Conda is primarily used for Python and data-science projects. It is not needed for this Next.js application.

If you already use Conda or want to install it for other projects, download it from the official sources:

- [Miniconda downloads](https://www.anaconda.com/docs/getting-started/miniconda/install)
- [Anaconda distribution downloads](https://www.anaconda.com/download)

Installing Conda will not replace the Node.js requirement for this project.

## Download the project

If you have not already downloaded the repository, clone it with Git:

```bash
git clone <repository-url>
cd bar_app
```

Replace `<repository-url>` with this repository’s URL.

If you received the project as a ZIP file, extract it and open a terminal in the folder containing `package.json`.

## Confirm Node.js and npm are installed

Open Terminal on macOS/Linux or PowerShell on Windows and run:

```bash
node --version
npm --version
```

Both commands should print a version number. If either command is not recognized, install Node.js from [nodejs.org](https://nodejs.org/en/download), restart your terminal, and try again.

## Install dependencies

From the project folder, run:

```bash
npm install
```

This installs the packages listed in `package.json`, including Next.js, React, TypeScript, Tailwind CSS, and ESLint.

There is one `package.json` and one `package-lock.json`, both in the repository root. Run all npm commands from that folder. The Next.js app's source, public assets, and app configuration remain in `bar_app/`; the npm scripts target that folder automatically.

## Run the program in development mode

Start the local development server:

```bash
npm run dev
```

When the server starts, open this address in a browser:

```text
http://localhost:3000
```

The main page links to the venue explorer at `/venues`. Changes to source files appear automatically while the development server is running.

To stop the server, return to the terminal and press `Ctrl+C`.

## Available npm commands

```bash
npm run dev
```

Starts the development server with hot reloading.

```bash
npm run lint
```

Checks the project for ESLint issues.

```bash
npm run typecheck
```

Checks the app's TypeScript types.

```bash
npm run build
```

Creates a production build and checks that the app compiles successfully.

```bash
npm start
```

Starts the previously created production build. Run `npm run build` first.

## Run the production version locally

```bash
npm install
npm run build
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

## Project structure

```text
bar_app/src/
├── app/                         # Next.js pages and global styles
│   ├── page.tsx                 # Home page
│   ├── venues/page.tsx          # Venue listing page
│   └── venues/[venueName]/      # Individual venue page
├── components/                  # Reusable UI components
│   ├── layout/                  # Navigation and footer
│   └── venues/                  # Venue cards, maps, and details
├── data/venues.ts               # Venue and section data
├── lib/venues.ts                # Venue lookup helpers
└── types/venue.ts               # TypeScript data types
```

## Update venue and section information

The venue seed data is stored in [`bar_app/src/data/venues.ts`](bar_app/src/data/venues.ts). The app source is inside `bar_app/src/`. The development server reloads automatically when source files change.

## Troubleshooting

### `npm` or `node` is not recognized

Install Node.js LTS from [nodejs.org](https://nodejs.org/en/download), restart your terminal, and verify the installation with `node --version` and `npm --version`.

### The port is already in use

Start the app on another port:

```bash
npm run dev -- --port 3001
```

Then open [http://localhost:3001](http://localhost:3001).

### Dependencies seem broken

Make sure you are in the folder containing `package.json`, then run:

```bash
npm install
```

## Technology

- Next.js
- React
- TypeScript
- Tailwind CSS
- ESLint

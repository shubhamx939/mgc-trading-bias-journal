# Aureum — MGC Trading Bias Journal

A private, static React app for journaling Micro Gold (MGC) bias. All entries stay in this browser's localStorage; there is no server or account.

## Initial setup

```bash
npm create vite@latest trading-journal -- --template react
cd trading-journal
npm install
npm install recharts lucide-react
npm install -D tailwindcss @tailwindcss/vite
npm run dev
```

This repository is already set up. From this directory, use `npm install` and `npm run dev`. Run `npm run build` to create the static site in `dist/`.

## Project structure

```text
src/
  App.jsx             Journal, analytics, history, review modal, alerts UI
  components/AccuracyChart.jsx  Lazily loaded Recharts view
  index.css           Tailwind import and dark terminal styling
  hooks/useJournal.js React reducer and localStorage persistence
  lib/journal.js      Date/slot keys, journal reducer, scoring, CSV export
  lib/alerts.js       Browser notification and audio chime helpers
.github/workflows/deploy.yml  GitHub Pages build and deployment
vite.config.js        Relative asset base for GitHub Pages
```

## Journal behavior

- Morning and EOD choices are stored separately for 12M, 6M, 3M, 1M, 1W, and 1D.
- Intraday choices are keyed by local calendar date, timeframe, and candle start hour. 4H candles start at 00:00, 04:00, 08:00, 12:00, 16:00, and 20:00 **in the browser's local time zone**.
- An accuracy score counts only pairs with both a forecast and an actual result. Neutral is a valid choice and must match neutral to count as correct.
- The prior calendar day's review opens once on the next day if that day has a journal record. Incomplete EOD entries display as pending.
- While the page is open, it checks for a new hour every 10 seconds. A new hour shows an in-app reminder; every fourth hour mentions both 1H and 4H. Sound can be enabled with the speaker button. System notifications require browser permission and HTTPS (GitHub Pages provides HTTPS). Browser sleep, a closed tab, or operating system restrictions may delay or prevent reminders.
- CSV export is available under Historical Logs. Back up your CSV regularly: browser data is device and browser specific and can be erased with site data.

## GitHub Pages deployment

1. Create an empty GitHub repository, then push this already initialized local `main` branch:

   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git add .
   git commit -m "Build MGC bias journal"
   git push -u origin main
   ```

2. In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
3. The included workflow builds and deploys the site on pushes to `main`.

`vite.config.js` uses `base: './'`, so built assets work under a repository path such as `https://username.github.io/repository/`. Navigation is internal React state, so it needs no route rewrite rule.

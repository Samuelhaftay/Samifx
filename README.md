# SamiFX — Trading Journal & Confluence Checklist

A private trading journal with two pages:

1. **Journal (Home)** — your trade history in a ledger view. Tap the gold **+** button to log a new trade: pair, direction, entry/SL/TP, risk %, setup grade, result, P&L, reason, notes, and a chart screenshot.
2. **Checklist** — your weekly / daily / 4H / lower-timeframe confluence checklist, auto-scoring as you tick boxes, with a live grade (A+/A/B/C) and suggested risk % based on your setup-rate table. Hit "Use This Grade → Log Trade" to send that grade straight into a new journal entry.

Each person who uses it enters their own name on first open — journals are kept completely separate per name, so you can hand this to friends and everyone's trades stay private to them.

## Running it

You need [Node.js](https://nodejs.org) installed (version 14+). No other installs required — no `npm install`, no database setup.

```bash
cd samifx
node server.js
```

Then open **http://localhost:3000** in your browser.

To let it run in the background, or to share it on your local network with friends on the same wifi, you can also run:

```bash
node server.js
```
and then have others visit `http://<your-computer's-local-IP>:3000` from their own devices — each of them enters their own name and gets their own journal.

## Where your data lives

Every trade is saved as plain JSON in the `data/` folder — one file per username (e.g. `data/sami.json`). There's no external database, so it's easy to back up: just copy that folder.

## Notes

- Screenshots are stored directly inside your trade data as embedded images, so there's nothing extra to configure.
- The checklist scoring is fully editable — open `public/js/checklist.js` if you ever want to change the criteria or weights.
- This runs locally on whichever machine starts `node server.js`. If you want it live on the internet permanently (not just your local network), it would need to be deployed to a hosting service — happy to walk through that separately if you want it.

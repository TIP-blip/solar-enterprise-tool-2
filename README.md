<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1f0acc5e-a1f0-4fc3-ae62-d527b196754d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Database source PDFs

The build includes the supplied `PSS Specs.pdf` and `TOP ONE.pdf` under `public/source-documents/` as database reference material. The TOP ONE catalog entries are included in the hardware inventory; the scanned PSS material is retained as the source reference for load/profile data.

## 2026 database + monitoring additions
- Database accepts product/appliance images and PDF documents/datasheets.
- Hardware and appliance records support image/PDF attachments.
- Database has a dedicated PDFs & Documents action tab with Open/Download/Delete.
- Dashboard supports uploaded background images with automatic rotation and enable/disable control.
- Currency is fixed to **KSh (Kenya Shillings)** throughout quotations and inventory.
- Added **Inverter Monitoring** tab with client/site telemetry, PV power, load, battery SOC/power, grid power, daily/total energy, status, refresh, delete and CSV export.
- Telemetry API endpoints allow an inverter gateway/integration to POST readings into the app.
- Final quotation PDF remains a browser download to the user's local computer.


## VS Code / Windows startup

```powershell
npm install --legacy-peer-deps
npm run dev
```

Open `http://localhost:3000`.

The Vite watcher intentionally ignores `data/**` because Express autosave writes `data/db.json`; this prevents client-form typing from triggering page reloads.

## Clean engineering / quotation update

This version uses a transparent sizing chain:
- Daily energy = watts × quantity × hours × utilisation.
- Design peak = connected load × selected coincidence factor.
- Inverter = max(design peak × 1.25, largest individual appliance surge), rounded up to a standard size.
- PV = daily energy ÷ (peak-sun-hours × PV derate), then rounded to whole modules.
- Battery = night energy × selected autonomy ÷ DoD.
- BOQ prices/specifications come from the editable master hardware database and remain in KSh.
- Hardware records support image replacement and linked PDF datasheets/manuals.
- Energy Tracker includes auto-refresh, history, CSV export and a direct downloadable A4 energy report PDF.
- Official quotation PDF is generated directly as a structured A4 PDF and downloaded by the browser, instead of rasterising the whole application screen.

The app does not claim that the calculator replaces final string design, voltage-drop, short-circuit, protection or manufacturer compatibility checks; those remain engineering verification steps.

## Windows startup (clean v5)

1. Install Node.js LTS if it is not already installed.
2. Extract this ZIP to a normal writable folder (for example `Documents\one-inverter`).
3. Double-click `start-windows.bat`.
4. The script installs dependencies with `--legacy-peer-deps` only when `node_modules` is missing.
5. Open **http://127.0.0.1:3000**.

Do not open `0.0.0.0:3000`. If the page says connection refused, look at the terminal window: `npm run dev` must remain running. If it exits, send the exact terminal error.


## v6 engineering workflow additions
- BOQ line items can be clicked to replace them directly from the master hardware database.
- Product suggestions rank ONE INVERTER products first when technically eligible and prefer the highest-wattage PV modules.
- Selecting a different panel recalculates panel quantity from the energy/PV target; battery selection recalculates battery quantity and checks DC voltage; inverter selection is checked against the calculated inverter requirement.
- Master Database accepts PDF, Excel/CSV, catalogue and BOQ/price-list source documents.
- **Learn from database docs** refreshes the persistent source-document knowledge index; when `GEMINI_API_KEY` is configured it sends supported uploaded source files to Gemini for source-grounded extraction.

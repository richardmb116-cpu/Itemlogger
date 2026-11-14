# Itemlogger

Home inventory and warranty vault for iPhone. Snap an item and its receipt, and Itemlogger keeps track of
warranties, serial numbers and which tax year each purchase falls in (Australian or US).

## What's in it today

- **Items**: photo, receipt photo, price, purchase date, store, serial number, category, notes.
- **Warranty tracking**: each item shows time left, with an "Expiring soon" shelf on the home screen.
- **Warranty reminders**: notifications at 9 am, 30 days and 1 week before a warranty ends (or on the day,
  your choice in Settings). Tapping one opens the item, showing its receipt and serial number.
- **Tax**: switch between the Australian financial year (1 Jul – 30 Jun) and the US calendar year, and
  see work and personal purchase totals for each year.
- **Search and filters** by name, store, serial, work and personal.
- Light and dark mode, with all data stored on the device.

## Run it on your iPhone

1. Install **Expo Go** from the App Store.
2. On your computer, with Node 20 or newer:
   ```bash
   npm install
   npm start
   ```
3. Scan the QR code in the terminal with the iPhone camera.

No Mac or Xcode is needed for development. To ship to the App Store later, use EAS Build
(`npx eas-cli@latest build -p ios`).

Use `npm run web` for a quick browser preview. Camera, the native date picker and the tab bar look
different there; the iPhone is the real target.

## Design

The UI follows the Apple Store app look in [`docs/design/reference.webp`](docs/design/reference.webp):
white pages, soft grey (`#F5F5F7`) tiles behind images, Apple blue (`#0071E3`) pill buttons, bold
left-aligned section headings, horizontal shelves and outlined pill chips. Colours live in
`src/constants/theme.ts`; shared pieces (chips, pills, headings, rows) are in `src/components/`.

## Development

```bash
npm run typecheck   # TypeScript
npm test            # tax-year, warranty, reminder and price-parsing tests
npx expo-doctor     # dependency and config checks
```

### Layout

```
src/app/              screens (Expo Router: every file is a route)
  (tabs)/index.tsx    item list
  (tabs)/tax.tsx      tax-year summary
  (tabs)/settings.tsx region, sample data
  item/[id].tsx       item detail
  item/edit.tsx       add and edit form (modal)
src/components/       shared UI (grouped lists, chips, warranty pill)
src/lib/              data model, storage, tax years, warranty math
tests/                unit tests for src/lib
```

## Roadmap

Built one at a time:

1. ~~Core inventory, warranties and tax years~~
2. ~~Warranty expiry notifications~~
3. Insurance claim pack (PDF export by room or whole home)
4. Resale listing generator and price tracking
5. Depreciation schedules (ATO effective life, US Section 179 and MACRS) and work-use percentage
6. Receipt OCR, barcode and serial scanning, and email receipt import
7. Recall alerts, manual auto-fetch, Australian Consumer Law guarantee hints
8. Rooms and locations, move mode, lending tracker, maintenance reminders
9. iCloud backup, shared household and a trusted contact
10. Home and Lock Screen widgets (next warranty to expire, total home value). Needs a development build, as Expo Go can't run widgets

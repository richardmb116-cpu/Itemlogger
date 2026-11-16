# Vestle

*Track your keeps.*

Home inventory and warranty vault for iPhone. Snap an item and its receipt, and Vestle keeps track of
warranties, serial numbers and which tax year each purchase falls in (Australian or US).

## What's in it today

- **Items**: photo, receipt photo, price, purchase date, store, serial number, category, notes.
- **Receipt scanning**: snap or choose a photo of a receipt and every product on it is listed
  separately (a "2 ×" line becomes two items), with tax, fees and groceries set aside. Tick the ones
  to add; each gets the store, date, price, a starting warranty and the receipt photo. Claude reads
  the receipt (`src/lib/receipt.ts` checks everything it returns; unit-tested). In the Claude preview
  this uses the page's own access to Claude, with the viewer's permission; the installed app shows
  scanning as coming soon until a small server with a Claude API key is added.
- **Warranty tracking**: each item shows time left, with an "Expiring soon" shelf on the home screen.
- **Warranty reminders**: notifications at 9 am, 30 days and 1 week before a warranty ends (or on the day,
  your choice in Settings). Tapping one opens the item, showing its receipt and serial number.
- **Tax**: switch between the Australian financial year (1 Jul – 30 Jun) and the US calendar year. Each
  year shows one estimated deduction per work item (work-use % only), including items bought in earlier
  years, and **Send to my accountant** shares a PDF with receipts attached or a CSV spreadsheet
  (`src/lib/accountant-export.ts`). Methods, effective lives and year-by-year schedules stay hidden unless
  **Accountant details** is switched on in Settings. Under the hood (`src/lib/depreciation.ts`):
  - Australia: $300 or less claimed straight away; otherwise diminishing value or prime cost over the
    effective life (suggested from the item, editable), first year pro-rated by days held; optional
    low-value pool for items under $1,000
  - United States: Section 179 (full business share in year one, needs over 50% business use) or MACRS
    (5-year for electronics, 7-year for furniture and tools, half-year convention)
  - only the work-use % is claimed; clothing and jewellery are excluded; a record-keeping aid, not tax advice
- **Resale value**: an estimate of what each item would sell for second-hand today, from its category's
  resale curve, age, condition and remaining warranty (`src/lib/valuation.ts`). Shown as a likely range,
  with what it has lost since purchase and what it would likely fetch in a year.
- **Item ages and birthdays**: every item shows how old it is. On each purchase anniversary you get a
  9 am "Happy 1st birthday" notification with what it's worth now, plus a card on Home and a banner on
  the item page. Switch off in Settings → Item birthdays.
- **Best time to sell (upgrade planner)**: built on the study in `reports/Resale value and upgrade timing.md`.
  `src/lib/lifecycle.ts` holds about 50 product profiles (iPhone, Pixel, Mac, lens, Dyson, Aeron, Rolex,
  mattress…), each with its year-one value, yearly decline, floor, useful life, end-of-life drop, failure
  risk and how fast newer models make it feel dated, tagged by evidence (measured, rule of thumb, estimated).
  `src/lib/upgrade.ts` picks the age that minimises your expected **average yearly cost** of owning one:
  price, less what you'd net after eBay fees and your effort (`src/lib/selling.ts`), plus the cost of
  falling behind newer models and the risk of it dying first, with money discounted at 5% a year. It shows
  a window (every age within 5% of the best cost) and what selling a year early or late would cost.
  Settings → Upgrading asks how much you care about having the latest (Full value / Balanced / Stay
  current). Things that hold value get "No rush to sell", cheap things "Use it until it's done", luxury
  watches and bags "priced by the market", mattresses and clothing "no resale market". Includes a
  repair-or-replace check and timing tips with seasons flipped for Australia.
- **Real price checks**: one tap opens eBay sold listings, Facebook Marketplace or Gumtree (AU) searches for
  the item's make and model. Enter what you see as "your price" and it replaces the estimate everywhere,
  flagged for a re-check after 90 days. No scraping, API keys or running costs.
- **Sell**: suggested asking price, a ready-to-post listing (serial number left out on purpose) to share or
  copy, and "Mark as sold". Sold items drop out of totals and reminders and move to a Sold filter.
- **Insurance claim pack**: a PDF (A4 in Australia, US Letter in the US) for a claim or a full contents
  inventory: cover page with insurer, policy number, incident details and totals, an item index, then each
  item with make and model, serial, purchase details, price paid, current value, warranty, photo and receipt.
  Flags gaps first (missing receipts, photos, serials) and warns when items cost more than the contents
  sum insured. Shared from the iPhone share sheet; previewed on screen in the browser.
- **Search and filters** by name, store, serial, work, personal and sold.
- **Sync across devices** (optional): sign in with an emailed 6-digit code and your items, photos, receipts
  and settings stay the same on iPhone and iPad, backed up in Supabase. Offline-first: everything works
  without an account, edits queue on the device, and the most recent edit wins when two devices disagree.
- Light and dark mode.

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

Use `npm run web` for a quick browser preview, or `npm run build:preview` to build a self-contained web
preview in `dist-preview/` that can be hosted under any path (for example as a private Claude artifact). Camera, the native date picker and the tab bar look
different there; the iPhone is the real target.

## Sync backend (Supabase)

Vestle runs entirely on the device until you connect a backend. To turn on sync:

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, paste and run `supabase/migrations/0001_vestle_sync.sql`. It creates the `items` and
   `user_settings` tables, a private `photos` storage bucket, and row-level security so each account only
   ever sees its own data. It's safe to run again.
3. In **Authentication → Emails → Magic Link**, put `{{ .Token }}` in the email body (e.g. "Your Vestle code
   is {{ .Token }}") so sign-in emails contain the 6-digit code the app asks for. Supabase's built-in email
   sender allows only a few emails an hour; add your own SMTP under **Authentication → SMTP** before
   inviting other people.
4. From **Project Settings → API keys**, copy the project URL and the **publishable** key into `.env`
   (see `.env.example`). The publishable key is designed to ship inside apps; never put the secret
   (service role) key in the app.
5. Restart `npm start`. For EAS builds, add the same two variables with `npx eas-cli@latest env:create`,
   because `.env` isn't committed.

How it works: `src/lib/sync.ts` pulls rows changed since the last sync, merges them
(`src/lib/sync-merge.ts`, unit-tested), then pushes this device's queued changes (`src/lib/outbox.ts`).
Each item is stored as JSON, so new app fields need no database migration. The server also refuses
to let an older edit overwrite a newer one. Photos upload once to `photos/<user id>/` and download
on other devices. Signing out keeps items on the device.

## Design

"Gallery white": a premium, photography-led look in the spirit of high-end automotive and sportswear apps.

- **Welcome**: five full-screen photo stories (inventory, warranties, insurance, resale, tax time), then a
  country choice and "Add my first item" or "Explore with examples". Shown once; replay it from Settings.
- **Palette**: monochrome first. Pure white pages, warm-grey surfaces, ink-black pill buttons, one cobalt
  accent for links and selection. Dark mode inverts it (black pages, white buttons).
- **Type**: heavy, tightly tracked display sizes (`Type.display`, `Type.hero`), spaced capital eyebrows.
- **Photography**: items without a photo use a category photo, so nothing looks empty. The home banner,
  shelves, collections and item pages are photo-first, with text on soft gradients and frosted glass.
- **Item page**: full-bleed photo, glass back/edit buttons, details on a rounded sheet, a dark value card.
- Tokens live in `src/constants/theme.ts`; shared pieces in `src/components/`; photos in `assets/photos/`
  (mapped in `src/lib/photos.ts`).

### Photo credits

Bundled photography is from [Unsplash](https://unsplash.com) under the
[Unsplash License](https://unsplash.com/license) (free for commercial use, no attribution required).
Photo IDs are listed in `scripts/photo-sources.txt`.

## Development

```bash
npm run typecheck   # TypeScript
npx expo lint       # ESLint (expo config)
npm test            # tax, depreciation, accountant export, warranty, reminder, valuation, listing, claim-pack tests
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
3. ~~Insurance claim pack~~ (rooms/locations to filter by room are in item 8)
4. ~~Resale listing generator~~, ~~manual price checks~~; automatic eBay price lookups via a small cached
   server (stage 2) and opt-in shared sale prices (stage 3)
5. ~~Depreciation estimates, work-use percentage and accountant export~~
6. ~~Receipt scanning~~ (preview; installed app next), barcode and serial scanning, and email receipt import
7. Recall alerts, manual auto-fetch, Australian Consumer Law guarantee hints
8. Rooms and locations, move mode, lending tracker, maintenance reminders
9. ~~Sync and backup~~ (Supabase); shared household and a trusted contact
10. Home and Lock Screen widgets (next warranty to expire, total home value). Needs a development build, as Expo Go can't run widgets

# iPUMP Twin

A digital twin platform for pumping stations: upload a 3D model, connect live data, and
monitor, replay and simulate the station in one place.

> Prototype. The backend is mocked (accounts, sites and data live in a local JSON file and the
> browser). See "Before production" below.

## What is in it

- Landing page, sign up and sign in
- Accounts and sites
- Site workspace: 3D viewer (GLB, glTF, IFC), inventory table, properties, timeline with
  live and replay
- Dashboards with cards (values, gauges, charts, tables)
- Animation (rotate, flow, fill, valve, pulse) driven by signals, with bindings you can edit
- Simulation with scenarios (storm inflow, pump trip, closed valve, power failure)

## Run it

You need Node 22.13 or newer, pnpm 11 and a browser with WebGL.

```bash
corepack enable
pnpm install --filter studio...
cp apps/studio/.env.mock.example apps/studio/.env.local
cd apps/studio
pnpm dev            # http://localhost:8082
```

Open http://localhost:8082, then sign up. Data is stored in `apps/studio/.mock-data/db.json`
(accounts, sites) and in the browser's `localStorage` (session, dashboards, bindings).
Delete the folder and clear site data to reset.

Tests and type check:

```bash
cd apps/studio
npx vitest run components/interfaces/Twin components/ui/Timeline
npx tsc --noEmit -p .
```

## Rename the product

The name and tagline are in `apps/studio/lib/brand.ts`. Also set `app:title` in
`apps/studio/hooks/custom-content/custom-content.json`, and replace the logo in
`apps/studio/components/ui/BrandMark.tsx` and `apps/studio/public/favicon/`.

## Before production

- Replace the mock auth (`pages/api/mock-auth`) and platform API (`pages/api/platform`) with
  real services. Mock passwords are stored in plain text.
- Store models, documents and time-series data in real storage.
- Add roles and access control per account and site.

## Licence

Apache License 2.0, see `LICENSE` and `NOTICE`.

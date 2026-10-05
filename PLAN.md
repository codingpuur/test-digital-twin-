# Digital Twin Platform — UI Plan (UI-only, mock data)

Design = **Supabase Studio ki premium feel** + **Netdata ke real-time monitoring features**.

## 1. Goal & scope
- Sirf frontend. Backend nahi — saara data mock/simulated (live-looking streams).
- Supabase Studio se: layout, sidebar, table editor, SQL-style editor, dark theme, polish.
- Netdata se: live charts, per-second metrics, alarms, anomaly view, node/host overview, dense dashboards.
- Digital twin = real-world "assets" (machines, servers, sensors, buildings) ka virtual copy jiska state live dikhe.

## 2. Reference notes
| | Supabase Studio | Netdata |
|---|---|---|
| License | Apache 2.0 — code/pattern reuse OK (attribution rakho) | Naya dashboard closed source — **sirf inspiration, code copy mat karna** |
| Kya lena hai | App shell, sidebar, table editor, command menu, forms, tokens, empty states | 1-sec live charts, sparkline cards, alert list, host/node selector, time-range + zoom, anomaly ribbon |
| Stack | Next.js, Tailwind, shadcn-style UI | — |

Note: Studio ka code (`apps/studio`) monorepo-heavy hai (internal packages). Poora copy mat karo — pattern dekhke apna chhota version banao, `shadcn/ui` same look deta hai.

## 3. Tech stack
- **Next.js 15 (App Router) + TypeScript**
- **Tailwind CSS + shadcn/ui (Radix)** — Supabase jaisa look
- **lucide-react** icons
- **Charts:** `uPlot` (high-frequency live, Netdata-like) + `Recharts`/visx for simple charts
- **3D twin view:** `react-three-fiber` + `drei` (Phase 4)
- **Topology/flow:** `React Flow`
- **Tables:** `TanStack Table` + `react-virtual`
- **State/data:** Zustand + TanStack Query; mock layer = `MSW` + custom generator jo timer pe naye points emit kare
- **Editor:** Monaco (query/rules editor)
- **Tests:** Vitest + Playwright (smoke)

## 4. Design system (Supabase-style)
- Dark default, light optional. Near-black bg (`#1c1c1c`/`#171717`), 1px subtle borders, green accent (`#3ecf8e`-like, apna brand colour rakhna better), muted gray text.
- Font: Inter + JetBrains Mono (numbers/code). Tabular numerals for metrics.
- Compact density, 13–14px text, rounded-md, almost no shadows.
- Status colours: green ok / amber warn / red critical / blue info — charts ke liye colour-blind safe palette.
- Tokens CSS variables mein (`--bg`, `--surface`, `--border`, `--accent`).

## 5. Information architecture
Left icon-rail + collapsible section sidebar (Supabase jaisa), top bar mein project/workspace switcher, time-range, ⌘K.

1. **Overview** — fleet health, KPI cards, live sparklines, active alerts, map
2. **Twins (Assets)** — table editor style list; row click → twin detail
3. **Twin Detail** — tabs: Live · 3D/Schematic · Properties · History · Alerts · Relations
4. **Live Metrics** — Netdata-style dense chart grid, per-second, shared crosshair, zoom/pan, pause
5. **Topology** — React Flow graph of assets & dependencies with health colouring
6. **Alerts** — list, severity, ack/mute, rules
7. **Rules / Query** — SQL-like editor (Monaco) + saved queries, rule builder
8. **Simulation** — what-if sliders, replay timeline (scrub past state)
9. **Data Sources** — connectors UI (MQTT/OPC-UA/HTTP, mock), device list
10. **Logs / Events** — virtualized log explorer with filters
11. **Settings** — workspace, members, API keys, theme

## 6. Key components (reusable)
`AppShell`, `SidebarNav`, `ProjectSwitcher`, `CommandMenu (⌘K)`, `TimeRangePicker`, `LiveChart (uPlot)`, `SparklineCard`, `StatusBadge`, `DataTable`, `PropertyPanel`, `AlertRow`, `TwinCard`, `TopologyGraph`, `Scene3D`, `CodeEditor`, `EmptyState`, `Toast`, `Skeleton`.

## 7. Mock data engine
- Asset model: `{id, name, type, status, location, tags, metrics[], relations[]}`
- Generators: sine + noise + random spikes + occasional anomaly; 1 Hz tick, ring buffer 1 hr in memory.
- Alert engine: threshold rules evaluate on tick → push alerts.
- Seeded randomness (reproducible demos). Types: Server, Pump, Motor, HVAC, Sensor, Gateway.

## 8. Phases
| Phase | Deliverable | Est. |
|---|---|---|
| 0 | Repo setup, Next+Tailwind+shadcn, tokens, AppShell, sidebar, ⌘K | 1–2 d |
| 1 | Mock engine + Overview dashboard (KPI, sparklines, alerts) | 2–3 d |
| 2 | Twins table (filter/sort/virtualized) + Twin detail (properties, live charts) | 3 d |
| 3 | Live Metrics page (uPlot grid, sync crosshair, zoom, pause, anomaly ribbon) | 3–4 d |
| 4 | Topology (React Flow) + 3D twin view (R3F) | 3–4 d |
| 5 | Alerts + Rules/Query editor + Logs | 3 d |
| 6 | Simulation/replay timeline, settings, data sources UI | 2–3 d |
| 7 | Polish: light theme, responsive, a11y, animations, empty/loading states, Playwright smoke | 2 d |

## 9. Folder structure
```
src/
  app/(dashboard)/{overview,twins,twins/[id],metrics,topology,alerts,query,simulation,sources,logs,settings}
  components/{ui,layout,charts,twin,topology,scene}
  lib/{mock,store,utils}
  styles/tokens.css
```

## 10. Risks / decisions
- Netdata ka dashboard code copy nahi karna (licence) — sirf UX ideas.
- Supabase code copy karoge to Apache-2.0 notice/attribution rakho; behtar hai shadcn se rebuild.
- Live charts performance: uPlot + max ~50 charts visible, off-screen charts pause (IntersectionObserver).
- 3D optional rakho taaki scope na phoole.

## 11. Open questions (aapse)
1. Domain kya hai — industrial/factory, data-center/IT, smart building, ya generic?
2. Brand/accent colour aur product name?
3. 3D view chahiye ya schematic/2D kaafi hai?
4. Dark-only ya light bhi?
5. Deploy kahan (Vercel / static)?

## 12. Definition of done (UI-only)
Poora clickable prototype, mock live data se chalta hua, dark theme polished, 10 main screens, `npm run build` + lint + smoke tests green.

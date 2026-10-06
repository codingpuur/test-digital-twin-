# iPUMP Sense: product plan (early notes, see README for current status)

Domain: **Pumping Station digital twin**.
Design = **Supabase Studio ki premium feel** + **Netdata ke real-time monitoring features**.
Functional references: **Autodesk Tandem** (facility twin, 3D + asset data), **AVEVA** (SCADA/HMI + historian, P&ID), **IBM Maximo** (asset mgmt, work orders, PM).

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

## 4a. CORE FLOW (final direction — Tandem-style)

### Part A — BUILD the twin (setup wizard, once per facility)
1. **Create Facility** (top level, e.g. "Pumping Station A") — template choose (Pumping Station), location, timezone, units.
2. **Upload 3D model** — IFC / GLB (later RVT/DWG). Viewer opens; element tree (Level → Room → Element) extracted from model.
3. **Classification** — template ka hierarchy (Area → System → Asset type). Model elements ko asset types se map karo (auto-map by name/category rules + manual drag/assign + bulk).
4. **Parameter config / mapping** — har asset type ka schema (Pump: flow, head, kW, rpm, run-hours, vibration…). Model properties → schema fields mapping; naye custom parameters add.
5. **Linking** — asset ↔ (a) data tags/streams (SCADA/IoT), (b) documents/files, (c) maintenance (PM, work orders), (d) people/teams.
6. **Ontology (relationships)** — assets ke beech typed relations: `partOf`, `locatedIn`, `feeds / fedBy` (flow direction), `drivenBy`, `monitoredBy`, `controls`, `upstreamOf/downstreamOf`. Graph editor + auto-suggest from pipe connectivity.
7. **Publish** — validation checklist (unmapped elements, unlinked tags, orphan assets) → twin "Live".

### Part B — USE the platform (daily operation)
- **Home:** facility dashboard (health, flow, alarms, work orders due).
- **3D live view:** asset par click → live values, specs, docs, open WOs, relations. Colour by status/metric.
- **Ontology-powered actions:** "Pump P-101 alarm" → highlight upstream/downstream impact, affected assets, nearby sensors.
- **Search/query:** "all pumps in Pump Hall with vibration > 7 mm/s" (ontology + live data filter).
- **Alarm → Work order → Close** loop with asset history.
- **Docs on asset:** manuals, drawings, warranty, certificates.
- **Trends / reports / what-if simulation.**
- **Users & roles:** Admin (builds twin), Engineer, Operator, Maintenance, Viewer.

### Screens for Part A
Facilities list → New Facility wizard → Model Upload & Viewer → Classification tree → Mapping table (model element ↔ asset type) → Parameter schema editor → Linking (tags / docs / people) → Ontology graph editor → Publish checklist.

### Model upload (decision: user uploads own model)
- No sample model dependency; empty state = "Upload 3D model" drop-zone. Dev ke liye ek chhota built-in demo pump-house sirf testing/"Try demo" button.
- Formats: **GLB/glTF** (Three.js GLTFLoader) aur **IFC** (`web-ifc` WASM, browser mein parse); DWG/RVT backend conversion chahiye, UI-only mein "coming soon".
- Parsing 100% browser mein (no backend): file → parse → element tree (id, name, category, properties) → store in **IndexedDB** (large files localStorage mein nahi).
- Upload UX: drag-drop, progress bar, validation (size/format), model units + origin/orientation setting, versioning (v1, v2), replace model with re-mapping preserved by element ID/name.
- Large model: Draco/meshopt GLB support, lazy load, element picking via raycast, hide/isolate/section.

## 4b. Autodesk Tandem — operations reference (researched via search snippets; official help pages blocked in this env, verify with screenshots)
- **Account → Portfolio → Facility.** Portfolio = saari facilities ki list; "Create Facility" (name, location, template, thumbnail).
- **Manage tab (account level):** Classifications (preloaded MasterFormat/UniFormat/Uniclass/simple, ya custom upload), Parameters (user-defined), **Facility Templates** (classification + parameters per asset type), Team Management, Usage.
- **Facility ops:** add/replace **models** (Revit etc.), views (Rooms/Levels/Spaces), asset tagging with classification code, **filters panel**, isolate, **systems tracing** (connected network), documents (O&M, warranty, 360 views), groups.
- **Assets:** object (asset/space/system) + classification code + parameters; asset ko stream se link.
- **Streams & Connections (Tandem Connect):** Connection = IoT source; Stream = time-series of a device; device payload fields → Tandem parameters mapping; offline interval; numeric + discrete values; stream shown as tagged asset.
- **Dashboards / Insights:** charts on asset parameters, time-series, room/asset filters.
- **Access levels:** Primary Admin, Manage (create/delete facility, upload content, invite), Edit (modify, no upload), Read (view). Users account/team level (sab facilities) ya single-facility (vendors).
- **Apply to our app:** same hierarchy — Account/Portfolio → Facility → Model → Classification → Parameters → Streams → Docs → Users.

## 5. Information architecture (Pumping Station)
Left icon-rail + collapsible sidebar (Supabase jaisa), top bar: station switcher, time-range, ⌘K, alarm bell.

| # | Module | Inspired by | Kya hoga |
|---|---|---|---|
| 1 | **Station Overview** | Netdata + AVEVA | KPIs: total flow (m³/h), header pressure, wet-well level, power kW, specific energy kWh/m³, running pumps, active alarms; live sparklines |
| 2 | **3D Station Model** | Autodesk Tandem | Pump house 3D (R3F): pumps, motors, valves, pipes, wet well, panels. Click asset → side panel (properties + live values). Colour by status/metric, section/explode view, room/level tree |
| 3 | **P&ID / SCADA Mimic** | AVEVA HMI + AutoCAD | 2D SVG schematic: wet well → suction → pumps → discharge header. Animated flow, pump run/stop/fault, valve open/close, live tags. Layer toggles, pan/zoom, tag search |
| 4 | **Assets Register** | Maximo | Table (Supabase table-editor style): Asset ID, type, location, criticality, status, install date, OEM, parent/child hierarchy, QR/tag |
| 5 | **Asset Detail** | Tandem + Maximo | Tabs: Live · Specs/Nameplate · Curves (pump curve with operating point, efficiency/BEP) · Maintenance history · Documents (O&M manuals, drawings) · Spares · Relations |
| 6 | **Live Trends** | Netdata + AVEVA Historian | Dense chart grid: flow, pressure, level, vibration, temp, current, kW. Shared crosshair, zoom/pan, pause, compare pumps, alarm limit bands, anomaly ribbon |
| 7 | **Alarms & Events** | AVEVA | Priority (critical/high/med/low), ack/shelve, ISA-18.2 style states, alarm journal, first-out |
| 8 | **Work Orders** | Maximo | Kanban + table: corrective/preventive/inspection, assign, status flow (WAPPR→APPR→INPRG→COMP→CLOSE), failure code, labor/parts |
| 9 | **Preventive Maintenance** | Maximo | PM schedules calendar, running-hours / time based triggers, due/overdue |
| 10 | **Condition & Predictive** | Netdata anomaly + Maximo Health | Health score per asset, vibration/temperature trend, RUL estimate, anomaly flags (mock) |
| 11 | **Inventory (Spares)** | Maximo | Spare parts, stock levels, reorder, linked to asset |
| 12 | **Reports** | AVEVA/Maximo | Daily run-hours, energy, flow totals, downtime, MTBF/MTTR — export UI |
| 13 | **Simulation / What-if** | Tandem | Change setpoints (pump speed, valve %), see predicted flow/pressure/energy; replay timeline scrubber |
| 14 | **Drawings & Docs** | AutoCAD | DWG-style viewer (SVG/PDF mock): layers, measure tool, markup, linked to asset |
| 15 | **Settings** | Supabase | Users/roles (operator, maintenance, engineer, admin), thresholds, units, API keys |

## 5a. Pumping-station data model (mock)
- **Station** → Areas (Wet well, Pump hall, Electrical room, Outlet chamber) → **Assets**
- Asset types: Pump (duty/standby ×4), Motor/VFD, Valve (suction, NRV, discharge), Level sensor, Flow meter, Pressure transmitter, Vibration sensor, MCC panel, Surge vessel, Generator.
- Tags like `P-101.RUN`, `P-101.CUR`, `P-101.VIB`, `LT-001.LEVEL`, `FT-201.FLOW`, `PT-202.PRESS`.
- Simulated behaviour: wet-well level fills/drains → duty/standby auto start-stop (lead/lag), flow follows pump curve, vibration/temp drift, random faults (high vibration, seal leak, trip, low level), runtime counters drive PM due.

## 5b. Extra pages for quick access
Operator view (big-tile HMI, touch friendly) and Maintenance view (work orders first) as role-based home screens.

## 6. Key components (reusable)
`AppShell`, `SidebarNav`, `ProjectSwitcher`, `CommandMenu (⌘K)`, `TimeRangePicker`, `LiveChart (uPlot)`, `SparklineCard`, `StatusBadge`, `DataTable`, `PropertyPanel`, `AlertRow`, `TwinCard`, `MimicCanvas` (SVG P&ID), `PumpCurveChart`, `AlarmBanner`, `WorkOrderBoard`, `HealthGauge`, `Scene3D`, `CodeEditor`, `EmptyState`, `Toast`, `Skeleton`.

## 7. Mock data engine
- Asset model: `{id, name, type, status, location, tags, metrics[], relations[]}`
- Generators: sine + noise + random spikes + occasional anomaly; 1 Hz tick, ring buffer 1 hr in memory.
- Alert engine: threshold rules evaluate on tick → push alerts.
- Seeded randomness (reproducible demos). Types: Server, Pump, Motor, HVAC, Sensor, Gateway.

## 8. Phases
| Phase | Deliverable | Est. |
|---|---|---|
| 0 | Setup (Next+Tailwind+shadcn), tokens, AppShell, sidebar, ⌘K, station switcher | 1–2 d |
| 1 | Pumping-station mock engine (level, lead/lag, pump curves, faults) + Station Overview | 3 d |
| 2 | Assets Register + Asset Detail (live, specs, pump curve, relations) | 3 d |
| 3 | Live Trends (uPlot) + Alarms & Events | 4 d |
| 4 | P&ID / SCADA mimic (animated SVG) | 3 d |
| 5 | 3D Station Model (R3F, click → panel, status colouring) | 4–5 d |
| 6 | Maximo side: Work Orders, PM calendar, Spares, Health/Predictive | 4–5 d |
| 7 | Simulation/replay, Reports, Drawings viewer, Settings/roles | 3 d |
| 8 | Polish: light theme, responsive, a11y, empty/loading states, Playwright smoke | 2 d |

## 9. Folder structure
```
src/
  app/(dashboard)/{overview,model3d,mimic,assets,assets/[id],trends,alarms,work-orders,pm,health,inventory,reports,simulation,drawings,settings}
  components/{ui,layout,charts,twin,topology,scene}
  lib/{mock,store,utils}
  styles/tokens.css
```

## 10. Risks / decisions
- Netdata ka dashboard code copy nahi karna (licence) — sirf UX ideas.
- Supabase code copy karoge to Apache-2.0 notice/attribution rakho; behtar hai shadcn se rebuild.
- Live charts performance: uPlot + max ~50 charts visible, off-screen charts pause (IntersectionObserver).
- 3D optional rakho taaki scope na phoole.

## 11. Open questions
1. 3D model: simple procedural (boxes/cylinders, jaldi) ya real GLB/IFC model aap denge? (Default: procedural, baad mein GLB swap)
2. Product name + accent colour?
3. Units: metric (m³/h, bar, kW) — OK?
4. Dark-only pehle, light baad mein?
5. Pumps ki sankhya/layout (default: 3 duty + 1 standby, ek wet well)?

## 12. Definition of done (UI-only)
Poora clickable prototype, mock live data se chalta hua, dark theme polished, 15 modules, `npm run build` + lint + smoke tests green.

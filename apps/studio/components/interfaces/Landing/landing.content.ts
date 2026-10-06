export type FeatureRow = {
  id: string
  eyebrow: string
  title: string
  description: string
  bullets: string[]
  image: string
  imageAlt: string
}

export const FEATURE_ROWS: FeatureRow[] = [
  {
    id: 'workspace',
    eyebrow: '3D workspace',
    title: 'One workspace for the whole station',
    description:
      'Bring your own model and see every pump, valve, pipe and tank in one place, with its data right next to it.',
    bullets: [
      'Upload GLB, glTF or IFC files. They are processed in your browser.',
      'Every element becomes a row in a searchable inventory.',
      'Click in 3D or in the table: both stay in sync.',
      'A properties panel shows each element’s details and readings.',
    ],
    image: '/img/landing/workspace.png',
    imageAlt:
      'The workspace with a 3D pumping station, the inventory table and the properties panel',
  },
  {
    id: 'replay',
    eyebrow: 'Live and replay',
    title: 'Replay any moment, see what went wrong',
    description:
      'Switch between live readings and history. Drag the timeline to a past event and the whole station shows how it looked then.',
    bullets: [
      'Scrub, zoom and play the timeline at up to 8x.',
      'Parts turn red when a reading crosses its limit.',
      'Properties show the readings at the time you picked.',
      'The same timeline works on dashboards.',
    ],
    image: '/img/landing/replay.png',
    imageAlt: 'The timeline scrubbed to a past warning, with the pump highlighted in red',
  },
  {
    id: 'dashboards',
    eyebrow: 'Dashboards',
    title: 'Dashboards your team builds in minutes',
    description:
      'Start blank or from a pumping station template, then add the cards you need. No code.',
    bullets: [
      'Six card types: values, gauges, line charts, summary tables, averages and notes.',
      'Pick streams and see a live preview before you add a card.',
      'Choose the layout and the date range.',
      'Save as new to try a variation.',
    ],
    image: '/img/landing/dashboard.png',
    imageAlt: 'A dashboard with a gauge, a line chart and a parameters table',
  },
  {
    id: 'simulation',
    eyebrow: 'Simulation',
    title: 'Test it before it happens',
    description:
      'Run a storm, trip a pump or close a valve in the model, and watch the station react. Compare the run with what actually happened.',
    bullets: [
      'Scenarios: storm inflow, pump trip, closed valve, power failure.',
      'Auto lead/lag starts standby pumps as the level rises.',
      'Alarms, an event log and charts of simulated against actual.',
      'Change inflow, valve position and pump speeds by hand.',
    ],
    image: '/img/landing/simulation.png',
    imageAlt: 'Simulation mode with scenarios, controls, level and flow charts and an event log',
  },
  {
    id: 'animation',
    eyebrow: 'Animation',
    title: 'Parts that move with the data',
    description:
      'Link any signal to any part. Impellers spin with pump speed, water rises with the level, valves turn, and warnings pulse.',
    bullets: [
      'Five effects: rotate, flow dashes, fill, valve and pulse.',
      'Choose the signal for each effect from the properties panel.',
      'Switch an animation off or remove it at any time.',
      'Works the same in live, replay and simulation.',
    ],
    image: '/img/landing/bindings.png',
    imageAlt: 'Properties panel showing animation bindings for a pump that has tripped',
  },
]

export const USE_CASES = [
  'Water supply',
  'Wastewater lift stations',
  'Storm water',
  'Irrigation',
  'Industrial cooling',
]

export const BEFORE_POINTS = [
  'Readings sit on separate SCADA screens.',
  'Drawings and manuals live in folders nobody can find.',
  'You learn about a problem after the alarm.',
  'Testing a change means testing it on the real station.',
]

export const AFTER_POINTS = [
  'One 3D view, with every reading on the part it belongs to.',
  'Properties, history and settings a click away.',
  'Replay the lead-up to any event.',
  'Try the change in a simulation first.',
]

export const STEPS = [
  {
    title: 'Create a site',
    description: 'Name your pumping station. One account can hold many sites.',
  },
  { title: 'Upload your model', description: 'Drop in a GLB, glTF or IFC file and see it in 3D.' },
  { title: 'Link your signals', description: 'Tie readings to the parts they describe.' },
  { title: 'Monitor and simulate', description: 'Watch it run, replay it, and test what-ifs.' },
]

export type Connector = { name: string; description: string; isAvailable: boolean }

export const CONNECTORS: Connector[] = [
  {
    name: 'Built-in simulator',
    description: 'Realistic sample readings, so you can try everything without hardware.',
    isAvailable: true,
  },
  {
    name: 'HTTP and webhooks',
    description: 'Gateways and devices post readings with an API key.',
    isAvailable: false,
  },
  {
    name: 'MQTT',
    description: 'Subscribe to topics from your broker for frequent, low-bandwidth data.',
    isAvailable: false,
  },
  {
    name: 'OPC UA and Modbus',
    description: 'Connect PLCs and SCADA through an edge gateway.',
    isAvailable: false,
  },
  {
    name: 'CSV import',
    description: 'Load history from a historian export.',
    isAvailable: false,
  },
]

export const FAQS = [
  {
    question: 'Which 3D files can I use?',
    answer:
      'GLB, glTF and IFC. Files are read in your browser. If you do not have a model yet, use the built-in demo station.',
  },
  {
    question: 'Do I need hardware or a SCADA system to try it?',
    answer:
      'No. iPUMP Sense includes a simulator that produces realistic readings, so you can explore the workspace, dashboards and simulation straight away.',
  },
  {
    question: 'Can I connect my real data?',
    answer:
      'Live connectors (HTTP, MQTT, and OPC UA or Modbus through a gateway) and CSV import are being built. Today the product runs on the built-in simulator.',
  },
  {
    question: 'What does the simulation do?',
    answer:
      'It runs a simple model of a pumping station: wet-well level, pump flow and power, discharge pressure and lead/lag control. Use it to see how a storm, a pump trip or a closed valve plays out.',
  },
  {
    question: 'Is it ready for production use?',
    answer:
      'iPUMP Sense is in early access. Real authentication, storage for models and documents, and roles for your team are still on the way, so treat it as a preview.',
  },
  {
    question: 'Can I manage more than one station?',
    answer:
      'Yes. An account holds any number of sites, each with its own model, dashboards and settings.',
  },
]

import type { AnswerChart, AssistantAnswer } from './assistant.types'

// Scripted answers for the demo. Each one is shaped like what a real assistant would return, so the
// screen does not change when a model replaces this file.

const GREEN = '#3ecf8e'
const AMBER = '#e5a23b'
const BLUE = '#4c9be8'
const RED = '#e5484d'

const series = (count: number, fn: (index: number) => number) =>
  Array.from({ length: count }, (_, index) => +fn(index).toFixed(1))

const dayLabels = (count: number, suffix = 'd') =>
  Array.from({ length: count }, (_, index) => `${index - count + 1}${suffix}`)

const scoreChart = (): AnswerChart => ({
  title: 'M-101 · score and phase B current',
  labels: dayLabels(30),
  series: [
    {
      name: 'Score',
      color: GREEN,
      values: series(30, (i) => 88 - i * 0.55 - Math.max(0, i - 18) * 0.35 + Math.sin(i * 1.6)),
    },
    {
      name: 'Phase B current (A)',
      color: AMBER,
      axis: 'right',
      values: series(30, (i) => 38 + Math.max(0, i - 10) * 0.28 + Math.sin(i * 2.1) * 0.6),
    },
  ],
})

const forecastChart = (): AnswerChart => {
  const hours = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`)
  const load = (hour: number) =>
    250 + 150 * Math.exp(-(((hour - 14) / 4.5) ** 2)) + 30 * Math.sin(hour / 3)
  return {
    title: 'Pump room load, today and tomorrow (kW)',
    labels: hours,
    series: [
      {
        name: 'Today (actual)',
        color: GREEN,
        values: hours.map((_, hour) => +load(hour - 0.3).toFixed(0)),
      },
      {
        name: 'Tomorrow (forecast)',
        color: BLUE,
        isDashed: true,
        values: hours.map((_, hour) => +(load(hour) * 1.04).toFixed(0)),
      },
    ],
  }
}

const vibrationChart = (): AnswerChart => ({
  title: 'Vibration, last 14 days (mm/s)',
  labels: dayLabels(14),
  series: [
    {
      name: 'P-101',
      color: RED,
      values: series(14, (i) => 3 + i * 0.32 + Math.sin(i * 1.3) * 0.3),
    },
    { name: 'P-102', color: BLUE, values: series(14, (i) => 2.6 + Math.sin(i * 1.1) * 0.25) },
  ],
})

type Script = { keywords: string[]; answer: () => AssistantAnswer }

const SCRIPTS: Script[] = [
  {
    keywords: ['ticket'],
    answer: () => ({
      steps: ['Read open tickets for the site', 'Matched them to assets and priorities'],
      intro:
        'There are open tickets on 2 assets. The bearing fault on P-101 has no ticket yet, and it is the most urgent item.',
      list: [
        { title: 'P-101 Pump', detail: 'No ticket. Bearing wear is severe, RUL about 9 days.' },
        {
          title: 'M-101 Motor',
          detail: 'T-1 “Check supply on feeder MCC-01” is open, priority medium.',
        },
        {
          title: 'P-102 Pump',
          detail: 'No ticket. Incipient impeller imbalance, can wait for planned maintenance.',
        },
      ],
      outro: 'I suggest raising a high priority ticket for P-101 today.',
      sources: ['Tickets · site', 'Asset · P-101 Pump', 'Fault · Bearing wear'],
      actions: [
        { label: 'Create ticket', href: '/project/{ref}?module=tickets', isPrimary: true },
        { label: 'View in 3D', href: '/project/{ref}' },
      ],
      followUps: ['What is the RUL of P-101?', 'Generate report'],
    }),
  },
  {
    keywords: ['forecast', 'power', 'consumption', 'kw'],
    answer: () => ({
      steps: [
        'Read power readings for the pump room',
        'Compared with the same weekday over 4 weeks',
        'Ran the demand forecast',
      ],
      intro:
        'Tomorrow’s peak is forecast at about 412 kW around 14:00, roughly 4% above today. That is within your contract limit.',
      chart: forecastChart(),
      outro:
        'The rise comes from the third pump starting earlier on the forecast flow. Shifting one start to after 16:00 would trim the peak by about 35 kW.',
      sources: ['Streams · pump room power', 'Forecast · 24 h demand'],
      actions: [
        { label: 'Open dashboards', href: '/project/{ref}?module=dashboards', isPrimary: true },
      ],
      followUps: ['What if I delay pump 3?', 'Generate report'],
    }),
  },
  {
    keywords: ['compare', 'vibration', 'p-102'],
    answer: () => ({
      steps: ['Read vibration streams for P-101 and P-102', 'Compared the last 14 days'],
      intro:
        'P-101 vibration has climbed from 3.0 to about 7.4 mm/s in 14 days, while P-102 stayed steady near 2.6 mm/s.',
      chart: vibrationChart(),
      outro:
        'P-101 crossed its 7 mm/s warning level yesterday. The pattern matches outer race bearing wear.',
      sources: ['Stream · P-101.vibration', 'Stream · P-102.vibration'],
      actions: [{ label: 'Create ticket', href: '/project/{ref}?module=tickets', isPrimary: true }],
      followUps: ['Why is P-101 degrading?', 'List open tickets'],
    }),
  },
  {
    keywords: ['changed', 'last 24', 'what changed'],
    answer: () => ({
      steps: ['Read the last 24 hours of P-101 streams', 'Checked alarms and fault stage changes'],
      intro: 'Three things changed on P-101 in the last 24 hours:',
      list: [
        {
          title: 'Vibration crossed the warning level',
          detail: '7.1 mm/s at 02:40, now 7.4 mm/s.',
        },
        {
          title: 'Bearing wear moved to Severe',
          detail: 'Stage changed from Developing at 06:15.',
        },
        {
          title: 'Health score dropped 9 points',
          detail: 'From 47 to 38, now in the Critical band.',
        },
      ],
      outro: 'Remaining useful life is now about 9 days at the current trend.',
      sources: ['Stream · P-101.vibration', 'Fault · Bearing wear', 'Asset · P-101 Pump'],
      actions: [
        { label: 'Create ticket', href: '/project/{ref}?module=tickets', isPrimary: true },
        { label: 'View in 3D', href: '/project/{ref}' },
      ],
      followUps: ['Compare P-101 and P-102 vibration', 'Create a ticket for P-101'],
    }),
  },
  {
    keywords: ['report', 'summary', 'summarize'],
    answer: () => ({
      steps: [
        'Collected asset scores for the week',
        'Listed new faults and anomalies',
        'Drafted the summary',
      ],
      intro: 'Weekly health summary for Pumping Station A:',
      list: [
        { title: 'Site score 74', detail: 'Down 3 points. One asset critical, two on watch.' },
        {
          title: '4 active faults',
          detail: '2 developing (M-101 rotor bar, P-101 bearing) and 2 incipient.',
        },
        {
          title: '7 anomalies today',
          detail: '3 not reviewed yet, mostly on M-101 phase B current.',
        },
      ],
      outro: 'A full report with charts can be generated once reporting is available.',
      sources: ['Asset scores · 7 days', 'Faults · active', 'Anomalies · today'],
      actions: [{ label: 'Open dashboards', href: '/project/{ref}?module=dashboards' }],
      followUps: ['List open tickets', 'Forecast tomorrow’s power'],
    }),
  },
  {
    keywords: ['score', 'why', 'drop', 'health', 'm-101', 'degrad'],
    answer: () => ({
      steps: [
        'Read score history for M-101 (90 days)',
        'Checked 6 streams: current A/B/C, voltage, vibration, temperature',
        'Ran root cause analysis on fault “Rotor bar degradation”',
      ],
      intro:
        'M-101’s score fell from 88 to 62 in 45 days. The main driver is a supply voltage imbalance, which is also loading the rotor bars (MCSA flags a developing fault).',
      chart: scoreChart(),
      list: [
        {
          title: 'Supply voltage imbalance (61%)',
          detail: 'Phase B current has run 7% above phases A and C since Aug 20.',
        },
        { title: 'Frequent start/stop cycles (24%)', detail: '38 starts this week, up from 12.' },
        { title: 'Sustained overload (15%)', detail: 'Load above 95% for 3 short periods.' },
      ],
      outro:
        'At the current trend the motor reaches the failure threshold in about 42 days. I’d check the feeder at MCC-01 first.',
      sources: [
        'Stream · M-101.current_B',
        'Fault · Rotor bar degradation',
        'Asset · M-101 Motor',
        'RCA · run today 18:42',
      ],
      actions: [
        { label: 'Create ticket', href: '/project/{ref}?module=tickets', isPrimary: true },
        { label: 'View in 3D', href: '/project/{ref}' },
        { label: 'Add chart to dashboard', href: '/project/{ref}?module=dashboards' },
      ],
      followUps: [
        'What if I fix the imbalance?',
        'Compare P-101 and P-102 vibration',
        'Generate report',
      ],
    }),
  },
]

const FALLBACK: AssistantAnswer = {
  steps: ['Looked for matching assets, streams and tickets'],
  intro:
    'This is a demo assistant with scripted answers, so I can only answer a few questions for now. Try one of these:',
  list: [
    { title: 'Why is M-101’s health score dropping?', detail: 'Root cause analysis with a chart.' },
    {
      title: 'What changed on P-101 in the last 24 hours?',
      detail: 'Faults, alarms and score changes.',
    },
    {
      title: 'Forecast tomorrow’s power consumption',
      detail: 'Demand forecast for the pump room.',
    },
  ],
  sources: [],
  actions: [],
  followUps: ['Why is M-101’s score dropping?', 'List open tickets'],
}

export const answerFor = (question: string): AssistantAnswer => {
  const text = question.toLowerCase()
  const script = SCRIPTS.find((item) => item.keywords.some((keyword) => text.includes(keyword)))
  return script ? script.answer() : FALLBACK
}

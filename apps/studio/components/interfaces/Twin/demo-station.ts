import * as THREE from 'three'

type PartSpec = {
  name: string
  category: string
  level: string
  room: string
  system: string
  shape: 'box' | 'cylinder' | 'sphere'
  position: [number, number, number]
  size: [number, number, number]
  color: string
}

const HALL = 'Pump hall'
const SUCTION = 'Raw water'
const DISCHARGE = 'Treated water'

const pumpX = [-3, 0, 3]

const pumpParts = (index: number, x: number): PartSpec[] => {
  const tag = `10${index + 1}`
  return [
    {
      name: `P-${tag} Pump`,
      category: 'Pumps',
      level: 'Ground',
      room: HALL,
      system: SUCTION,
      shape: 'cylinder',
      position: [x, 0.9, 0],
      size: [0.55, 0.9, 0.55],
      color: '#2f6fb3',
    },
    {
      name: `M-${tag} Motor`,
      category: 'Motors',
      level: 'Ground',
      room: HALL,
      system: SUCTION,
      shape: 'cylinder',
      position: [x, 1.8, 0],
      size: [0.45, 0.8, 0.45],
      color: '#3a8f6a',
    },
    {
      name: `SV-${tag} Suction valve`,
      category: 'Valves',
      level: 'Ground',
      room: HALL,
      system: SUCTION,
      shape: 'sphere',
      position: [x, 0.6, -1.4],
      size: [0.3, 0.3, 0.3],
      color: '#d9822b',
    },
    {
      name: `DV-${tag} Discharge valve`,
      category: 'Valves',
      level: 'Ground',
      room: HALL,
      system: DISCHARGE,
      shape: 'sphere',
      position: [x, 1.1, 1.4],
      size: [0.3, 0.3, 0.3],
      color: '#d9822b',
    },
    {
      name: `Suction pipe ${tag}`,
      category: 'Pipes',
      level: 'Ground',
      room: HALL,
      system: SUCTION,
      shape: 'cylinder',
      position: [x, 0.6, -2.2],
      size: [0.15, 1.6, 0.15],
      color: '#7f8c99',
    },
    {
      name: `Discharge pipe ${tag}`,
      category: 'Pipes',
      level: 'Ground',
      room: HALL,
      system: DISCHARGE,
      shape: 'cylinder',
      position: [x, 1.1, 2.2],
      size: [0.15, 1.6, 0.15],
      color: '#5aa6d6',
    },
  ]
}

const PARTS: PartSpec[] = [
  {
    name: 'Ground slab',
    category: 'Floors',
    level: 'Ground',
    room: HALL,
    system: '',
    shape: 'box',
    position: [0, -0.15, 0],
    size: [12, 0.3, 8],
    color: '#8a8f98',
  },
  {
    name: 'North wall',
    category: 'Walls',
    level: 'Ground',
    room: HALL,
    system: '',
    shape: 'box',
    position: [0, 1.6, -4],
    size: [12, 3.2, 0.25],
    color: '#c9ccd1',
  },
  {
    name: 'East wall',
    category: 'Walls',
    level: 'Ground',
    room: HALL,
    system: '',
    shape: 'box',
    position: [6, 1.6, 0],
    size: [0.25, 3.2, 8],
    color: '#c9ccd1',
  },
  {
    name: 'West wall',
    category: 'Walls',
    level: 'Ground',
    room: HALL,
    system: '',
    shape: 'box',
    position: [-6, 1.6, 0],
    size: [0.25, 3.2, 8],
    color: '#c9ccd1',
  },
  {
    name: 'Wet well',
    category: 'Tanks',
    level: 'Basement',
    room: 'Wet well',
    system: SUCTION,
    shape: 'cylinder',
    position: [-9.5, 1.2, -2.2],
    size: [2.2, 2.4, 2.2],
    color: '#4c7ea8',
  },
  {
    name: 'Suction header',
    category: 'Pipes',
    level: 'Ground',
    room: HALL,
    system: SUCTION,
    shape: 'box',
    position: [-1, 0.6, -3.1],
    size: [8.6, 0.3, 0.3],
    color: '#7f8c99',
  },
  {
    name: 'Discharge header',
    category: 'Pipes',
    level: 'Ground',
    room: HALL,
    system: DISCHARGE,
    shape: 'box',
    position: [0, 1.1, 3.1],
    size: [8.6, 0.3, 0.3],
    color: '#5aa6d6',
  },
  {
    name: 'MCC-01 Control panel',
    category: 'Electrical',
    level: 'Ground',
    room: 'Electrical room',
    system: 'Power',
    shape: 'box',
    position: [5, 1.1, -3.2],
    size: [1.4, 2.2, 0.6],
    color: '#b6453f',
  },
  {
    name: 'LT-001 Level sensor',
    category: 'Sensors',
    level: 'Basement',
    room: 'Wet well',
    system: SUCTION,
    shape: 'cylinder',
    position: [-9.5, 2.6, -2.2],
    size: [0.12, 0.5, 0.12],
    color: '#e5c04a',
  },
  ...pumpX.flatMap((x, index) => pumpParts(index, x)),
]

// Which mock streams report on which demo element.
const STREAMS_BY_NAME: Record<string, string[]> = {
  'P-101 Pump': ['vibration'],
  'M-101 Motor': ['power', 'temperature'],
  'LT-001 Level sensor': ['level'],
  'Wet well': ['level'],
  'Suction header': ['flow'],
  'Discharge header': ['pressure', 'flow'],
  'MCC-01 Control panel': ['power'],
}

const createGeometry = (part: PartSpec) => {
  const [x, y, z] = part.size
  if (part.shape === 'box') return new THREE.BoxGeometry(x, y, z)
  if (part.shape === 'sphere') return new THREE.SphereGeometry(x, 24, 16)
  return new THREE.CylinderGeometry(x, x, y, 32)
}

/** Procedural pumping station used until the user uploads a real model. */
export const buildDemoStation = (): THREE.Group => {
  const group = new THREE.Group()
  group.name = 'Demo pumping station'

  PARTS.forEach((part, index) => {
    const mesh = new THREE.Mesh(
      createGeometry(part),
      new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.6, metalness: 0.15 })
    )
    mesh.name = part.name
    mesh.position.set(...part.position)
    mesh.userData.twin = {
      id: `demo-${index + 1}`,
      name: part.name,
      level: part.level,
      room: part.room,
      category: part.category,
      system: part.system,
      source: 'Demo model',
      guid: `demo-${String(index + 1).padStart(4, '0')}`,
      streamIds: STREAMS_BY_NAME[part.name],
    }
    group.add(mesh)
  })

  return group
}

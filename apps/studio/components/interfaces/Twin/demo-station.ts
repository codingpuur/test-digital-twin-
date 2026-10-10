import * as THREE from 'three'

type PartSpec = {
  name: string
  category: string
  level: string
  room: string
  system: string
  /** Equipment the part belongs to; pump and motor of one unit share it. */
  equipment?: string
  shape: 'box' | 'cylinder' | 'sphere'
  position: [number, number, number]
  size: [number, number, number]
  color: string
}

const HALL = 'Pump hall'
const SUCTION = 'Raw water'
const DISCHARGE = 'Treated water'

// Eight pumps in a row, with room for a person to walk between the units.
const PUMP_COUNT = 8
const PUMP_SPACING = 3.4
const HALL_WIDTH = 32
const HALL_DEPTH = 10
const pumpX = Array.from(
  { length: PUMP_COUNT },
  (_, i) => (i - (PUMP_COUNT - 1) / 2) * PUMP_SPACING
)
const HEADER_LENGTH = PUMP_SPACING * (PUMP_COUNT - 1) + 2
// The wet well sits in the basement, just outside the west wall.
const WELL_X = -HALL_WIDTH / 2 - 4

const pumpParts = (index: number, x: number): PartSpec[] => {
  const tag = `10${index + 1}`
  return [
    {
      name: `P-${tag} Pump`,
      equipment: `P-${tag}`,
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
      equipment: `P-${tag}`,
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
      equipment: `SV-${tag}`,
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
      equipment: `DV-${tag}`,
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
    size: [HALL_WIDTH, 0.3, HALL_DEPTH],
    color: '#8a8f98',
  },
  {
    name: 'North wall',
    category: 'Walls',
    level: 'Ground',
    room: HALL,
    system: '',
    shape: 'box',
    position: [0, 1.6, -HALL_DEPTH / 2],
    size: [HALL_WIDTH, 3.2, 0.25],
    color: '#c9ccd1',
  },
  {
    name: 'East wall',
    category: 'Walls',
    level: 'Ground',
    room: HALL,
    system: '',
    shape: 'box',
    position: [HALL_WIDTH / 2, 1.6, 0],
    size: [0.25, 3.2, HALL_DEPTH],
    color: '#c9ccd1',
  },
  {
    name: 'West wall',
    category: 'Walls',
    level: 'Ground',
    room: HALL,
    system: '',
    shape: 'box',
    position: [-HALL_WIDTH / 2, 1.6, 0],
    size: [0.25, 3.2, HALL_DEPTH],
    color: '#c9ccd1',
  },
  {
    name: 'Wet well',
    category: 'Tanks',
    level: 'Basement',
    room: 'Wet well',
    system: SUCTION,
    shape: 'cylinder',
    position: [WELL_X, 1.2, -2.2],
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
    position: [0, 0.6, -3.1],
    size: [HEADER_LENGTH, 0.3, 0.3],
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
    size: [HEADER_LENGTH, 0.3, 0.3],
    color: '#5aa6d6',
  },
  {
    name: 'MCC-01 Control panel',
    category: 'Electrical',
    level: 'Ground',
    room: 'Electrical room',
    system: 'Power',
    shape: 'box',
    position: [HALL_WIDTH / 2 - 2.5, 1.1, -HALL_DEPTH / 2 + 0.8],
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
    position: [WELL_X, 2.6, -2.2],
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

const FLOW_DASH_LENGTH = 0.8

/** Dashed strip texture; `axis` is the UV direction the dashes repeat along. */
const createDashTexture = (axis: 'u' | 'v', length: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const context = canvas.getContext('2d')
  if (context) {
    context.fillStyle = '#9fd0ff'
    if (axis === 'u') context.fillRect(0, 0, 24, 64)
    else context.fillRect(0, 0, 64, 24)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  if (axis === 'u') texture.repeat.set(length / FLOW_DASH_LENGTH, 1)
  else texture.repeat.set(1, length / FLOW_DASH_LENGTH)
  return texture
}

const createImpeller = (radius: number) => {
  const impeller = new THREE.Group()
  impeller.name = 'impeller'
  const material = new THREE.MeshStandardMaterial({
    color: '#9fb2c6',
    metalness: 0.4,
    roughness: 0.4,
  })
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(radius * 2.4, 0.06, 0.16), material)
    blade.rotation.y = (i * Math.PI) / 4
    impeller.add(blade)
  }
  return impeller
}

const createValveHandle = () => {
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.08, 0.1),
    new THREE.MeshStandardMaterial({ color: '#f0c05a' })
  )
  handle.name = 'handle'
  return handle
}

const createFlowOverlay = (part: PartSpec) => {
  const isVertical = part.shape === 'cylinder'
  const length = isVertical ? part.size[1] : part.size[0]
  const geometry = isVertical
    ? new THREE.CylinderGeometry(
        part.size[0] * 1.08,
        part.size[0] * 1.08,
        part.size[1],
        24,
        1,
        true
      )
    : new THREE.BoxGeometry(part.size[0], part.size[1] * 1.12, part.size[2] * 1.12)
  const overlay = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      map: createDashTexture(isVertical ? 'v' : 'u', length),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  )
  overlay.name = 'flow'
  overlay.userData.flowAxis = isVertical ? 'y' : 'x'
  overlay.visible = false
  return overlay
}

const createWater = (radius: number, height: number) => {
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, 1, 32),
    new THREE.MeshStandardMaterial({ color: '#4c9be8', transparent: true, opacity: 0.85 })
  )
  water.name = 'water'
  water.userData.fullHeight = height * 0.96
  return water
}

// Child meshes that the animation engine drives. They carry no `twin` data, so they are not inventory rows.
const addAnimatedParts = (mesh: THREE.Mesh, part: PartSpec) => {
  const material = mesh.material as THREE.MeshStandardMaterial
  if (part.category === 'Pumps') {
    const impeller = createImpeller(part.size[0])
    impeller.position.y = 0.25
    mesh.add(impeller)
  }
  if (part.category === 'Valves') {
    const handle = createValveHandle()
    handle.position.y = part.size[0] + 0.05
    mesh.add(handle)
  }
  if (part.category === 'Pipes') mesh.add(createFlowOverlay(part))
  if (part.name === 'Wet well') {
    material.transparent = true
    material.opacity = 0.35
    mesh.add(createWater(part.size[0], part.size[1]))
  }
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
      equipment: part.equipment ?? '',
      source: 'Demo model',
      guid: `demo-${String(index + 1).padStart(4, '0')}`,
      streamIds: STREAMS_BY_NAME[part.name],
    }
    addAnimatedParts(mesh, part)
    group.add(mesh)
  })

  return group
}

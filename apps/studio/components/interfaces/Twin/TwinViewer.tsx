import { Bounds, GizmoHelper, GizmoViewcube, Grid, OrbitControls } from '@react-three/drei'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'

import type { TwinElement } from './twin.types'

const SELECTED_EMISSIVE = new THREE.Color('#3ecf8e')
const NO_EMISSIVE = new THREE.Color('#000000')

const highlightSelection = (root: THREE.Object3D, selectedId: string | null) => {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    const material = mesh.material as THREE.MeshStandardMaterial | undefined
    if (!mesh.isMesh || !material?.emissive) return
    const twin: TwinElement | undefined = mesh.userData.twin
    const isSelected = !!twin && twin.id === selectedId
    material.emissive.copy(isSelected ? SELECTED_EMISSIVE : NO_EMISSIVE)
    material.emissiveIntensity = isSelected ? 0.8 : 0
  })
}

type TwinViewerProps = {
  scene: THREE.Object3D
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export const TwinViewer = ({ scene, selectedId, onSelect }: TwinViewerProps) => {
  useEffect(() => {
    highlightSelection(scene, selectedId)
  }, [scene, selectedId])

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    const twin: TwinElement | undefined = event.object.userData.twin
    onSelect(twin?.id ?? null)
  }

  return (
    <Canvas
      camera={{ position: [14, 10, 14], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
      onPointerMissed={() => onSelect(null)}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 16, 6]} intensity={1.4} />
      <directionalLight position={[-8, 6, -10]} intensity={0.4} />
      <Grid
        position={[0, -0.31, 0]}
        args={[40, 40]}
        cellColor="#6b7280"
        sectionColor="#9ca3af"
        fadeDistance={45}
        infiniteGrid
      />
      <Bounds fit observe margin={1.3}>
        <primitive object={scene} onClick={handleClick} />
      </Bounds>
      <OrbitControls makeDefault />
      <GizmoHelper alignment="top-right" margin={[72, 72]}>
        <GizmoViewcube />
      </GizmoHelper>
    </Canvas>
  )
}

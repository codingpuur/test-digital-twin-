import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import type { Vec3, ViewCamera } from './views/views.types'

export type ViewerApi = {
  /** A small picture of the 3D view and where the camera is right now. */
  capture: () => { thumbnail: string; camera: ViewCamera }
  /** Flies the camera to a saved position. */
  applyCamera: (camera: ViewCamera) => void
}

type OrbitLike = { target: THREE.Vector3; update: () => void }

const isOrbitLike = (value: unknown): value is OrbitLike =>
  typeof value === 'object' && value !== null && 'target' in value && 'update' in value

const THUMBNAIL_WIDTH = 320
const THUMBNAIL_HEIGHT = 180
const FLY_SPEED = 5

const toVec3 = (vector: THREE.Vector3): Vec3 => [vector.x, vector.y, vector.z]

/** Gives the page a handle on the 3D canvas: take a thumbnail and read or set the camera. */
export const ViewerBridge = ({ onReady }: { onReady: (api: ViewerApi | null) => void }) => {
  const { gl, scene, camera, controls } = useThree()
  const orbit = isOrbitLike(controls) ? controls : null
  const goal = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    const capture: ViewerApi['capture'] = () => {
      // Render right before reading the canvas, so it is not blank without preserveDrawingBuffer.
      gl.render(scene, camera)
      const canvas = document.createElement('canvas')
      canvas.width = THUMBNAIL_WIDTH
      canvas.height = THUMBNAIL_HEIGHT
      const context = canvas.getContext('2d')
      const source = gl.domElement
      if (context) {
        context.fillStyle = '#1b1b1b'
        context.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)
        // Crop the middle of the canvas to 16:9 so thumbnails line up in the gallery.
        const ratio = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT
        const cropWidth = Math.min(source.width, source.height * ratio)
        const cropHeight = cropWidth / ratio
        context.drawImage(
          source,
          (source.width - cropWidth) / 2,
          (source.height - cropHeight) / 2,
          cropWidth,
          cropHeight,
          0,
          0,
          THUMBNAIL_WIDTH,
          THUMBNAIL_HEIGHT
        )
      }
      return {
        thumbnail: canvas.toDataURL('image/jpeg', 0.7),
        camera: {
          position: toVec3(camera.position),
          target: orbit ? toVec3(orbit.target) : [0, 0, 0],
        },
      }
    }

    const applyCamera: ViewerApi['applyCamera'] = ({ position, target }) => {
      goal.current = {
        position: new THREE.Vector3(...position),
        target: new THREE.Vector3(...target),
      }
    }

    onReadyRef.current({ capture, applyCamera })
    return () => onReadyRef.current(null)
  }, [gl, scene, camera, orbit])

  // Ease towards the saved camera instead of jumping.
  useFrame((_, delta) => {
    const next = goal.current
    if (!next) return
    const step = 1 - Math.exp(-delta * FLY_SPEED)
    camera.position.lerp(next.position, step)
    orbit?.target.lerp(next.target, step)
    orbit?.update()
    const isArrived =
      camera.position.distanceTo(next.position) < 0.02 &&
      (!orbit || orbit.target.distanceTo(next.target) < 0.02)
    if (isArrived) {
      camera.position.copy(next.position)
      orbit?.target.copy(next.target)
      orbit?.update()
      goal.current = null
    }
  })

  return null
}

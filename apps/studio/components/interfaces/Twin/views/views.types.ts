export type Vec3 = [number, number, number]

export type ViewCamera = { position: Vec3; target: Vec3 }

/** A saved snapshot of the 3D screen: where the camera is and what is shown. */
export type TwinView = {
  id: string
  name: string
  createdAt: string
  /** Small JPEG of the 3D view when it was saved. */
  thumbnail: string
  camera: ViewCamera
  hiddenCategories: string[]
  selectedId: string | null
  isColorByStatus: boolean
}

export type ViewSnapshot = Omit<TwinView, 'id' | 'name' | 'createdAt'>

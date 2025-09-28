import React, { useEffect } from "react"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"

// global array to hold all colliders
export const colliders = []

const Model = React.forwardRef(function Model({
  path,
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, 0, 0],
  color,
}, ref) {
  const { scene } = useGLTF(path)

  useEffect(() => {
    if (color) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({ color })
        }
      })
    }

    // compute bounding box once model is loaded
    const bbox = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    bbox.getSize(size)
    bbox.getCenter(center)

    // build AABB from size + position
    const half = size.clone().multiplyScalar(scale / 2)
    const pos = new THREE.Vector3(...position)

    const aabb = {
      min: new THREE.Vector3(
        pos.x - half.x,
        pos.y - half.y,
        pos.z - half.z
      ),
      max: new THREE.Vector3(
        pos.x + half.x,
        pos.y + half.y,
        pos.z + half.z
      ),
    }

    colliders.push(aabb)
  }, [scene, color, position, scale])

  return (
    <primitive ref={ref} object={scene} scale={scale} position={position} rotation={rotation} />
  )
})

export default Model

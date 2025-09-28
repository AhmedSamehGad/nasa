// Game.jsx
import React, { useRef, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { PointerLockControls, Stars, Html } from "@react-three/drei"
import * as THREE from "three"
import "../css/Game.css"
import "../css/screen.css";
import Model from "../components/model"

function PlayerController({
  enabled = true,
  walls = [],
  speed = 3,
  runMultiplier = 1.9,
  chairCenter = [0.6, 0, -3],
  chairRadius = 1.2,
  screenPos,
  focusPos,
  setShowSitPrompt,
  setSitting,
  sitting,
  zoomed,
  setZoomed,
  setCameraLocked,
}) {
  const { camera } = useThree()
  const player = useRef({
    pos: new THREE.Vector3(0, 1.2, 5),
    vel: new THREE.Vector3(0, 0, 0),
    radius: 0.5,
    grounded: false,
  })

  const input = useRef({ forward: 0, right: 0, running: false, jump: false })
  const footstepSound = useRef(null)

  useEffect(() => {
    footstepSound.current = new Audio("/audios/")
    footstepSound.current.loop = true
    footstepSound.current.volume = 0.7

    const stopFootsteps = () => {
      if (footstepSound.current) {
        footstepSound.current.pause()
        footstepSound.current.currentTime = 0
      }
    }

    const playFootsteps = () => {
      if (!footstepSound.current) return
      if (sitting) {
        stopFootsteps()
        return
      }
      if (input.current.forward !== 0 || input.current.right !== 0) {
        if (footstepSound.current.paused) {
          footstepSound.current.play().catch(() => {})
        }
        footstepSound.current.playbackRate = input.current.running ? 1.6 : 1.0
        footstepSound.current.volume = input.current.running ? 1.0 : 0.7
      } else {
        stopFootsteps()
      }
    }

    const onKeyDown = (e) => {
      if (e.code === "KeyW") input.current.forward = 1
      if (e.code === "KeyS") input.current.forward = -1
      if (e.code === "KeyA") input.current.right = -1
      if (e.code === "KeyD") input.current.right = 1
      if (e.code === "ShiftLeft") input.current.running = true
      if (e.code === "Space") input.current.jump = true

      if (e.code === "KeyE") {
        const p = player.current
        const dist = p.pos.distanceTo(new THREE.Vector3(...chairCenter))
        if (dist < chairRadius && !sitting) {
          stopFootsteps()
          setSitting(true)
          p.pos.set(chairCenter[0], chairCenter[1] + 0.5, chairCenter[2])
          p.vel.set(0, 0, 0)
        }
      }
      if (e.code === "KeyN") {
        if (sitting) {
          stopFootsteps()
          setSitting(false)
          setZoomed(false)
          setCameraLocked(false)
          const p = player.current
          p.pos.set(chairCenter[0], chairCenter[1] + 0.5, chairCenter[2] - 1.2)
          p.vel.set(0, 0, 0)
        }
      }
      if (e.code === "KeyF") {
        if (sitting) {
          setZoomed((prev) => {
            const newZoom = !prev
            setCameraLocked(newZoom)
            return newZoom
          })
        }
      }

      playFootsteps()
    }

    const onKeyUp = (e) => {
      if (e.code === "KeyW" && input.current.forward === 1) input.current.forward = 0
      if (e.code === "KeyS" && input.current.forward === -1) input.current.forward = 0
      if (e.code === "KeyA" && input.current.right === -1) input.current.right = 0
      if (e.code === "KeyD" && input.current.right === 1) input.current.right = 0
      if (e.code === "ShiftLeft") input.current.running = false
      if (e.code === "Space") input.current.jump = false

      playFootsteps()
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [chairCenter, chairRadius, setSitting, sitting, setZoomed, setCameraLocked])

  function resolveCollisions(pos, radius) {
    for (let w of walls) {
      const closest = new THREE.Vector3(
        THREE.MathUtils.clamp(pos.x, w.min.x, w.max.x),
        THREE.MathUtils.clamp(pos.y, w.min.y, w.max.y),
        THREE.MathUtils.clamp(pos.z, w.min.z, w.max.z)
      )
      const delta = pos.clone().sub(closest)
      const dist = delta.length()
      if (dist < radius) {
        if (dist === 0) {
          pos.y = w.max.y + radius + 0.001
        } else {
          const push = delta.normalize().multiplyScalar(radius - dist + 0.001)
          pos.add(push)
        }
      }
    }
  }

  useFrame((_, delta) => {
    if (!enabled) return
    const p = player.current

    if (sitting) {
      if (footstepSound.current && !footstepSound.current.paused) {
        footstepSound.current.pause()
        footstepSound.current.currentTime = 0
      }
      p.pos.set(chairCenter[0], chairCenter[1] + 0.5, chairCenter[2])
      camera.position.lerp(new THREE.Vector3(p.pos.x, p.pos.y + 0.4, p.pos.z), 0.9)

      camera.fov = zoomed ? 12 : 75
      camera.updateProjectionMatrix()
      if (zoomed) {
        const focusTarget = new THREE.Vector3(...focusPos)
        camera.lookAt(focusTarget)
      }
      return
    }

    const GRAVITY = -9.8
    const jumpSpeed = 4.2
    p.vel.y += GRAVITY * delta

    const nextPos = p.pos.clone()
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    dir.y = 0
    dir.normalize()
    const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize()

    const moveSpeed = speed * (input.current.running ? runMultiplier : 1)
    const horizMove = new THREE.Vector3()
    horizMove.addScaledVector(dir, input.current.forward * moveSpeed * delta)
    horizMove.addScaledVector(right, input.current.right * moveSpeed * delta)

    nextPos.add(horizMove)
    nextPos.y += p.vel.y * delta

    if (nextPos.y <= p.radius + 0.001) {
      nextPos.y = p.radius
      p.vel.y = 0
      p.grounded = true
    } else {
      p.grounded = false
    }

    if (input.current.jump && p.grounded) {
      p.vel.y = jumpSpeed
      p.grounded = false
    }

    resolveCollisions(nextPos, p.radius)
    p.pos.copy(nextPos)
    camera.position.lerp(new THREE.Vector3(p.pos.x, p.pos.y + 0.2, p.pos.z), 0.9)

    const chairVec = new THREE.Vector3(...chairCenter)
    const distToChair = p.pos.distanceTo(chairVec)
    const shouldShow = distToChair < chairRadius && !sitting
    setShowSitPrompt((prev) => (prev === shouldShow ? prev : shouldShow))
  })

  return null
}

function Walls({ layout }) {
  return (
    <group>
      {layout.map((w, i) => (
        <mesh key={i} position={w.pos}>
          <boxGeometry args={w.size} />
          <meshStandardMaterial color="#555" />
        </mesh>
      ))}
    </group>
  )
}

export default function Game() {
  const navigate = useNavigate();
  // Add planetList and selectedPlanet state
  const [selectedPlanet, setSelectedPlanet] = useState(0);
  const planetList = [
    {
      name: "Earth",
      emoji: "🌍",
      desc: "The Blue Planet. Home base for humanity.",
    },
    {
      name: "Mars",
      emoji: "🔴",
      desc: "The Red Planet. Top destination for explorers.",
    },
    {
      name: "Jupiter",
      emoji: "🪐",
      desc: "Gas giant. Known for its massive storms.",
    },
    {
      name: "Pluto",
      emoji: "❄️",
      desc: "The dwarf planet. Cold and mysterious.",
    },
  ];
  const wallsLayout = [
    { pos: [0, 1, -20], size: [40, 2, 1] },
    { pos: [0, 1, 20], size: [40, 2, 1] },
    { pos: [-20, 1, 0], size: [1, 2, 40] },
    { pos: [20, 1, 0], size: [1, 2, 40] },
    { pos: [-10, 1, -5], size: [8, 2, 1] },
    { pos: [6, 1, -5], size: [12, 2, 1] },
    { pos: [0, 1, 8], size: [16, 2, 1] },
    { pos: [-10, 1, 15], size: [8, 2, 1] },
    { pos: [10, 1, 5], size: [1, 2, 10] },
  ]

  const chairCenter = [1.6, 0, -3]
  const chairRadius = 1.2
  const chairSize = [0.5, 0.5, 0.5]

  const screenPos = [1.5, 0, -4.2]
  const screenSize = [2, 1.2, 0.2]

  const focusPos = [1.4, 0.67, -5]

  const wallAABBs = [
    ...wallsLayout.map((w) => {
      const half = [w.size[0] / 2, w.size[1] / 2, w.size[2] / 2]
      return {
        min: new THREE.Vector3(w.pos[0] - half[0], w.pos[1] - half[1], w.pos[2] - half[2]),
        max: new THREE.Vector3(w.pos[0] + half[0], w.pos[1] + half[1], w.pos[2] + half[2]),
      }
    }),
    {
      min: new THREE.Vector3(chairCenter[0] - chairSize[0] / 2, chairCenter[1], chairCenter[2] - chairSize[2] / 2),
      max: new THREE.Vector3(chairCenter[0] + chairSize[0] / 2, chairCenter[1] + chairSize[1], chairCenter[2] + chairSize[2] / 2),
    },
    {
      min: new THREE.Vector3(screenPos[0] - screenSize[0] / 2, screenPos[1], screenPos[2] - screenSize[2] / 2),
      max: new THREE.Vector3(screenPos[0] + screenSize[0] / 2, screenPos[1] + screenSize[1], screenPos[2] + screenSize[2] / 2),
    },
  ]

  const [locked, setLocked] = useState(false)
  const [showSitPrompt, setShowSitPrompt] = useState(false)
  const [sitting, setSitting] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [cameraLocked, setCameraLocked] = useState(false)

  useEffect(() => {
    const onPointerLockChange = () => {
      setLocked(document.pointerLockElement === document.body)
    }
    document.addEventListener("pointerlockchange", onPointerLockChange)
    return () => document.removeEventListener("pointerlockchange", onPointerLockChange)
  }, [])

  return (
    <div className="game-root">
      <Canvas shadows camera={{ position: [0, 2, 10], fov: 75 }}>
        <color attach="background" args={["#000000"]} />
        <Stars radius={200} depth={50} count={2000} factor={4} saturation={0} fade />

        <ambientLight intensity={0.25} />
        <directionalLight position={[10, 20, 10]} intensity={1.0} castShadow />

        <Model path={"/models/seat.glb"} rotation={[0, 3.2, 0]} position={chairCenter} scale={0.7} />
        <Model path={"/models/screen.glb"} position={screenPos} scale={0.7} />

        {/* === Always Visible Virtual Screen with Search Bar === */}
<Html
          position={[screenPos[0] - 0.02, screenPos[1] + 0.77, screenPos[2] + 0.1]}
          transform
          distanceFactor={1.5}
          scale={[0.1255, 0.13, 0.1]}
        >
          <div className="space-screen">
            <div className="screen-header">
              <h2>🚀 Mission Console</h2>
              <input type="text" placeholder="Search planets..." />
              <select>
                <option>Earth</option>
                <option>Mars</option>
                <option>Jupiter</option>
                <option>Pluto</option>
              </select>
            </div>

            <div className="planet-cards">
              {planetList.map((planet, idx) => (
                <div
                  key={planet.name}
                  className={`planet-card${selectedPlanet === idx ? " selected" : ""}`}
                  data-slide={idx}
                  onClick={() => navigate(`/description?planet=${encodeURIComponent(planet.name)}`)}
                  style={{ cursor: "pointer" }}
                >
                  <h3>{planet.emoji} {planet.name}</h3>
                  <p>{planet.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Html>



        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="grey" />
        </mesh>

        <Walls layout={wallsLayout} />

        <PlayerController
          enabled={true}
          walls={wallAABBs}
          chairCenter={chairCenter}
          chairRadius={chairRadius}
          screenPos={screenPos}
          focusPos={focusPos}
          setShowSitPrompt={setShowSitPrompt}
          setSitting={setSitting}
          sitting={sitting}
          zoomed={zoomed}
          setZoomed={setZoomed}
          setCameraLocked={setCameraLocked}
        />

        {!cameraLocked && (
          <PointerLockControls
            selector="body"
            onLock={() => setLocked(true)}
            onUnlock={() => setLocked(false)}
          />
        )}
      </Canvas>

      <div className="ui-top-right">
        {!locked ? (
          <button
            className="ui-btn"
            onClick={() => {
              document.body.requestPointerLock()
            }}
          >
            Click to Play (Lock Pointer)
          </button>
        ) : (
          <div className="ui-row">
            <span className="hint">
              WASD: move • Shift: run • Space: jump • E: sit • N: stand • F: focus • Esc: unlock
            </span>
            <button
              className="ui-btn small"
              onClick={() => {
                document.exitPointerLock()
              }}
            >
              Unlock
            </button>
          </div>
        )}
      </div>

      {showSitPrompt && !sitting && (
        <div className="ui-center">
          <span className="hint">Press E to sit</span>
        </div>
      )}
      {sitting && (
        <div className="ui-center">
          <span className="hint">Press N to stand • Press F to focus</span>
        </div>
      )}
    </div>
  )
}
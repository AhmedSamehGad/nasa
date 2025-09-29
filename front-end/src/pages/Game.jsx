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
  // Sitting animation state
  const [sitAnim, setSitAnim] = useState(false);
  const sitAnimProgress = useRef(0);

  const input = useRef({ forward: 0, right: 0, running: false, jump: false })
  const footstepSound = useRef(null)


  // Screen power state (lifted up to Game)
  const { screenOn, setScreenOn, setScreenLoading } = arguments[0];

  useEffect(() => {
    footstepSound.current = new Audio("/audios/footsteps.mp3")
    footstepSound.current.loop = true
    footstepSound.current.volume = 1

    const stopFootsteps = () => {
      if (footstepSound.current && !footstepSound.current.paused) {
        footstepSound.current.pause();
        footstepSound.current.currentTime = 0;
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
      if (e.code === "Space") {
        input.current.jump = true
        if (sitting) {
          if (!screenOn) {
            setScreenLoading(true);
            setTimeout(() => {
              setScreenOn(true);
              setScreenLoading(false);
            }, 1200); // 1.2s power-on animation
          } else {
            setScreenOn(false);
          }
        }
      }

      if (e.code === "KeyE") {
        const p = player.current
        const dist = p.pos.distanceTo(new THREE.Vector3(...chairCenter))
        if (dist < chairRadius && !sitting) {
          stopFootsteps();
          setSitAnim(true);
        }
      }
      // Ctrl or N exits sitting, but NOT in focus (zoomed) mode
      if ((e.code === "ControlLeft" || e.code === "ControlRight") && sitting && !zoomed) {
        stopFootsteps();
        setSitting(false);
        setZoomed(false);
        setCameraLocked(false);
        const p = player.current;
        p.pos.set(chairCenter[0], chairCenter[1] + 0.5, chairCenter[2] - 1.2);
        p.vel.set(0, 0, 0);
      }
      if (e.code === "KeyN") {
        if (sitting && !zoomed) {
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
        if (sitting && !zoomed) {
          setZoomed(true);
          setCameraLocked(true);
          // Show mouse pointer and exit pointer lock
          if (document.exitPointerLock) document.exitPointerLock();
          document.body.style.cursor = "auto";
        } else if (sitting && zoomed) {
          setZoomed(false);
          setCameraLocked(false);
          // Optionally, re-request pointer lock if you want to return to look mode
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

    // Sitting animation logic
    if (sitAnim && !sitting) {
      // Animate player to chair with a small rotation
      sitAnimProgress.current += delta / 0.7; // 0.7s duration
      const t = Math.min(1, sitAnimProgress.current);
      // Interpolate position and rotation
      const start = p.pos.clone();
      const end = new THREE.Vector3(chairCenter[0], chairCenter[1] + 0.5, chairCenter[2]);
      // Lerp position
      p.pos.lerp(end, t);
      // Animate camera rotation (simulate a small left-right sway)
      const sway = Math.sin(t * Math.PI) * 0.18; // max 0.18 rad
      camera.rotation.y = sway;
      camera.position.lerp(new THREE.Vector3(p.pos.x, p.pos.y + 0.4, p.pos.z), 0.9);
      if (t >= 1) {
        setSitting(true);
        setSitAnim(false);
        sitAnimProgress.current = 0;
        camera.rotation.y = 0;
      }
      return;
    }

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
        // Always show mouse pointer in focus mode
        document.body.style.cursor = "auto";
        // Prevent pointer lock
        if (document.exitPointerLock) document.exitPointerLock();
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
    // If near the chair and not sitting, always stop footsteps
    if (shouldShow && !sitting) {
      if (footstepSound.current && !footstepSound.current.paused) {
        footstepSound.current.pause();
        footstepSound.current.currentTime = 0;
      }
    }
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


// List of all model, texture, and sound paths to preload
const MODEL_PATHS = [
  "/models/seat.glb",
  "/models/screen.glb",
  "/models/moon.glb",
];
const TEXTURE_PATHS = [
  // Add all texture files used in your scene here, e.g.:
  // "/imges/pluto.jpg",
  // "/imges/stars.jpg",
];
const SOUND_PATHS = [
  "/audios/wind.mp3",
  // Add more sound paths here if needed
];
function preloadTexture(url) {
  return new Promise((resolve) => {
    const loader = new (window.THREE?.TextureLoader || THREE.TextureLoader)();
    loader.load(url, resolve, undefined, () => resolve()); // always resolve
  });
}

function preloadGLTF(url) {
  return new Promise((resolve) => {
    // Always use the imported THREE and attach GLTFLoader if missing
    let Loader = (window.THREE && window.THREE.GLTFLoader) || THREE.GLTFLoader;
    if (!Loader) {
      // fallback: skip
      resolve();
      return;
    }
    const loader = new Loader();
    loader.load(url, resolve, undefined, () => resolve()); // always resolve
  });
}

function preloadAudio(url) {
  return new Promise((resolve, reject) => {
    const audio = new window.Audio();
    audio.src = url;
    audio.oncanplaythrough = () => resolve();
    audio.onerror = reject;
  });
}

export default function Game() {
  // Screen power state
  const [screenOn, setScreenOn] = useState(false);
  const [screenLoading, setScreenLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Always import GLTFLoader and attach to window.THREE
    import("three/examples/jsm/loaders/GLTFLoader").then(mod => {
      if (!window.THREE) window.THREE = {};
      window.THREE.GLTFLoader = mod.GLTFLoader;
      // Also attach to imported THREE for safety
      THREE.GLTFLoader = mod.GLTFLoader;
      startPreload();
    }).catch(() => startPreload());

    function startPreload() {
      const total = MODEL_PATHS.length + SOUND_PATHS.length;
      let done = 0;
      function tick() {
        done++;
        setProgress(Math.round((done / total) * 100));
      }
      Promise.all([
        ...MODEL_PATHS.map(p => preloadGLTF(p).then(tick)),
        ...TEXTURE_PATHS.map(p => preloadTexture(p).then(tick)),
        ...SOUND_PATHS.map(p => preloadAudio(p).then(tick)),
      ]).then(() => {
        setLoading(false);
      });
    }
  }, []);
  // Wind SFX background (robust for refresh)
  useEffect(() => {
    if (loading) return;
    let wind = new Audio("/audios/wind.mp3");
    wind.loop = true;
    wind.volume = 0.65;
    // Try to play immediately
    const tryPlay = () => {
      wind.currentTime = 0;
      wind.play().catch(() => {
        // If autoplay is blocked, play on first user gesture
        const resume = () => {
          wind.play().catch(() => {});
          window.removeEventListener("pointerdown", resume);
          window.removeEventListener("keydown", resume);
        };
        window.addEventListener("pointerdown", resume);
        window.addEventListener("keydown", resume);
      });
    };
    tryPlay();
    return () => {
      wind.pause();
      wind.currentTime = 0;
      wind = null;
    };
  }, [loading]);
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

  if (loading) {
    return (
      <div className="game-root" style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#111'}}>
        <div style={{textAlign:'center'}}>
          <div className="spinner" style={{marginBottom:24}}>
            <div style={{width:48,height:48,border:'6px solid #3498db',borderTop:'6px solid transparent',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto'}} />
          </div>
          <div style={{color:'#fff',fontSize:20,letterSpacing:1}}>Loading... {progress}%</div>
        </div>
        <style>{`@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div className="game-root">
      <Canvas shadows camera={{ position: [0, 2, 10], fov: 75 }}>
        <color attach="background" args={["#000000"]} />
        <Stars radius={200} depth={50} count={2000} factor={4} saturation={0} fade />

        <ambientLight intensity={0.25} />
        <directionalLight position={[10, 20, 10]} intensity={1.0} castShadow />

        <Model path={"/models/seat.glb"} rotation={[0, 3.2, 0]} position={chairCenter} scale={0.7} />
        <Model path={"/models/screen.glb"} position={screenPos} scale={0.7} />
        {/* Moon model in the night sky, shining */}
        <Model path={"/models/moon.glb"} position={[-8, 14, -30]} scale={2.2} />
        {/* Moon shine light */}
        <pointLight position={[-8, 15.5, -30]} intensity={4.5} color="#fffbe6" distance={30} decay={2} castShadow />

        {/* === Always Visible Virtual Screen with Search Bar === */}

        {/* Black HTML element behind the screen for solid coverage, always when screen is powered off */}
        
          <Html
            position={[screenPos[0] - 0.021, screenPos[1] + 0.77, screenPos[2] + 0.099]}
            transform
            distanceFactor={1.5}
            scale={[0.135, 0.14, 0.1]}
            zIndexRange={[0, 0]}
          >
            <div style={{
              width: '100%',
              height: '100%',
              background: '#000',
              borderRadius: '18px',
              boxShadow: '0 0 32px #000',
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 0,
              opacity: 1,
            }} />
          </Html>
        
        <Html
          position={[screenPos[0] - 0.02, screenPos[1] + 0.77, screenPos[2] + 0.1]}
          transform
          distanceFactor={1.5}
          scale={[0.1255, 0.13, 0.1]}
        >
          <div className={`space-screen${zoomed ? " focus-anim" : ""} ${!screenOn ? "screen-off" : ""}`}>
            {/* Power-on animation overlay */}
            {screenLoading && (
              <div className="screen-loading-overlay">
                <div className="screen-power-animation" />
                <div style={{color:'#fff',fontWeight:'bold',fontSize:18,marginTop:16}}>Powering On...</div>
              </div>
            )}
            {/* Screen content only if powered on */}
            {screenOn && !screenLoading && (
              <>
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
              </>
            )}
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
          screenOn={screenOn}
          setScreenOn={setScreenOn}
          setScreenLoading={setScreenLoading}
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
        {/* Prominent screen toggle hint when sitting */}
        {sitting && (
          <div style={{
            marginTop: 12,
            background: '#181c2b',
            color: '#fff',
            borderRadius: 8,
            padding: '8px 18px',
            fontWeight: 600,
            fontSize: 16,
            boxShadow: '0 2px 8px #0005',
            border: '2px solid #3498db',
            display: 'inline-block',
            marginLeft: 8,
          }}>
            {screenOn
              ? <>Press <b>Space</b> to turn screen off</>
              : <>Press <b>Space</b> to turn screen on</>
            }
          </div>
        )}
      </div>

      {/* Info icon and E button when near chair */}
      {showSitPrompt && !sitting && (
        <>
          <div className="ui-center">
            <span className="hint">
              <span style={{display:'inline-flex',alignItems:'center',gap:8}}>
                <span style={{display:'inline-block',width:22,height:22,borderRadius:'50%',background:'#3498db',color:'#fff',fontWeight:'bold',fontSize:16,justifyContent:'center',alignItems:'center',textAlign:'center',lineHeight:'22px'}}>i</span>
                <span style={{display:'inline-block',background:'#222',color:'#fff',borderRadius:4,padding:'2px 8px',fontWeight:'bold',marginLeft:4,boxShadow:'0 1px 3px #0003'}}>E</span>
                <span style={{marginLeft:8}}>Press E to sit</span>
              </span>
            </span>
          </div>
          {/* Bottom center message */}
          <div style={{position:'fixed',left:'50%',bottom:32,transform:'translateX(-50%)',zIndex:1000,background:'#222d',color:'#fff',borderRadius:8,padding:'10px 18px',fontSize:17,boxShadow:'0 2px 8px #0005',textAlign:'center'}}>
            Press <b>E</b> to interact
          </div>
        </>
      )}
      {/* Left bottom message when sitting */}
      {sitting && (
        <>
          <div className="ui-center">
            <span className="hint">Press N to stand • Press F to focus</span>
          </div>
          <div style={{position:'fixed',left:20,bottom:20,zIndex:1000,background:'#222d',color:'#fff',borderRadius:8,padding:'10px 18px',fontSize:17,boxShadow:'0 2px 8px #0005'}}>
            {zoomed ? (
              <>
                <div>Press <b>F</b> to exit focus</div>
                <div style={{marginTop:8}}>
                  {screenOn
                    ? <>Press <b>Space</b> to turn screen off</>
                    : <>Press <b>Space</b> to turn screen on</>
                  }
                </div>
              </>
            ) : (
              <>
                <div>Press <b>F</b> to focus on screen</div>
                <div>Press <b>Ctrl</b> to exit</div>
                <div style={{marginTop:8}}>
                  {screenOn
                    ? <>Press <b>Space</b> to turn screen off</>
                    : <>Press <b>Space</b> to turn screen on</>
                  }
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
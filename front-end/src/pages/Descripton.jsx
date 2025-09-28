import { useState, useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Stars, PointerLockControls } from "@react-three/drei"
import * as THREE from "three"
import { FaGamepad } from "react-icons/fa"
import "../css/Description.css"
import Model from "../components/model"

// Free movement controls with collision detection
function FreeControls({ objects }) {
  const { camera } = useThree()
  const keys = useRef({})
  const velocity = useRef(new THREE.Vector3())
  const raycaster = useRef(new THREE.Raycaster())

  useEffect(() => {
    const handleKeyDown = (e) => (keys.current[e.code] = true)
    const handleKeyUp = (e) => (keys.current[e.code] = false)

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  useFrame(() => {
    const speed = 0.1
    velocity.current.set(0, 0, 0)

    if (keys.current["KeyW"]) velocity.current.z -= speed
    if (keys.current["KeyS"]) velocity.current.z += speed
    if (keys.current["KeyA"]) velocity.current.x -= speed
    if (keys.current["KeyD"]) velocity.current.x += speed
    if (keys.current["Space"]) velocity.current.y += speed
    if (keys.current["ShiftLeft"]) velocity.current.y -= speed

    const move = velocity.current.clone().applyEuler(camera.rotation)

    if (move.length() > 0) {
      raycaster.current.set(camera.position, move.clone().normalize())
      const intersects = raycaster.current.intersectObjects(objects, true)

      if (intersects.length === 0 || intersects[0].distance > 1.5) {
        camera.position.add(move)
      }
    }
  })

  return <PointerLockControls />
}

// Scene component with toggle controls
function Scene({ children, ambient = 2, directional = 1, freeControl }) {
  const [objects, setObjects] = useState([])

  return (
    <Canvas camera={{ position: [6, 6, 7], fov: 50 }}>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
      <ambientLight intensity={ambient} />
      <directionalLight position={[10, 10, 10]} intensity={directional} />

      <group ref={(ref) => ref && setObjects(ref.children)}>{children}</group>

      {freeControl ? <FreeControls objects={objects} /> : <OrbitControls />}
    </Canvas>
  )
}

function DescriptionBox({ text }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={`object-description ${expanded ? "expanded" : ""}`}
      onClick={() => setExpanded(!expanded)}
    >
      {text}
    </div>
  )
}

function ImageBox({ src, caption }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={`image-box ${expanded ? "expanded" : ""}`}
      onClick={() => setExpanded(!expanded)}
    >
      <img src={src} alt={caption} />
      {expanded && <p className="image-caption">{caption}</p>}
    </div>
  )
}

function DescriptionCarousel() {
  const [freeControl, setFreeControl] = useState(false)
  const location = useLocation();
  const carouselRef = useRef(null);

  // Map planet names to slide indices
  const planetToIndex = {
    Vesta: 0,
    Pluto: 1,
    Earth: 2,
  };

  // Parse ?slide= or ?planet= from query string
  function getSlideFromQuery() {
    const params = new URLSearchParams(location.search);
    const planet = params.get("planet");
    if (planet && planetToIndex.hasOwnProperty(planet)) {
      return planetToIndex[planet];
    }
    const idx = parseInt(params.get("slide"), 10);
    return isNaN(idx) ? 0 : Math.max(0, Math.min(2, idx));
  }

  useEffect(() => {
    // On mount or location change, jump to the correct slide
    const idx = getSlideFromQuery();
    if (carouselRef.current) {
      // Bootstrap carousel API
      // eslint-disable-next-line no-undef
      if (window.bootstrap && window.bootstrap.Carousel) {
        const carousel = window.bootstrap.Carousel.getOrCreateInstance(carouselRef.current);
        carousel.to(idx);
      } else {
        // fallback: set active class manually
        const items = carouselRef.current.querySelectorAll('.carousel-item');
        items.forEach((el, i) => {
          el.classList.toggle('active', i === idx);
        });
      }
    }
  }, [location]);

  return (
    <div>
      {/* Jump buttons */}
      <div className="jump-buttons">
        <button className="btn btn-outline-light" onClick={() => window.location.search = '?slide=0'}>Go to Vesta</button>
        <button className="btn btn-outline-light" onClick={() => window.location.search = '?slide=1'}>Go to Pluto</button>
        <button className="btn btn-outline-light" onClick={() => window.location.search = '?slide=2'}>Go to Earth</button>
      </div>

      {/* Carousel */}
      <div id="carouselExample" className="carousel slide" data-bs-ride="false" ref={carouselRef}>
        {/* Control toggle button in top-right corner */}
        <button
          className="control-toggle top-right"
          onClick={() => setFreeControl(!freeControl)}
        >
          <FaGamepad size={24} />
        </button>

        <div className="carousel-inner">
          {/* Vesta */}
          <div className="carousel-item active">
            <div className="canvas-wrapper">
              <Scene ambient={3} directional={0.8} freeControl={freeControl}>
                <Model path="/models/vesta.glb" scale={0.001} />
              </Scene>
              <DescriptionBox text="Vesta is one of the largest asteroids in the asteroid belt." />
              <ImageBox src="/images/vesta.jpg" caption="Vesta Overview" />
            </div>
          </div>

          {/* Pluto */}
          <div className="carousel-item">
            <div className="canvas-wrapper">
              <Scene ambient={2.5} directional={0.5} freeControl={freeControl}>
                <Model path="/models/pluto.glb" scale={0.005} />
              </Scene>
              <DescriptionBox text="Pluto is a dwarf planet located in the Kuiper Belt." />
              <ImageBox src="/images/pluto.jpg" caption="Pluto Overview" />
            </div>
          </div>

          {/* Earth */}
          <div className="carousel-item">
            <div className="canvas-wrapper">
              <Scene ambient={1} directional={1.2} freeControl={freeControl}>
                <Model path="/models/earth.glb" scale={2} />
              </Scene>
              <DescriptionBox text="Earth is the only known planet that supports life." />
              <ImageBox src="/images/earth.jpg" caption="Earth Overview" />
            </div>
          </div>
        </div>

        {/* Carousel Controls */}
        <button
          className="carousel-control-prev"
          type="button"
          data-bs-target="#carouselExample"
          data-bs-slide="prev"
        >
          <span className="carousel-control-prev-icon" aria-hidden="true"></span>
          <span className="visually-hidden">Previous</span>
        </button>
        <button
          className="carousel-control-next"
          type="button"
          data-bs-target="#carouselExample"
          data-bs-slide="next"
        >
          <span className="carousel-control-next-icon" aria-hidden="true"></span>
          <span className="visually-hidden">Next</span>
        </button>
      </div>
    </div>
  )
}
export default DescriptionCarousel;

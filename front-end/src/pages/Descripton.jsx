import { useState, useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Stars, PointerLockControls } from "@react-three/drei"
import * as THREE from "three"
import { FaGamepad, FaCamera, FaFacebook, FaTwitter, FaInstagram } from "react-icons/fa"
import { FaSave } from "react-icons/fa"
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

// Responsive model scale hook
function useResponsiveScale(base, small, mobile) {
  const [scale, setScale] = useState(base);
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth <= 600) setScale(mobile);
      else if (window.innerWidth <= 900) setScale(small);
      else setScale(base);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [base, small, mobile]);
  return scale;
}


function DescriptionCarousel() {
  const [freeControl, setFreeControl] = useState(false)
  const [planetShot, setPlanetShot] = useState(null)
  const [showPlanetBanner, setShowPlanetBanner] = useState(false)
  const [animating, setAnimating] = useState(false)
  const location = useLocation();
  const carouselRef = useRef(null);
  const canvasRefs = [useRef(null), useRef(null), useRef(null)];

  // Map planet names to slide indices
  const planetToIndex = {
    Vesta: 0,
    Pluto: 1,
    Earth: 2,
  };

  // Responsive model scales
  const vestaScale = useResponsiveScale(0.001, 0.0007, 0.0005);
  const plutoScale = useResponsiveScale(0.005, 0.0035, 0.0025);
  const earthScale = useResponsiveScale(2, 1.3, 0.9);

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

  // Touch swipe for mobile (run only after ref is set and in browser)
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth > 600) return;
    const carousel = carouselRef.current;
    if (!carousel) return;
    let startX = null;
    function handleTouchStart(e) {
      if (e.touches.length === 1) startX = e.touches[0].clientX;
    }
    function handleTouchEnd(e) {
      if (startX === null) return;
      const endX = e.changedTouches[0].clientX;
      const dx = endX - startX;
      if (Math.abs(dx) > 40) {
        // Swipe left: next, right: prev
        const currentIdx = getSlideFromQuery();
        let nextIdx = currentIdx;
        if (dx < 0) nextIdx = Math.min(2, currentIdx + 1);
        else if (dx > 0) nextIdx = Math.max(0, currentIdx - 1);
        if (nextIdx !== currentIdx) {
          window.location.search = `?slide=${nextIdx}`;
        }
      }
      startX = null;
    }
    carousel.addEventListener('touchstart', handleTouchStart);
    carousel.addEventListener('touchend', handleTouchEnd);
    return () => {
      carousel.removeEventListener('touchstart', handleTouchStart);
      carousel.removeEventListener('touchend', handleTouchEnd);
    };
    // eslint-disable-next-line
  }, [carouselRef, location]);

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

  // Search bar state
  const [search, setSearch] = useState("");
  // Search handler: on Enter, go to planet if found
  function handleSearch(e) {
    e.preventDefault();
    const planet = search.trim().toLowerCase();
    if (planet === "vesta") window.location.search = '?slide=0';
    else if (planet === "pluto") window.location.search = '?slide=1';
    else if (planet === "earth") window.location.search = '?slide=2';
    // else do nothing or show not found (not implemented)
  }

  // Take a screenshot of the planet in the currently visible carousel slide
  async function handlePlanetShot() {
    let canvas = null;
    if (carouselRef.current) {
      // Always get the canvas from the active carousel-item
      const activeItem = carouselRef.current.querySelector('.carousel-item.active');
      if (activeItem) {
        canvas = activeItem.querySelector('canvas');
      }
    }
    // Last fallback: any canvas (should rarely happen)
    if (!canvas) canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('No canvas found for screenshot.');
      return;
    }
    // Wait for next animation frame to ensure render is complete
    await new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      const dataUrl = canvas.toDataURL('image/png');
      // Check for blank/empty image (dataUrl is a PNG header only)
      if (dataUrl.length < 200) {
        alert('Screenshot failed: blank image. Try again after the scene loads.');
        return;
      }
      setPlanetShot(dataUrl);
      setShowPlanetBanner(true);
      setAnimating(true);
      setTimeout(() => setAnimating(false), 600);
    } catch (e) {
      // CORS error: SecurityError: Failed to execute 'toDataURL' on 'HTMLCanvasElement'
      if (e instanceof DOMException && e.name === 'SecurityError') {
        alert('Screenshot failed due to CORS. Please ensure all models/textures are loaded from the same origin or with proper CORS headers.');
      } else {
        alert('Screenshot failed.');
      }
    }
  }

  // Save the planet shot image
  function savePlanetShot() {
    if (!planetShot) return;
    const params = new URLSearchParams(location.search);
    let planet = params.get("planet");
    let idx = getSlideFromQuery();
    if (!planet || !planetToIndex.hasOwnProperty(planet)) {
      // fallback to index name
      planet = Object.keys(planetToIndex).find(key => planetToIndex[key] === idx) || 'planet';
    }
    const link = document.createElement('a');
    link.href = planetShot;
    link.download = `${planet}-screenshot.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Social share handlers for planet shot
  function sharePlanetOn(platform) {
    if (!planetShot) return;
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent('Check out my planet snapshot!');
    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    } else if (platform === 'instagram') {
      alert('Instagram does not support direct web sharing. Save the image and upload manually.');
    }
  }
  return (
    <div>
      {/* Fixed search bar for desktop only */}
      <form className="planet-search-bar planet-search-bar-fixed" onSubmit={handleSearch} autoComplete="off">
        <input
          type="text"
          placeholder="Search planet..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search planet"
        />
      </form>

      {/* Carousel */}
      <div id="carouselExample" className="carousel slide" data-bs-ride="false" ref={carouselRef}>
        {/* Top-right corner icons container */}
        <div className="icons">
          <button
            className={`icon-btn${animating ? '' : ''}`}
            onClick={() => setFreeControl(!freeControl)}
            title="Toggle Free Control"
          >
            <FaGamepad size={24} />
          </button>
          <button
            className={`icon-btn${animating ? ' animating' : ''}`}
            onClick={handlePlanetShot}
            title="Take Planet Photo"
          >
            <FaCamera size={22} />
          </button>
        </div>

        {/* Planet photo banner */}
        {showPlanetBanner && planetShot && (
          <div className="planet-photo-banner">
            <div className="film-frame planet-film-frame">
              <img src={planetShot} alt="Planet Snapshot" className="screenshot-img" />
            </div>
            <div className="planet-socials">
              <button onClick={() => savePlanetShot()} title="Save Image"><FaSave size={22} /></button>
              <button onClick={() => sharePlanetOn('facebook')} title="Share on Facebook"><FaFacebook size={22} /></button>
              <button onClick={() => sharePlanetOn('twitter')} title="Share on Twitter"><FaTwitter size={22} /></button>
              <button onClick={() => sharePlanetOn('instagram')} title="Share on Instagram"><FaInstagram size={22} /></button>
              <button className="banner-close-btn-social" onClick={() => setShowPlanetBanner(false)} title="Close">×</button>
            </div>
          </div>
        )}

        <div className="carousel-inner">
          {/* Vesta */}
          <div className="carousel-item active" ref={canvasRefs[0]}>
            <div className="canvas-wrapper">
              {/* Inline search bar for mobile/tablet only */}
              <form className="planet-search-bar planet-search-bar-inline" onSubmit={handleSearch} autoComplete="off">
                <input
                  type="text"
                  placeholder="Search planet..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Search planet"
                />
              </form>
              <Scene ambient={3} directional={0.8} freeControl={freeControl}>
                <Model path="/models/vesta.glb" scale={vestaScale} />
              </Scene>
              <DescriptionBox text="Vesta is one of the largest asteroids in the asteroid belt." />
              <ImageBox src="/images/vesta.jpg" caption="Vesta Overview" />
            </div>
          </div>

          {/* Pluto */}
          <div className="carousel-item" ref={canvasRefs[1]}>
            <div className="canvas-wrapper">
              {/* Inline search bar for mobile/tablet only */}
              <form className="planet-search-bar planet-search-bar-inline" onSubmit={handleSearch} autoComplete="off">
                <input
                  type="text"
                    placeholder="Search planet..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Search planet"
                />
              </form>
              <Scene ambient={2.5} directional={0.5} freeControl={freeControl}>
                <Model path="/models/pluto.glb" scale={plutoScale} />
              </Scene>
              <DescriptionBox text="Pluto is a dwarf planet located in the Kuiper Belt." />
              <ImageBox src="/images/pluto.jpg" caption="Pluto Overview" />
            </div>
          </div>

          {/* Earth */}
          <div className="carousel-item" ref={canvasRefs[2]}>
            <div className="canvas-wrapper">
              {/* Inline search bar for mobile/tablet only */}
              <form className="planet-search-bar planet-search-bar-inline" onSubmit={handleSearch} autoComplete="off">
                <input
                  type="text"
                  placeholder="Search planet..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Search planet"
                />
              </form>
              <Scene ambient={1} directional={1.2} freeControl={freeControl}>
                <Model path="/models/earth_2.glb" scale={earthScale} />
              </Scene>
              <DescriptionBox text="Earth is the only known planet that supports life." />
              <ImageBox src="/images/earth.jpg" caption="Earth Overview" />
            </div>
          </div>
        </div>

        {/* Carousel Controls: always show, even on mobile */}
        <>
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
        </>
      </div>
    </div>
  )
}
export default DescriptionCarousel;
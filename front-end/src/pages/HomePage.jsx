import '../pages/../css/Home.css'

import NAV from './NAV'


export default function Home() {
  return (

   
    <div className="relative w-full h-screen">
<NAV />
      {/* الخلفية فيديو */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover -z-10"
      >
        <source src="/back.mp4" type="video/mp4" />
      </video>

      {/* المحتوى فوق الفيديو */}
      <div className="flex flex-col items-center justify-center h-screen space-y-4 text-center text-white z-10">
        <h1 className="text-5xl font-bold">Explore the Universe in 3D</h1>

        <p className="max-w-xl">
          Our platform makes it easy for you to discover space through interactive 3D models,
          immersive visuals, and simplified information. Learn, explore, and enjoy the wonders
          of the cosmos like never before.
        </p>
        <button className=" text-lg font-semibold text-white hover:bg-blue-600">
          start Exploring
        </button>
      </div>
    </div>
  )
}

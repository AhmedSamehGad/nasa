import {Link} from 'react-router-dom'
import {motion, scale} from 'framer-motion'



const contentVariant =  { 
  animate: { 
    transition: { 
      duration: 1, 
      staggerChildren: 0.5,     
    }, 
  }, 
};

const childVariants = { 
  initial: { opacity: 0, y: "100%", scale:.5 }, 
  animate: { opacity: 1, y: 0, transition: { duration: 1 }, scale:1, 
  transition:{type:"spring", stiffness:90,damping: 20} },
  
}; 

export default function Home() {
  return (
    <div>
      {/* hero */}
      <div className="relative min-h-screen px-2 sm:px-4 lg:px-2">

        {/* vidio background */}
        <video
          autoPlay
          loop
          muted
          playsInline
           className="absolute top-0 left-0 w-full h-full object-cover object-[80%_10%] z-0"
        >
          <source src="/videos/back.mp4" type="video/mp4" />
        </video>

        {/* content */}
        <motion.div className="relative flex flex-col items-center justify-center h-screen space-y-4 text-center text-white z-10
           max-w-[850px] m-auto" variants={contentVariant} initial="initial" animate="animate" transition={{delay:1}}
          >  
          <motion.h1 variants={childVariants} className="mt-32 text-[25px] sm:text-4xl md:text-6xl font-bold text-white/60">
            Explore the Universe in 3D
          </motion.h1>

          <motion.p className="text-white/50 text-[10px] sm:text-sm tracking-[2px] sm:tracking-widest" variants={childVariants}>
            Our platform makes it easy for you to discover space through interactive 3D models,
            immersive visuals, and simplified information. Learn, explore, and enjoy the wonders
            of the cosmos like never before.
          </motion.p>
          
         <motion.div  className='pt-4 w-[60%] sm:w-auto' variants={childVariants} transition={{delay:1}}>
           <Link to='/game' className="block w-full px-6 py-3 bg-[#C7E099] text-black/85 text-lg font-semibold rounded-xl ">
              Start Exploring
          </Link>
         </motion.div>


        </motion.div>
      </div>
    </div>
  )
}








      
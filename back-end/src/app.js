import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'

import authRouter from './routers/auth.routers.js'
import historyRouter from './routers/history.routes.js'


const app = express()
dotenv.config()


// who can call this back-end
const allowedOrigins = process.env.ORIGINS.split(',') || []
app.use(cors({
    origin: (origin, callBack) => {
        if(!origin || !allowedOrigins.includes(origin)) return callBack(null, true)
        else return callBack(new Error("Not allowed by CORS"))
    },
    methods:['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials:true
}))


app.use(express.json())
app.use(cookieParser())


const ConnectDB = async () => {
    try{
        mongoose.set('strictQuery', false)
        mongoose.connect(process.env.DB_URI)
        console.log("DB done")
    }
    catch(error){
        console.log(error.message)
        process.exit(1)
    }

}
ConnectDB()





app.get('/', (_,res) => {
    return res.status(200).json({message:"hello"})
})


app.use('/api', authRouter)
app.use('/api', historyRouter)



const POST = process.env.PORT
app.listen(POST, console.log("Server is running"))


// when deploy on vercel ✌️
// export default app


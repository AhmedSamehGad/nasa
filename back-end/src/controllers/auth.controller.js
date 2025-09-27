import Users from '../schema/user.schema.js'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import Transpoeter from '../utils/sendEmail.js'

dotenv.config()


export const register = async (req, res) => {
    try{
        // check if the user exists or not
        const isEmailFound = await Users.findOne({email:req.body.email})
        if(isEmailFound) return res.status(400).json({message:'this email is connicting with another account'})

        // 
        req.body.password = await bcrypt.hash(req.body.password, 10)
        const verifyCode = Math.floor(Math.random() * 900000 + 100000).toString()

        const newUser = await Users.create({...req.body, verifyCode:verifyCode})

        await Transpoeter.sendMail({
            from: process.env.EMAIL_FROM,
            to: req.body.email,
            subject:"Verify Your Account",
            html:`
                <h2>hello ${newUser.firstName},</h2>
                <p>thanks for registring in our website</p>
                <p>This's Your Verification Code: <span style="color:blue; font-size:22px">${verifyCode}</span> </p>
                <p>سينتهي خلال 10 دقائق.</p>
                <br/>
                <p>تحياتي,<br/>فريق الدعم</p>
            `
        })

        res.status(201).json({ message: "User registered, check your email" });
    }
    catch(error){
        console.log(error)
        return res.status(500).json({error:error.message})
    }
}



export const verifyEmail = async (req,res) => {
    try{
        const {code, email} = req.body
        if(!email || !code) return res.status(401).json({message:"code or email is required"})

        const user = await Users.findOne({email:email})
        if(!user) return res.status(404).json({message:"USER NOT FOUND"})
        if(!user.verifyCode) return res.status(400).json({message:"User is verified"})

        if(user.verifyCode != code) return res.status(401).json({message:"Invalid verification code"})
        if(user.verifyExpires < Date.now()) return res.status(401).json({message:"Code expired, register again"})

        const token = jwt.sign({_id:user._id, email:user.email}, process.env.JWT_SECRET)

        user.isVerified = true
        user.verifyCode = undefined
        user.verifyExpires = null
        user.tokens.unshift(token)
        await user.save()

        res.cookie("authRetro", token, {
            httpOnly:true,
            secure:process.env.NODE_ENV === "production",
            sameSite:"None",
            path:"/",
        })
    
        return res.status(200).json({ message: "Email verified successfully"});
    }
    catch(error){
        console.log(error)
        return res.status(500).json({error:error.message})
    }
}


// login
export const login = async (req,res) => {
    try{
        const user = await Users.findOne({email:req.body.email})
        if(!user) return res.status(404).json({message:"This email is not connected with any account"})

        const isCorrectPassword = bcrypt.compare(user.password, req.body.password)
        if(!isCorrectPassword) return res.status(401).json({message:"Incorrect Password"})

        
        const token = jwt.sign({_id:user._id, email:user.email}, process.env.JWT_SECRET)
        user.tokens.unshift(token)
        await user.save()

        res.cookie("authRetro",token, {
            httpOnly:true,
            secure:process.env.NODE_ENV ==="production",
            sameSite:"None",
            path:"/"
        })

        return res.status(200).json({ message: "successful login"});
    }
    catch(error){
        console.log(error)
        console.log(error)
        return res.status(500).json({error:error.message})
    }

}

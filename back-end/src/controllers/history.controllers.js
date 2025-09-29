import Users from "../schema/user.schema.js"

export const addUserHistory = async (req, res) => {
    try{
        const {userid} = req.params
        const user = await Users.findById(userid)
        if(!user) return res.status(404).json({message:"User not found"})

        if(!user.isVerified) return res.status(403).json({message:"Email not verified"})
    
        const {action} = req.body
        user.history.unshift({action})
        await user.save()
    
        res.status(201).json({message:"history added", history:user.history.slice(0,5)})
    }
    catch(error){
        res.status(500).json({ message: error.message });
    }
}



export const getUserHistory = async (req, res) => {
    try{
        const {userid} = req.params
        const user = await Users.findById(userid)
        if(!user) return res.status(404).json({message:"User not found"})

        if(!user.isVerified) return res.status(403).json({message:"Email not verified"})

        const history = user.history
        if(!history || history.length <= 0) return res.status(404).json({message:"No history Found"})
        
        res.status(200).json({history: history})
        
    }
    catch(error){
        res.status(500).json({ message: error.message });
    }
}
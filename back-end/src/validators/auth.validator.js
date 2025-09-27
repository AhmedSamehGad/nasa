import { body, validationResult } from "express-validator"


const registerSchecma = {
    firstName: body("firstName")
        .notEmpty().withMessage("username is rquired")
        .isString().withMessage("username must be string")
        .isLength({min:2}).withMessage("username mustn't be at least 2 characters"),

    lastName: body("lastName")
        .notEmpty().withMessage("lastName is rquired")
        .isString().withMessage("lastName must be string")
        .isLength({min:2}).withMessage("lastName mustn't be at least 2 characters"),
        
    email: body("email")
        .notEmpty().withMessage("email is rquired")
        .isEmail().withMessage("Invalid email")
        .isString().withMessage("email must be string"),
        
    password: body("password")
        .notEmpty().withMessage("password is rquired")
        .isString().withMessage("password must be string")
        .isStrongPassword({minLength: 8,minLowercase: 1,minUppercase:0, minNumbers: 1,minSymbols: 1})
        .withMessage("Password must be at least 8 chars, include 1 lowercase, 1 number, 1 symbol"),
}

const loginSchecma = {
    email: body("email")
        .notEmpty().withMessage("email is rquired")
        .isEmail().withMessage("Invalid email"),
        
    password: body("password")
        .notEmpty().withMessage("password is rquired")
        .isString().withMessage("password must be string")
        .isLength({min:6}).withMessage("Password must be at least 8 chars, include 1 lowercase, 1 number, 1 symbol"),
}


// check data using schema
const validator = (checkSchema) => {
    const validatorArrays = Object.values(checkSchema)
    
    return async (req,res,next) => {
        await Promise.all(validatorArrays.map(v => v.run(req)))
        const errors = validationResult(req).array({onlyFirstError:true}) || []

        if(errors.length) {
            let errorsOBJ = {}
            errors.forEach( error => errorsOBJ[error.path] = error.msg)
            return res.status(400).json({validators: errorsOBJ})
        }
        next()
    } 

}

// create middleware
export const registerValidator = validator(registerSchecma)
export const loginValidator = validator(loginSchecma)









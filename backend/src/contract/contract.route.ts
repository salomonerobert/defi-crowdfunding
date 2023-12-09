import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

router.post('/fundingOutcome',(req:Request,res:Response,next:NextFunction)=>{
    // update mongo about the status of the contract
    console.log('this is the funding outcome');
})

router.post('/votingOutcome',(req:Request,res:Response,next:NextFunction)=>{
    // update mongo about the status of the contract
    console.log('this is the voting outcome');
})

router.post('/votingRequest',(req:Request,res:Response,next:NextFunction)=>{
    // update mongo about the status of the contract
    console.log('this is the request for voting')
})


export const contract=router;
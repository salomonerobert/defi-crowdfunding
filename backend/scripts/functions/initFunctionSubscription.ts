import { SubscriptionManager } from "@chainlink/functions-toolkit";
import {utils} from 'ethers5';
import { signer, wallet,  provider } from "./connections";
import { networks } from "./network";

const functionsRouterAddress = networks.ethereumSepolia.functionsRouter;
const linkTokenAddress = networks.ethereumSepolia.linkToken;

// const consumerAddress = "0x01568F134A64b8c525E468908a3850B6c6A55F54";

export const initFunctionSubscription=async(contractAddress:string,linkAmount:string)=>{
    const subscriptionManager=new SubscriptionManager({
        signer,
        linkTokenAddress,
        functionsRouterAddress,
    });
    await subscriptionManager.initialize();

    const subscriptionId=await subscriptionManager.createSubscription();

    const receipt=await subscriptionManager.addConsumer({
        subscriptionId,
        consumerAddress:contractAddress,
    });

    const juelsAmount = utils.parseUnits(linkAmount,18).toString();
    subscriptionManager.fundSubscription({
        subscriptionId,
        juelsAmount
    });
}
import {config}from 'dotenv';
config();
import {providers, Wallet} from 'ethers5';

export const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
export const wallet = new Wallet(process.env.PRIVATE_KEY || "UNSET");
export const signer = wallet.connect(provider);

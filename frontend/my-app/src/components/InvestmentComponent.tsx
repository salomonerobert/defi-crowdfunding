import React, { useState } from "react";
import { ethers } from "ethers";
import { deFiCrowdFundingContractABI, genericERC20ABI } from "../constants";

const InvestmentComponent = () => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const usdcTokenAddress = "0x6f14C02Fc1F78322cFd7d707aB90f18baD3B54f5";

  // Connect to Metamask
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setProvider(provider);
        setUserAddress(accounts[0]);
      } catch (error) {
        console.error(error);
      }
    } else {
      alert("Metamask is not installed");
    }
  };

  // Transfer USDC (simplified example)
  const transferUSDC = async (
    amount: string,
    deFiCrowdFundingContractAddress: string
  ) => {
    if (!provider || !userAddress) {
      alert("Please connect your wallet first");
      return;
    }

    const signer = await provider.getSigner();
    const deFiCrowdFundingContract = new ethers.Contract(
      deFiCrowdFundingContractAddress,
      deFiCrowdFundingContractABI,
      signer
    );

    const usdcTokenContract = new ethers.Contract(
      usdcTokenAddress,
      genericERC20ABI,
      signer
    );
    console.log(`approving transaction for USDC ${ethers.parseUnits(amount, 18)}`)
    const approveTx = await usdcTokenContract.approve(
      deFiCrowdFundingContractAddress,
      ethers.parseUnits(amount, 18)
    );
    await approveTx.wait();

    const allowance = await usdcTokenContract.allowance(userAddress, deFiCrowdFundingContractAddress);
    console.log("Allowance: ", ethers.formatUnits(allowance, 18));


    try {
      const tx = await deFiCrowdFundingContract.invest(ethers.parseUnits(amount, 18));
      await tx.wait();
      alert(`Successfully transferred ${amount} USDC`);
    } catch (error) {
      console.error(error);
    }
  };

  // Render Component
  return (
    <div>
      <button onClick={connectWallet}>Connect Wallet</button>
      <button
        disabled={!userAddress}
        onClick={() =>
          transferUSDC("10", "0x26291e64E41e02c5fb2c7c3eefDF36b3d0fA3BdF")
        }
      >
        Invest 10 USDC
      </button>
      {/* Additional UI for displaying milestones, voting results, etc. */}
    </div>
  );
};

export default InvestmentComponent;

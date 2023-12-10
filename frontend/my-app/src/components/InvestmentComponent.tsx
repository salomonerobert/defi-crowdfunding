import React, { SetStateAction, useState } from "react";
import { ethers } from "ethers";
import { deFiCrowdFundingContractABI, genericERC20ABI } from "../constants";
import { ProgressMessage } from "pages/ProjectBackerPage";

interface InvestmentComponentProps {
  provider: ethers.BrowserProvider;
  userAddress: string | undefined;
  projectContractAddress: string | undefined;
  setProgressMessages: React.Dispatch<SetStateAction<ProgressMessage[]>>
}

const InvestmentComponent = ({
  provider,
  userAddress,
  projectContractAddress,
  setProgressMessages
}: InvestmentComponentProps) => {
  const usdcTokenAddress = "0x6f14C02Fc1F78322cFd7d707aB90f18baD3B54f5";
  const [investmentAmount, setInvestmentAmount] = useState<string | undefined>("")

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
    setProgressMessages(prev => [...prev, { message: `Approving transaction for USDC ${amount}`, type: 'info' }])
    const approveTx = await usdcTokenContract
      .approve(deFiCrowdFundingContractAddress, ethers.parseUnits(amount, 18))
      .catch((err) => console.error(err));
    await approveTx.wait();

    setProgressMessages(prev => [...prev, { message: `Sending transaction to the blockchain`, type: 'info' }])
    try {
      const txResponse: ethers.TransactionResponse =
        await deFiCrowdFundingContract.invest(ethers.parseUnits(amount, 18));
      await txResponse.wait();
      setProgressMessages(prev => [...prev, { message: `Successfully transferred ${amount} USDC. Transaction hash: ${txResponse.hash}`, type: 'success' }])
    } catch (error) {
      setProgressMessages(prev => [...prev, { message: `Error occurred while transferring ${amount} USDC. ${error.message}`, type: 'danger' }])
      console.error(error);
    }
  };

  function handleFundProject(e) {
    e.preventDefault()
    transferUSDC(investmentAmount, projectContractAddress).finally(() => setInvestmentAmount(""));
  }

  // Render Component
  return (
    <div className="text-center mt-3">
      <form className="mb-3" onSubmit={handleFundProject}>
        <div className="mb-3">
          <label htmlFor="investmentAmount" className="form-label">
            Investing Amount in USDC
          </label>
          <input type="number" id="investmentAmount" value={investmentAmount} onChange={(e) => setInvestmentAmount(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary">
          Submit
        </button>
      </form>
    </div>
  );
};

export default InvestmentComponent;

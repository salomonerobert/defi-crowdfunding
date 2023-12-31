import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ethers } from 'ethers';
import { IoCheckmarkDoneCircle } from 'react-icons/io5';
import { TbAlertSquareRoundedFilled } from 'react-icons/tb';
import { Project } from '../../../../backend/src/schemas/project.schema';
import { deFiCrowdFundingContractABI, genericERC20ABI, linkTokenAddress } from '../constants';

interface LifecycleEvent {
  status: string;
  description: string;
  callToActionText?: string;
  callToActionFunction?: () => void;
}

interface BlockchainProjectData {
  totalInvestment: number;
  isVotingOpen: boolean;
  currentVotingSession: number;
  projectTeamWithdrawalPool: number;
  isInitialDisbursementToProjectTeamComplete: boolean;
  isLinkFunded: boolean;
  minimumReached: boolean;
  isSuccessfulFundraiseNotificationSent: boolean;
  startDate: string;
  endDate: string;
}

interface ContractWorkflowStatusLogs {
  eventDescription: string;
  eventClass: 'info' | 'danger' | 'success';
  logMessage: string;
}

interface ContractWorkflowComponentProps {
  userAddress: string | undefined;
  project: Project;
}

function updateLifecycleStatusBasedOnBlockchainData(
  lifecycleEvents: LifecycleEvent[],
  blockchainProjectData: BlockchainProjectData,
  project: Project
) {
  const newLifecycleEvents = [...lifecycleEvents];
  if (blockchainProjectData.isLinkFunded) {
    newLifecycleEvents[1].status = 'completed';
  }
  if (blockchainProjectData.minimumReached) {
    newLifecycleEvents[3].status = 'completed';
    newLifecycleEvents[5].status = 'in_progress';
  }
  if (blockchainProjectData.isInitialDisbursementToProjectTeamComplete) {
    newLifecycleEvents[2].status = 'completed';
  }
  if (blockchainProjectData.projectTeamWithdrawalPool > 0 && blockchainProjectData.currentVotingSession === 0) {
    newLifecycleEvents[4].status = 'in_progress';
  } else if (blockchainProjectData.isInitialDisbursementToProjectTeamComplete) {
    newLifecycleEvents[4].status = 'completed';
  }
  if (blockchainProjectData.isVotingOpen) {
    newLifecycleEvents[5].status = 'completed';
    newLifecycleEvents[6].status = 'in_progress';
  } else if (blockchainProjectData.totalInvestment === 0) {
    newLifecycleEvents[5].status = 'completed';
  }
  if (!blockchainProjectData.isVotingOpen && blockchainProjectData.currentVotingSession > 0 && blockchainProjectData.totalInvestment === 0) {
    newLifecycleEvents[6].status = 'completed';
    newLifecycleEvents[7].status = 'in_progress';
  } else if (!blockchainProjectData.isVotingOpen && blockchainProjectData.currentVotingSession > 0) {
    newLifecycleEvents[5].status = 'in_progress';
    newLifecycleEvents[6].status = 'in_progress';
  }
  if (
    blockchainProjectData.currentVotingSession > 0 &&
    blockchainProjectData.totalInvestment === 0 &&
    blockchainProjectData.projectTeamWithdrawalPool === 0
  ) {
    newLifecycleEvents[7].status = 'completed';
    newLifecycleEvents[8].status = 'completed';
  }

  return newLifecycleEvents;
}

const ContractWorkflow = ({ project, userAddress }: ContractWorkflowComponentProps) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const defaultLifecycleEvents: LifecycleEvent[] = [
    {
      status: 'completed',
      description: 'Contract Creation',
    },
    {
      status: 'in_progress',
      description: 'Fund LINK',
      callToActionText: 'Fund 2 LINK',
      callToActionFunction: () => transferLINK('2', project.contractAddress),
    },
    {
      status: 'in_progress',
      description: 'Enable Automation',
      callToActionText: 'Enable Automation',
      callToActionFunction: () => registerAutomation(project.contractAddress),
    },
    {
      status: 'in_progress',
      description: 'Fund Raising',
    },
    {
      status: 'future_event',
      description: 'Withdraw Initial Funds',
      callToActionText: 'Withdraw',
      callToActionFunction: () => projectTeamWithdrawFunds(project.contractAddress, true),
    },
    {
      status: 'future_event',
      description: 'Milestone Update',
      callToActionText: 'Publish milestone',
      callToActionFunction: () => publishMilestone(project.contractAddress),
    },
    {
      status: 'future_event',
      description: 'Voting',
    },
    {
      status: 'future_event',
      description: 'Withdraw Final Funds',
      callToActionText: 'Withdraw Final',
      callToActionFunction: () => projectTeamWithdrawFunds(project.contractAddress, false),
    },
    {
      status: 'future_event',
      description: 'Project Delivered',
    },
  ];
  const [blockchainProjectData, setBlockchainProjectData] = useState<BlockchainProjectData>({
    totalInvestment: 0,
    isVotingOpen: false,
    currentVotingSession: 0,
    projectTeamWithdrawalPool: 0,
    isInitialDisbursementToProjectTeamComplete: false,
    isLinkFunded: false,
    minimumReached: false,
    isSuccessfulFundraiseNotificationSent: false,
    startDate: '',
    endDate: '',
  });

  const [lifecycleEvents, setLifecycleEvents] = useState<LifecycleEvent[]>(defaultLifecycleEvents);
  const [statusLog, setStatusLog] = useState<ContractWorkflowStatusLogs | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [projectTeamWithdrawalAmount, setProjectTeamWithdrawalAmount] = useState<number>(0);

  useEffect(() => {
    fetchUpdatedBlockChainVariables();
  }, [project.contractAddress]);

  useEffect(() => {
    if (blockchainProjectData) {
      console.log(blockchainProjectData, blockchainProjectData.projectTeamWithdrawalPool);
      setLifecycleEvents([
        ...updateLifecycleStatusBasedOnBlockchainData(lifecycleEvents, blockchainProjectData, project),
      ]);
    }
  }, [blockchainProjectData]);

  function fetchUpdatedBlockChainVariables() {
    getContractVariables(project.contractAddress, deFiCrowdFundingContractABI)
      .then((data) => {
        setBlockchainProjectData(data);
        setProjectTeamWithdrawalAmount(data.projectTeamWithdrawalPool);
        console.log(data, 'from fetch');
      })
      .catch((error) => {
        console.error('Error fetching blockchain data:', error);
        // Handle the error appropriately
      });
  }

  const getContractVariables = async (contractAddress, abi) => {
    if (!window.ethereum) {
      throw new Error('MetaMask is not available');
    }

    const contract = new ethers.Contract(contractAddress, abi, provider);

    try {
      const totalInvestment = await contract.investmentPool();
      const isVotingOpen = await contract['isVotingOpen']();
      const currentVotingSession = await contract['currentVotingSession']();
      const projectTeamWithdrawalPool = await contract['projectTeamWithdrawalPool']();
      const isInitialDisbursementToProjectTeamComplete = await contract['isInitialDisbursementToProjectTeamComplete']();
      const isLinkFunded = await contract['isLinkFunded']();
      const minimumReached = await contract['minimumReached']();
      const isSuccessfulFundraiseNotificationSent = await contract['isSuccessfulFundraiseNotificationSent']();
      const startDate = await contract['startDate']();
      const endDate = await contract['endDate']();

      return {
        totalInvestment: Number(ethers.formatUnits(totalInvestment, 18)),
        isVotingOpen,
        currentVotingSession: Number(ethers.formatUnits(currentVotingSession, 18)),
        projectTeamWithdrawalPool: Number(ethers.formatUnits(projectTeamWithdrawalPool, 18)),
        isInitialDisbursementToProjectTeamComplete,
        isLinkFunded,
        minimumReached,
        isSuccessfulFundraiseNotificationSent,
        startDate,
        endDate,
      };
    } catch (error) {
      console.error(`Error fetching variables: `, error);
      throw error;
    }
  };

  const transferLINK = async (amount: string, deFiCrowdFundingContractAddress: string) => {
    if (!provider || !userAddress) {
      alert('Please connect your wallet first');
      return;
    }

    setStatusLog(undefined);
    setIsLoading(true);
    const signer = await provider.getSigner();
    const deFiCrowdFundingContract = new ethers.Contract(
      deFiCrowdFundingContractAddress,
      deFiCrowdFundingContractABI,
      signer
    );

    const linkTokenContract = new ethers.Contract(linkTokenAddress, genericERC20ABI, signer);
    setStatusLog({
      eventDescription: 'Fund LINK',
      eventClass: 'info',
      logMessage: `Approving transaction for LINK ${amount}`,
    });
    const approveTx = await linkTokenContract
      .approve(deFiCrowdFundingContractAddress, ethers.parseUnits(amount, 18))
      .catch((err) => {
        setIsLoading(false);
        console.error(err);
      });
    await approveTx.wait();

    setStatusLog({
      eventDescription: 'Fund LINK',
      eventClass: 'info',
      logMessage: `Sending transaction to the blockchain`,
    });

    try {
      const txResponse: ethers.TransactionResponse = await deFiCrowdFundingContract.fundLink(
        ethers.parseUnits(amount, 18)
      );
      await txResponse.wait();
      setStatusLog({
        eventDescription: 'Fund LINK',
        eventClass: 'success',
        logMessage: `Successfully transferred ${amount} LINK. Transaction hash: ${txResponse.hash}`,
      });
      setIsLoading(false);
      fetchUpdatedBlockChainVariables();
    } catch (error) {
      setStatusLog({
        eventDescription: 'Fund LINK',
        eventClass: 'danger',
        logMessage: `Error occurred while transferring ${amount} LINK. ${error.message}`,
      });
      setIsLoading(false);
      console.error(error);
    }
  };

  const registerAutomation = async (contractAddress: string) => {
    if (!window.ethereum) {
      alert('Please install MetaMask to interact with the contract.');
      return;
    }
    setStatusLog(undefined);
    setIsLoading(true);

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, deFiCrowdFundingContractABI, signer);

      setStatusLog({
        eventDescription: 'Enable Automation',
        eventClass: 'info',
        logMessage: `Sending request to enable automation.`,
      });

      const txResponse = await contract.registerAndPredictID(
        project.name,
        500000,
        ethers.parseUnits('1.0', 'ether'),
        userAddress
      );
      await txResponse.wait();
      setStatusLog({
        eventDescription: 'Enable Automation',
        eventClass: 'success',
        logMessage: `Successfully enabled automation, you should be able to access your funds once funding is complete.`,
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error enabling automation:', error);
      setStatusLog({
        eventDescription: 'Enable Automation',
        eventClass: 'danger',
        logMessage: `Error occurred while enabling automation: ${error}`,
      });
      setIsLoading(false);
    }
  };

  const publishMilestone = async (contractAddress: string) => {
    if (!window.ethereum) {
      alert('Please install MetaMask to interact with the contract.');
      return;
    }
    setStatusLog(undefined);
    setIsLoading(true);

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, deFiCrowdFundingContractABI, signer);

      setStatusLog({
        eventDescription: 'Milestone Update',
        eventClass: 'info',
        logMessage: `Sending request to update milestone.`,
      });

      const txResponse = await contract.projectTeamMilestoneUpdate();
      await txResponse.wait();
      setStatusLog({
        eventDescription: 'Milestone Update',
        eventClass: 'success',
        logMessage: `Successfully updated milestone, voting is now open.`,
      });
      setIsLoading(false);
      fetchUpdatedBlockChainVariables();
    } catch (error) {
      console.error('Error occurred during milestone update:', error);
      setStatusLog({
        eventDescription: 'Milestone Update',
        eventClass: 'danger',
        logMessage: `Error occurred during milestone update: ${error}`,
      });
      setIsLoading(false);
    }
  };

  const projectTeamWithdrawFunds = async (contractAddress: string, initial: boolean) => {
    const eventDescription = initial ? 'Withdraw Initial Funds' : 'Withdraw Final Funds';
    console.log('withdraw')
    if (!window.ethereum) {
      alert('Please install MetaMask to interact with the contract.');
      return;
    }
    setStatusLog(undefined);
    setIsLoading(true);

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, deFiCrowdFundingContractABI, signer);

      const projectTeamWithdrawalPool = await contract['projectTeamWithdrawalPool']();

      setStatusLog({
        eventDescription,
        eventClass: 'info',
        logMessage: `Sending request to withdraw funds: USDC ${projectTeamWithdrawalPool.toString()}`,
      });

      console.log(`withdrawing: ${projectTeamWithdrawalPool.toString()}`)

      const txResponse = await contract.withdrawFromProjectTeamWithdrawalPool(projectTeamWithdrawalPool);
      await txResponse.wait();
      setStatusLog({
        eventDescription,
        eventClass: 'success',
        logMessage: `Successfully withdrew funds. You can now access the funds from your wallet.`,
      });
      setIsLoading(false);
      fetchUpdatedBlockChainVariables();
    } catch (error) {
      console.error('Error occurred during fund withdrawal:', error);
      setStatusLog({
        eventDescription,
        eventClass: 'danger',
        logMessage: `Error occurred during fund withdrawal: ${error}`,
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="container p-3">
      <div className="mb-3">
        <h3>{project.name}</h3>
        <p>
          <strong>Contract Address:</strong>{' '}
          <a
            target="_blank"
            rel="noreferrer noopener"
            href={`https://sepolia.etherscan.io/address/${project.contractAddress}`}>
            {project.contractAddress}
          </a>
        </p>
        <p>
          <strong>Total Investment:</strong> {blockchainProjectData.totalInvestment}
        </p>
        <p>
          <strong>Minimum Funding Required:</strong> {project.minInvestment}
        </p>
      </div>

      <div className="row">
        {lifecycleEvents.map((event, index) => (
          <>
            <div
              key={index}
              className="col-12 mb-2 align-items-center"
              style={{
                height: '60px',
                backgroundColor: getEventBackgroundColor(event.status),
                opacity: getEventOpacity(event.status),
              }}>
              <div className="row mt-3" style={event.status === 'future_event' ? { opacity: 0.5 } : { opacity: 1.0 }}>
                <div className="col-2 d-flex justify-content-center">
                  {event.status === 'completed' ? (
                    <IoCheckmarkDoneCircle size={25} color="green" />
                  ) : (
                    <TbAlertSquareRoundedFilled
                      size={25}
                      color={event.status === 'future_event' ? 'black' : 'orange'}
                    />
                  )}
                </div>
                <div className="col-6">{event.description}</div>
                <div className="col-4">
                  {event.callToActionText ? (
                    <button
                      className="btn btn-primary"
                      onClick={event.callToActionFunction}
                      disabled={!event?.callToActionText || event.status !== 'in_progress'}>
                      {event.callToActionText}
                    </button>
                  ) : (
                    ''
                  )}
                </div>
              </div>
            </div>
            {statusLog && statusLog.eventDescription === event.description && (
              <div className={`alert alert-${statusLog.eventClass} d-flex justify-content-between align-items-center overflow-auto`}>
                <span>{statusLog.logMessage}</span>
                {isLoading && (
                  <div className={`spinner-border text-black role="status"`}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                )}
              </div>
            )}
          </>
        ))}
      </div>
    </div>
  );
};

const getEventBackgroundColor = (status) => {
  switch (status) {
    case 'completed':
      return '#00C851';
    case 'in_progress':
      return 'lightyellow';
    default:
      return 'lightgrey';
  }
};

const getEventOpacity = (status) => (status === 'future' ? 0.1 : 1);

export default ContractWorkflow;

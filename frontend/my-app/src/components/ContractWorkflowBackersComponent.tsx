import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ethers } from 'ethers';
import { IoCheckmarkDoneCircle } from 'react-icons/io5';
import { TbAlertSquareRoundedFilled } from 'react-icons/tb';
import { Project } from '../../../../backend/src/schemas/project.schema';
import { deFiCrowdFundingContractABI } from '../constants';

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

interface ContractWorkflowBackersStatusLogs {
  eventDescription: string;
  eventClass: 'info' | 'danger' | 'success';
  logMessage: string;
}

interface ContractWorkflowBackersComponentProps {
  userAddress: string | undefined;
  project: Project;
}

function updateLifecycleStatusBasedOnBlockchainData(
  lifecycleEvents: LifecycleEvent[],
  blockchainProjectData: BlockchainProjectData,
  project: Project
) {
  const newLifecycleEvents = [...lifecycleEvents];
  if (blockchainProjectData.minimumReached) {
    newLifecycleEvents[1].status = 'completed';
    newLifecycleEvents[2].status = 'in_progress';
  }
  if (blockchainProjectData.isInitialDisbursementToProjectTeamComplete) {
    newLifecycleEvents[2].status = 'completed';
    newLifecycleEvents[3].status = 'in_progress';
  }
  if (blockchainProjectData.isVotingOpen) {
    newLifecycleEvents[3].status = 'completed';
    newLifecycleEvents[4].status = 'in_progress';
  } 
  if (!blockchainProjectData.isVotingOpen && blockchainProjectData.currentVotingSession > 0) {
    newLifecycleEvents[4].status = 'completed';
    newLifecycleEvents[6].status = 'in_progress';
  }
  if (blockchainProjectData.currentVotingSession > 0 && blockchainProjectData.totalInvestment === 0) {
    newLifecycleEvents[6].status = 'completed';
    newLifecycleEvents[3].status = 'completed';
  }
  if (!blockchainProjectData.minimumReached && new Date() >= project.endDate) {
    newLifecycleEvents[5].status = 'in_progress';
  }

  return newLifecycleEvents;
}

const ContractWorkflowBackers = ({ project, userAddress }: ContractWorkflowBackersComponentProps) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const defaultLifecycleEvents: LifecycleEvent[] = [
    {
      status: 'completed',
      description: 'Invest in project',
    },
    {
      status: 'in_progress',
      description: 'Raising Funds',
    },
    {
      status: 'future_event',
      description: 'Project Started - initial funds sent to Project Team',
    },
    {
      status: 'future_event',
      description: 'Milestone Update by Project Team',
    },
    {
      status: 'future_event',
      description: 'Voting In Progress',
      callToActionText: 'Vote Now',
      //   callToActionFunction: () => projectTeamWithdrawFunds(project.contractAddress, true, "2"),
    },
    {
      status: 'future_event',
      description: 'Refund Initiated',
      callToActionText: 'Claim refund',
      //   callToActionFunction: () => publishMilestone(project.contractAddress),
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
  const [statusLog, setStatusLog] = useState<ContractWorkflowBackersStatusLogs | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchUpdatedBlockChainVariables();
  }, [project.contractAddress]);

  useEffect(() => {
    if (blockchainProjectData) {
      setLifecycleEvents([
        ...updateLifecycleStatusBasedOnBlockchainData(lifecycleEvents, blockchainProjectData, project),
      ]);
    }
  }, [blockchainProjectData]);

  function fetchUpdatedBlockChainVariables() {
    getContractVariables(project.contractAddress, deFiCrowdFundingContractABI)
      .then((data) => {
        setBlockchainProjectData(data);
        console.log(data)
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

  const onSubmitVote = async (votePassed: boolean, contractAddress: string) => {
    const eventDescription = 'Voting In Progress';
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
        eventDescription,
        eventClass: 'info',
        logMessage: 'Submitting your vote.',
      });

      const txResponse = await contract.vote(votePassed);
      await txResponse.wait();
      setStatusLog({
        eventDescription,
        eventClass: 'success',
        logMessage: 'Your vote got submitted successfully.',
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error voting:', error);
      setStatusLog({
        eventDescription,
        eventClass: 'danger',
        logMessage: `Error occurred while submitting your vote: ${error}`,
      });
      setIsLoading(false);
    }
  };

  const withdrawFunds = async (contractAddress: string, initial: boolean, amount?: string) => {
    const eventDescription = initial ? 'Withdraw Initial Funds' : 'Withdraw Final Funds';
    if (isNaN(parseFloat(amount))) {
      setStatusLog({
        eventDescription,
        eventClass: 'danger',
        logMessage: 'Invalid amount entered. Please enter a valid number.',
      });
      setIsLoading(false);
      return;
    }
    if (!window.ethereum) {
      alert('Please install MetaMask to interact with the contract.');
      return;
    }
    setStatusLog(undefined);
    setIsLoading(true);

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, deFiCrowdFundingContractABI, signer);
      console.log(`withdrawal amount: ${amount}`);

      setStatusLog({
        eventDescription,
        eventClass: 'info',
        logMessage: `Sending request to withdraw funds: hello`,
      });

      const txResponse = await contract.withdrawFromProjectTeamWithdrawalPool(ethers.parseUnits(amount, 18));
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
              key={event.description}
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
                <div className="col-4 d-flex justify-content-between">
                  {event.callToActionText && event.description !== 'Voting In Progress' ? (
                    <button
                      className="btn btn-primary"
                      onClick={event.callToActionFunction}
                      disabled={!event?.callToActionText || event.status !== 'in_progress'}>
                      {event.callToActionText}
                    </button>
                  ) : (
                    ''
                  )}
                  {event.callToActionText && event.description === 'Voting In Progress' ? (
                    <>
                      <button
                        className="btn btn-success"
                        onClick={() => onSubmitVote(true, project.contractAddress)}
                        disabled={!event?.callToActionText || event.status !== 'in_progress'}>
                        Approve
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => onSubmitVote(false, project.contractAddress)}
                        disabled={!event?.callToActionText || event.status !== 'in_progress'}>
                        Reject
                      </button>
                    </>
                  ) : (
                    ''
                  )}
                </div>
              </div>
            </div>
            {statusLog && statusLog.eventDescription === event.description && (
              <div className={`alert alert-${statusLog.eventClass} d-flex justify-content-between align-items-center`}>
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

export default ContractWorkflowBackers;

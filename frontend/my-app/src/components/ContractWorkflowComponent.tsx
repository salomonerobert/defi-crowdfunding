import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { ethers } from "ethers";
import { IoCheckmarkDoneCircle } from "react-icons/io5";
import { TbAlertSquareRoundedFilled } from "react-icons/tb";
import { Project } from "../../../../backend/src/schemas/project.schema";
import { deFiCrowdFundingContractABI } from "../constants";

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
}

function updateLifecycleStatusBasedOnBlockchainData(
  lifecycleEvents: LifecycleEvent[],
  blockchainProjectData: BlockchainProjectData,
  project: Project
) {
  if (blockchainProjectData.totalInvestment >= project.minInvestment) {
    lifecycleEvents[1].status = "completed";
    lifecycleEvents[2].status = "in_progress";
    lifecycleEvents[3].status = "in_progress";
  }
  if (blockchainProjectData.projectTeamWithdrawalPool > 0) {
    lifecycleEvents[2].status = "in_progress";
  } else if (lifecycleEvents[1].status === "completed") {
    lifecycleEvents[2].status = "completed";
  }
  if (blockchainProjectData.isVotingOpen) {
    lifecycleEvents[3].status = "completed";
    lifecycleEvents[4].status = "in_progress";
  }
  if (
    !blockchainProjectData.isVotingOpen &&
    blockchainProjectData.currentVotingSession > 0
  ) {
    lifecycleEvents[4].status = "completed";
    lifecycleEvents[5].status = "in_progress";
  }
  if (
    blockchainProjectData.currentVotingSession > 0 &&
    blockchainProjectData.totalInvestment === 0 &&
    blockchainProjectData.projectTeamWithdrawalPool === 0
  ) {
    lifecycleEvents[5].status = "completed";
    lifecycleEvents[6].status = "completed";
  }
  
  return lifecycleEvents;
}

const ContractWorkflow = ({ project }: { project: Project }) => {
  const defaultLifecycleEvents: LifecycleEvent[] = [
    {
      status: "completed",
      description: "Contract Creation",
    },
    {
      status: "in_progress",
      description: "Fund Raising",
    },
    {
      status: "future_event",
      description: "Withdraw Initial Funds",
      callToActionText: "Withdraw",
      // callToActionFunction
    },
    {
      status: "future_event",
      description: "Milestone Update",
      callToActionText: "Publish milestone",
      // callToActionFunction:
    },
    {
      status: "future_event",
      description: "Voting",
    },
    {
      status: "future_event",
      description: "Withdraw Final Funds",
      callToActionText: "Withdraw",
      // callToActionFunction
    },
    {
      status: "future_event",
      description: "Project Delivered",
    },
  ];
  const [blockchainProjectData, setBlockchainProjectData] =
    useState<BlockchainProjectData>({
      totalInvestment: 0,
      isVotingOpen: false,
      currentVotingSession: 0,
      projectTeamWithdrawalPool: 0,
    });

  const [lifecycleEvents, setLifecycleEvents] = useState<LifecycleEvent[]>(
    defaultLifecycleEvents
  );

  useEffect(() => {
    getContractVariables(project.contractAddress, deFiCrowdFundingContractABI)
      .then((data) => {
        setBlockchainProjectData(data);
        return data; // Return the data for the next .then
      })
      .then((data) => {
        setLifecycleEvents([
          ...updateLifecycleStatusBasedOnBlockchainData(
            lifecycleEvents,
            data,
            project
          ),
        ]);
      });
  }, [project]);

  const getContractVariables = async (contractAddress, abi) => {
    if (!window.ethereum) {
      throw new Error("MetaMask is not available");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, abi, provider);

    try {
      const totalInvestment = await contract.investmentPool();
      const isVotingOpen = await contract["isVotingOpen"]();
      const currentVotingSession = await contract["currentVotingSession"]();
      const projectTeamWithdrawalPool = await contract[
        "projectTeamWithdrawalPool"
      ]();
      return {
        totalInvestment: Number(ethers.formatUnits(totalInvestment, 18)),
        isVotingOpen,
        currentVotingSession: Number(
          ethers.formatUnits(currentVotingSession, 18)
        ),
        projectTeamWithdrawalPool: Number(
          ethers.formatUnits(projectTeamWithdrawalPool, 18)
        ),
      };
    } catch (error) {
      console.error(`Error fetching variables: `, error);
      throw error;
    }
  };

  return (
    <div className="container p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Contract Workflow</h2>
        {/* <button className="btn btn-secondary">Close</button> */}
      </div>

      <div className="mb-3">
        <h3>{project.name}</h3>
        <p>Contract Address: {project.contractAddress}</p>
        <p>Total Investment: {blockchainProjectData.totalInvestment}</p>
        <p>Minimum Funding Required: {project.minInvestment}</p>
      </div>

      <div className="row">
        {lifecycleEvents.map((event, index) => (
          <div
            key={index}
            className="col-12 mb-2 align-items-center"
            style={{
              height: "60px",
              backgroundColor: getEventBackgroundColor(event.status),
              opacity: getEventOpacity(event.status),
            }}
          >
            <div
              className="row mt-3"
              style={
                event.status === "future_event"
                  ? { opacity: 0.5 }
                  : { opacity: 1.0 }
              }
            >
              <div className="col-2 d-flex justify-content-center">
                {event.status === "completed" ? (
                  <IoCheckmarkDoneCircle size={25} color="green" />
                ) : (
                  <TbAlertSquareRoundedFilled
                    size={25}
                    color={event.status === "future_event" ? "black" : "orange"}
                  />
                )}
              </div>
              <div className="col-6">{event.description}</div>
              <div className="col-4">{event.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const getEventBackgroundColor = (status) => {
  switch (status) {
    case "completed":
      return "#00C851";
    case "in_progress":
      return "lightyellow";
    default:
      return "lightgrey";
  }
};

const getEventOpacity = (status) => (status === "future" ? 0.5 : 1);

export default ContractWorkflow;

import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ethers } from 'ethers';

interface LifecycleEvent {
    status: string;
    description: string;
    callToActionText?: string;
    callToActionFunction?: () => void;
}

const ContractWorkflow = ({ project }) => {
    const lifecycleEvents: LifecycleEvent[] = [
        {
            status: "completed",
            description: "Contract Creation"
        },
        {
            status: "in_progress",
            description: "Fund Raising"
        },
        {
            status: 'future_event',
            description: "Milestone Update",
            callToActionText: 'Update Sent',
            // callToActionFunction: 
        },
        {
            status: 'future_event',
            description: 'Voting'
        },
        {
            status: 'future_event',
            description: 'Withdraw Funds',
            callToActionText: 'Withdraw',
            // callToActionFunction
        },
        {
            status: 'future_event',
            description: 'Complete'
        }
    ]
    const getContractVariable = async (variableName, contractAddress, abi) => {
        if (!window.ethereum) {
            throw new Error("MetaMask is not available");
        }
    
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, abi, provider);
    
        try {
            const data = await contract[variableName]();
            return data;
        } catch (error) {
            console.error(`Error fetching ${variableName}:`, error);
            throw error;
        }
    };

    return (
        <div className="container p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>Contract Workflow</h2>
                <button className="btn btn-secondary">Close</button>
            </div>

            <div className="mb-3">
                <h3>{project.title}</h3>
                <p>Contract Address: {project.contractAddress}</p>
                <p>Total Investment: {project.totalInvestment}</p>
                <p>Minimum Funding Required: {project.minFunding}</p>
            </div>

            <div className="row">
                {lifecycleEvents.map((event, index) => (
                    <div key={index} className="col-12 mb-2" style={{ backgroundColor: getEventBackgroundColor(event.status), opacity: getEventOpacity(event.status) }}>
                        <div className="row h-4">
                            <div className="col-2">{event.status}</div>
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
        case 'complete':
            return 'lightgreen';
        case 'inProgress':
            return 'lightyellow';
        default:
            return 'lightgrey';
    }
};

const getEventOpacity = (status) => status === 'future' ? 0.5 : 1;

export default ContractWorkflow;

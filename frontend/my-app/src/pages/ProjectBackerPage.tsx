import InvestmentComponent from "../components/InvestmentComponent";
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Project } from "../../../../backend/src/schemas/project.schema";
import axios from "axios";

export interface ProgressMessage {
  message: string;
  type: string;
}

function ProjectBackerPage() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [selectedProjectAddress, setSelectedProjectAddress] = useState<
    string | undefined
  >(undefined);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [fundedProjects, setFundedProjects] = useState<Project[]>([]);
  const [progressMessages, setProgressMessages] = useState<ProgressMessage[]>(
    []
  );

  useEffect(() => {
    axios
      .get(`http://localhost:3001/project/all`)
      .then((res) => {
        if (res.status === 200) {
          setActiveProjects(res.data.projects.reverse());
        }
      })
      .catch((err) => console.error(err));

    if (userAddress) {
      axios
        .get(`http://localhost:3001/project/invested/${userAddress}`)
        .then((res) => {
          if (res.status === 200) {
            setFundedProjects(res.data.projects.reverse());
          }
        })
        .catch((err) => console.error(err));
    }
  }, [userAddress]);

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

  return (
    <div
      className="d-flex flex-column justify-content-start align-items-center"
      style={{ height: "100vh", backgroundColor: "white", marginTop: "40px" }}
    >
      <h1 style={{ color: "blue", marginBottom: "20px" }}>
        Welcome, Project Backer 👋
      </h1>
      <button className="btn btn-primary" onClick={connectWallet}>
        Connect Wallet
      </button>
      <h3 style={{ marginTop: "40px" }}>Projects Seeking Funding</h3>
      <div className="container-fluid mt-3 mb-3">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Project Title</th>
              <th>Contract Address</th>
              <th>Fundraising Start Date</th>
              <th>Fundraising End Date</th>
              <th>Fundraising Target</th>
              <th>Quorum</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {activeProjects.map((item) => (
              <tr key={item?.id}>
                <td>{item?.name}</td>
                <td>
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://sepolia.etherscan.io/address/${item?.contractAddress}`}
                  >
                    {item?.contractAddress ?? "Pending contract creation"}
                  </a>
                </td>
                <td>{item?.startDate?.toString()}</td>
                <td>{item?.endDate?.toString()}</td>
                <td>USDC {item?.minInvestment}</td>
                <td>{item?.quorom}</td>
                <td
                  className={`text-${
                    item.status === "UNSTARTED" ? "info" : "success"
                  }`}
                >
                  {item?.status}
                </td>
                <td>
                  <button
                    className="btn btn-primary"
                    data-bs-toggle="modal"
                    data-bs-target="#investmentModal"
                    onClick={() =>
                      setSelectedProjectAddress(item.contractAddress)
                    }
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {activeProjects.length === 0 && (
            <div className="alert alert-warning">
              No projects seeking funding as of now.
            </div>
          )}
        </table>
      </div>
      <h3 style={{ marginTop: "20px" }}>Projects You Have Funded</h3>
      <div className="container-fluid mt-3 mb-3">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Project Title</th>
              <th>Contract Address</th>
              <th>Fundraising Start Date</th>
              <th>Fundraising End Date</th>
              <th>Fundraising Target</th>
              <th>Quorum</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {fundedProjects.map((item) => (
              <tr key={item?.id}>
                <td>{item?.name}</td>
                <td>
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://sepolia.etherscan.io/address/${item?.contractAddress}`}
                  >
                    {item?.contractAddress ?? "Pending contract creation"}
                  </a>
                </td>
                <td>{item?.startDate?.toString()}</td>
                <td>{item?.endDate?.toString()}</td>
                <td>USDC {item?.minInvestment}</td>
                <td>{item?.quorom}</td>
                <td
                  className={`text-${
                    item.status === "UNSTARTED" ? "info" : "success"
                  }`}
                >
                  {item?.status}
                </td>
                <td>
                  <button onClick={() => {}}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
          {fundedProjects.length === 0 && !userAddress && (
            <div className="alert alert-warning">
              Login to Metmask to see your funded projects.
            </div>
          )}
          {fundedProjects.length === 0 && userAddress && (
            <div className="alert alert-warning">
              You have not funded any projects yet.
            </div>
          )}
        </table>
      </div>
      <div
        className="modal fade"
        id="investmentModal"
        role="dialog"
        aria-labelledby="investmentModalLabel"
        aria-hidden="true"
      >
        <div
          className="modal-dialog modal-dialog-centered"
          role="document"
          style={{ minWidth: "25vw", minHeight: "25vh" }}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="investmentModalLabel">
                Invest in Project
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => {
                    setSelectedProjectAddress(undefined);
                    setProgressMessages([]);
                }}
              ></button>
            </div>
            <div className="modal-body">
              <InvestmentComponent
                provider={provider}
                userAddress={userAddress}
                projectContractAddress={selectedProjectAddress}
                setProgressMessages={setProgressMessages}
              />
              {progressMessages.length > 0 &&
                progressMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`alert alert-${msg.type} overflow-auto`}
                  >
                    {msg.message}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectBackerPage;

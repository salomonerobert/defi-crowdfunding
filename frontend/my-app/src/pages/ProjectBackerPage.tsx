import InvestmentComponent from "../components/InvestmentComponent";
import React, { useState } from "react";
import { ethers } from "ethers";

function ProjectBackerPage() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [selectedProjectAddress, setSelectedProjectAddress] = useState<string | undefined>(undefined);

  const dummyData = [
    {
      title: "Project A",
      contractAddress: "0x018269c7F7FE220A4Fb34e022a3aB71b43865d36",
      startDate: "2023-01-01",
      endDate: "2023-06-01",
      url: "http://example.com/a",
      action: "View",
    },
    {
      title: "Project B",
      contractAddress: "0xgdgsg64536wdfjnd4506sfhht454",
      startDate: "2023-02-01",
      endDate: "2023-07-01",
      url: "http://example.com/b",
      action: "View",
    },
  ];

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
              <th>Project Website URL</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {dummyData.map((item, index) => (
              <tr key={index}>
                <td>{item.title}</td>
                <td>
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://sepolia.etherscan.io/address/${item.contractAddress}`}
                  >
                    {item.contractAddress}
                  </a>
                </td>
                <td>{item.startDate}</td>
                <td>{item.endDate}</td>
                <td>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    {item.url}
                  </a>
                </td>
                <td>
                  <button
                    className="btn btn-primary"
                    data-bs-toggle="modal"
                    data-bs-target="#investmentModal"
                    onClick={() => setSelectedProjectAddress(item.contractAddress)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {dummyData.length === 0 && (
            <div className="alert alert-warning">No projects seeking funding at the moment.</div>
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
              <th>Project Website URL</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {dummyData.map((item, index) => (
              <tr key={index}>
                <td>{item.title}</td>
                <td>
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://sepolia.etherscan.io/address/${item.contractAddress}`}
                  >
                    {item.contractAddress}
                  </a>
                </td>
                <td>{item.startDate}</td>
                <td>{item.endDate}</td>
                <td>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    {item.url}
                  </a>
                </td>
                <td>
                  <button className="btn btn-primary">{item.action}</button>
                </td>
              </tr>
            ))}
          </tbody>
          {dummyData.length === 0 && (
            <div className="alert alert-warning">You do not have any funded projects yet.</div>
          )}
        </table>
      </div>
      <div
        className="modal fade"
        id="investmentModal"
        // tabIndex="-1"
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
                onClick={() => setSelectedProjectAddress(undefined)}
              ></button>
            </div>
            <div className="modal-body">
              {/* <form onSubmit={handleFundProject}>
                <div className="mb-3">
                  <label htmlFor="investmentAmount" className="form-label">
                    Investing Amount in USDC
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="investmentAmount"
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Submit
                </button>
              </form> */}
              <InvestmentComponent provider={provider} userAddress={userAddress} projectContractAddress={selectedProjectAddress} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectBackerPage;

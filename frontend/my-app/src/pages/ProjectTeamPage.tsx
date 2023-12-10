import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Project } from "../../../../backend/src/schemas/project.schema";
import axios from "axios";
import ContractWorkflow from "../components/ContractWorkflowComponent";

function ProjectTeamPage() {
  const [userAddress, setUserAddress] = useState<string | null>("");
  const [projectDetails, setProjectDetails] = useState<Project | undefined>({
    name: "",
    owners: [],
    startDate: new Date(),
    endDate: new Date(),
    minInvestment: 0,
    quorom: 0,
    status: undefined,
  });
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(
    undefined
  );

  useEffect(() => {
    if (!userAddress) {
      connectWallet();
    }

    if (userAddress) {
      fetchAllActiveProjects();
    }
  }, [userAddress]);

  function fetchAllActiveProjects() {
    axios
      .get(`http://localhost:3001/project/owned/${userAddress}`)
      .then((res) => {
        if (res.status === 200) {
          setActiveProjects(res.data.projects.reverse());
        }
      });
  }

  // Connect to Metamask
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setUserAddress(accounts[0]);
      } catch (error) {
        console.error(error);
      }
    } else {
      alert("Metamask is not installed");
    }
  };

  function handleCreateProject(e) {
    e.preventDefault();
    const project: Project = projectDetails;
    project.owners = [userAddress];
    axios
      .post(`http://localhost:3001/project/create/${userAddress}`, {
        projectDetails: project,
      })
      .then((res) => {
        if (res.status === 200) {
          setActiveProjects((prev) => [res.data, ...prev]);
        }
      })
      .catch((err) => console.error(err));
    setProjectDetails(undefined);
  }

  function formatDate(date) {
    if (!date) return;
    const d = new Date(date);
    let month = "" + (d.getMonth() + 1);
    let day = "" + d.getDate();
    let year = d.getFullYear();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;

    return `${year}-${month}-${day}`;
  }

  function handleDeployContract(id: string) {
    if (id) {
      axios
        .post(`http://localhost:3001/project/deploy`, {
          userId: userAddress,
          projectId: id,
        })
        .then((res) => {
          if (res.status === 200) {
            window.alert(
              `Contract successfully deployed! Contract address: ${res.data.contractAddress}`
            );
            fetchAllActiveProjects();
          }
        });
    }
  }

  return (
    <div
      className="d-flex flex-column justify-content-start align-items-center"
      style={{ height: "100vh", backgroundColor: "white", marginTop: "40px" }}
    >
      <h1 style={{ color: "blue", marginBottom: "20px" }}>
        Welcome, Project Team 🧑‍💻
      </h1>
      <button className="btn btn-primary" onClick={connectWallet}>
        Connect Wallet
      </button>

      <div className="alert alert-warning my-5">
        <form onSubmit={handleCreateProject}>
          <div className="mb-3">
            <label htmlFor="ownerWallet" className="form-label">
              Owner Wallet
            </label>
            <input
              type="text"
              className="form-control"
              id="ownerWallet"
              value={userAddress}
              onChange={(e) =>
                setProjectDetails({ ...projectDetails, owners: [userAddress] })
              }
            />
          </div>

          <div className="mb-3">
            <label htmlFor="startDate" className="form-label">
              Start Date (use date picker)
            </label>
            <input
              type="date"
              className="form-control"
              id="startDate"
              value={formatDate(projectDetails?.startDate)}
              onChange={(e) =>
                setProjectDetails({
                  ...projectDetails,
                  startDate: new Date(e.target.value),
                })
              }
            />
          </div>

          <div className="mb-3">
            <label htmlFor="endDate" className="form-label">
              End Date (use date picker)
            </label>
            <input
              type="date"
              className="form-control"
              id="endDate"
              value={formatDate(projectDetails?.endDate)}
              onChange={(e) =>
                setProjectDetails({
                  ...projectDetails,
                  endDate: new Date(e.target.value),
                })
              }
            />
          </div>

          <div className="mb-3">
            <label htmlFor="minInvestment" className="form-label">
              Minimum Investment
            </label>
            <input
              type="number"
              className="form-control"
              id="minInvestment"
              value={projectDetails?.minInvestment}
              onChange={(e) =>
                setProjectDetails({
                  ...projectDetails,
                  minInvestment: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="mb-3">
            <label htmlFor="quorum" className="form-label">
              {`Quorum Percentage (in integer format without %)`}
            </label>
            <input
              type="number"
              className="form-control"
              id="quorum"
              value={projectDetails?.quorom}
              onChange={(e) =>
                setProjectDetails({
                  ...projectDetails,
                  quorom: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="mb-3">
            <label htmlFor="name" className="form-label">
              Project Name
            </label>
            <input
              type="text"
              className="form-control"
              id="name"
              value={projectDetails?.name}
              onChange={(e) =>
                setProjectDetails({ ...projectDetails, name: e.target.value })
              }
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Create Project
          </button>
        </form>
      </div>

      <h3 style={{ marginTop: "20px" }}>Projects You Have Started</h3>
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
                <td>{item?.startDate.toString()}</td>
                <td>{item?.endDate.toString()}</td>
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
                      item?.status === "UNSTARTED"
                        ? handleDeployContract(item?.id)
                        : setSelectedProject(item)
                    }
                  >
                    {item?.status !== "DEPLOYED" ? "DEPLOY" : "VIEW"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {activeProjects.length === 0 && (
            <div className="alert alert-warning">
              You do not have any funded projects yet.
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
          style={{ minWidth: "50vw", minHeight: "25vh" }}
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
                onClick={() => setSelectedProject(undefined)}
              ></button>
            </div>
            <div className="modal-body">
              {selectedProject && (
                <ContractWorkflow project={selectedProject} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectTeamPage;

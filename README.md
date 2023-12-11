# Crowdfunder 2.0

## Demo Contract

**Contract Address:**  
[https://sepolia.etherscan.io/address/0x0dAD4b92123f658Dce6bF961f2EAbA32C47C74FF](https://sepolia.etherscan.io/address/0x0dAD4b92123f658Dce6bF961f2EAbA32C47C74FF)  
This is the contract that was deployed and funded in the demo video.

**Demo Video:**  
[Watch the Demo on YouTube](https://youtu.be/GtwGYjGeuhU)


## Introduction
This project is a decentralized application (dApp) designed to facilitate crowdfunding for various initiatives. Leveraging blockchain technology, including **Solidity Smart Contracts** and **Chainlink Functions & Chainlink Automation**, the platform provides a transparent, secure, and efficient way for projects to raise funds and for backers to invest in projects they believe in. The project is primarily built on the Ethereum blockchain and utilizes smart contracts to manage the entire funding lifecycle.

## Key Features
1. **Project Setup:** Project teams can use the web application to create a smart contract specifying key details like the fundraising start and end dates, minimum investment amount, and milestone dates.
2. **Investment Tracking:** Once the smart contract is deployed, backers can invest in projects using USDC. The smart contract tracks each investment tied to the investor's wallet address.
3. **Automatic Refunds:** If the minimum funding goal is not met by the deadline, the smart contract automatically issues refunds to all backers.
4. **Funding Release:** On successful funding, the project team receives an initial 50% of the total funds to kickstart their project.
5. **Milestone-Based Funding:** As the project hits each milestone, an update is sent to the smart contract, triggering a notification to backers on the dApp. Backers can then vote on releasing the next tranche of funds.
6. **Voting System:** The smart contract tallies votes for each funding phase. If the majority votes in favor, additional funds are released to the project team. Otherwise, the contract awaits the next milestone update for a new voting round.
7. **Project Completion:** The process continues until the project concludes, ensuring continuous backer involvement and project team accountability.

## Technology Stack
- **Ethereum Blockchain:** For deploying smart contracts and handling transactions.
- **Smart Contracts:** Written in **Solidity**, managing the funding logic and backer votes, using **hardhat**.
- **Web Application:** A user-friendly interface for project teams and backers, built using **React**.
- **Chainlink:** Chainlink Functions were used for notifications to project backers. Chainlink Automation was used to automate disbursement of funds to project team or initiate refund automatically when certain conditions are met.

## How to Use
### For Project Teams
1. **Create a Project:** Navigate to the web application and fill in the project setup form.
2. **Deploy Contract:** Review the terms and deploy your project contract to the Ethereum blockchain.
3. **Track Funding:** Monitor your project's funding status, prepare for milestone updates and withdraw funds that have been released to you.

### For Investors
1. **Choose a Project:** Browse through the list of available projects.
2. **Invest in Projects:** Send USDC to the project's smart contract address using the intuitive dApp interface with Metamask integration.
3. **Vote on Milestones:** Participate in milestone-based votes to release further funding. Hold project teams accountable on their deliverables.

## Installation and Setup
> You may clone the repository and run npm install to install the relevant repositories. Use npm run start to run both the backend and frontend respectively.

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// This is for the self registration for automation
struct RegistrationParams {
    string name;
    bytes encryptedEmail;
    address upkeepContract;
    uint32 gasLimit;
    address adminAddress;
    uint8 triggerType;
    bytes checkData;
    bytes triggerConfig;
    bytes offchainConfig;
    uint96 amount;
}

interface AutomationRegistrarInterface {
    function registerUpkeep(
        RegistrationParams calldata requestParams
    ) external returns (uint256);
}

// https://docs.chain.link/chainlink-automation/overview/supported-networks#ethereum
// use the above link to get the value for the registrar parameter in constructor
// https://docs.chain.link/resources/link-token-contracts?parent=automation
// use above link to get the value for the link parameter in constructor
// 0x6f14C02Fc1F78322cFd7d707aB90f18baD3B54f5 - USDC token contract address
contract DeFiCrowdFunding is AutomationCompatibleInterface {
    LinkTokenInterface public immutable i_link;
    AutomationRegistrarInterface public immutable i_registrar;

    uint256 public startDate;
    uint256 public endDate;
    uint256 public minimumInvestment;
    // uint256 public constant MINIMUM_INVESTMENT = 10000 * (10 ** 18);
    IERC20 public usdcToken;
    mapping(address => uint256) public investments;
    address[] public investors;
    address public projectTeamWalletAddress;
    mapping(address => uint256) public refunds;
    uint256 public investmentPool;
    bool public minimumReached = false;
    bool public isVotingOpen = false;
    uint256 private _upKeepID = 0;
    uint256 public projectTeamWithdrawalPool = 0;

    //Voting parameters
    mapping(uint256 => mapping(address => bool)) public votingStatus;
    uint256 public passVotes = 0;
    uint256 public failVotes = 0;
    uint256 public currentVotingSession = 0;
    uint256 public quorumPercentage;

    //Upkeep control parameters
    bool public isInitialDisbursementToProjectTeamComplete = false;
    bool public isSuccessfulFundraiseNotificationSent = false;
    bool public isLinkFunded = false;

    constructor(
        uint256 _startDate,
        uint256 _endDate,
        uint256 _minimumInvestment,
        uint256 _quorumPercentage,
        address _projectTeamWalletAddress,
        address _usdcTokenAddress,
        LinkTokenInterface link,
        AutomationRegistrarInterface registrar
    ) {
        startDate = _startDate;
        endDate = _endDate;
        minimumInvestment = _minimumInvestment;
        quorumPercentage = _quorumPercentage;
        projectTeamWalletAddress = _projectTeamWalletAddress;
        usdcToken = IERC20(_usdcTokenAddress);
        i_link = link;
        i_registrar = registrar;
    }

    function invest(uint256 amount) public {
        require(
            block.timestamp >= startDate,
            "Investment period has not started yet"
        );
        require(block.timestamp <= endDate, "Investment period has ended");
        usdcToken.transferFrom(msg.sender, address(this), amount);
        if (investments[msg.sender] == 0) {
            investors.push(msg.sender);
        }
        investments[msg.sender] += amount;
        investmentPool += amount;
        if (investmentPool >= minimumInvestment) {
            minimumReached = true;
        }
    }

    function fundLink(uint256 amount) public {
        i_link.transferFrom(msg.sender, address(this), amount);
        isLinkFunded = true;
    }

    function vote(bool pass) public {
        require(isVotingOpen, "Voting is not open.");
        require(investments[msg.sender] > 0, "Wallet address not recognised.");
        require(
            !votingStatus[currentVotingSession][msg.sender],
            "Vote has already been recorded."
        );

        votingStatus[currentVotingSession][msg.sender] = true;
        if (pass) {
            passVotes += investments[msg.sender]; // Count votes based on investment
        } else {
            failVotes += investments[msg.sender]; // Count votes based on investment
        }

        uint256 totalVotes = passVotes + failVotes;
        if (totalVotes >= (quorumPercentage * investmentPool) / 100) {
            if (passVotes >= totalVotes / 2) {
                // Voting passed, trigger milestone payment
                projectTeamWithdrawalPool += investmentPool;
                investmentPool = 0;
                resetVoting(); // Reset voting after decision is made
            } else {
                // Voting failed, reset voting
                resetVoting(); // Reset voting after decision is made
            }
        }
    }

    function projectTeamMilestoneUpdate() public {
        require(
            msg.sender == projectTeamWalletAddress,
            "Not authorised to post milestones"
        );

        isVotingOpen = true;
        //trigger ChainLink functions for sending notification to users to start voting
    }

    function withdrawFromProjectTeamWithdrawalPool(
        uint256 withdrawalAmount
    ) public {
        require(
            msg.sender == projectTeamWalletAddress,
            "Not authorised to withdraw funds"
        );
        require(
            withdrawalAmount <= projectTeamWithdrawalPool,
            "Withdrawal amount exceeds available funds"
        );

        projectTeamWithdrawalPool -= withdrawalAmount;

        bool success = usdcToken.transfer(msg.sender, withdrawalAmount);
        require(success, "Withdrawal failed");
    }

    function resetVoting() private {
        passVotes = 0;
        failVotes = 0;
        currentVotingSession += 1;
        isVotingOpen = false;
    }

    function refundInvestors() internal {
        // Iterate through investors and prepare refunds
        // we can restart the contract again, update isStartDate
        for (uint i = 0; i < investors.length; i++) {
            address investor = investors[i];
            uint256 amount = investments[investor];
            refunds[investor] = amount;
            investmentPool -= amount;

            // Resetting investment to 0
            investments[investor] = 0;
        }
    }

    function withdrawRefund() public {
        uint256 refundAmount = refunds[msg.sender];
        require(refundAmount > 0, "No refund available");

        // Reset the refund amount before transferring to prevent re-entrancy attacks
        refunds[msg.sender] = 0;

        // Transfer USDC tokens to the caller of the function
        bool success = usdcToken.transfer(msg.sender, refundAmount);
        require(success, "Refund transfer failed");
    }

    // adminAddress just use your wallet address
    // REMEMBER to transfer LINK tokens to the deployed contract address before running this function e.g. 1.01 token
    // gasLimit = 500000
    // amount is in Link Tokens in wei. use 1000000000000000000
    function registerAndPredictID(
        string calldata name,
        uint32 gasLimit,
        uint96 amount,
        address adminAddress
    ) public {
        // LINK must be approved for transfer - this can be done every time or once
        // with an infinite approval
        if (_upKeepID != 0) {
            return;
        }
        i_link.approve(address(i_registrar), amount);
        uint256 upkeepID = i_registrar.registerUpkeep(
            RegistrationParams(
                name,
                "0x",
                address(this),
                gasLimit,
                adminAddress,
                0,
                "0x",
                "0x",
                "0x",
                amount
            )
        );
        if (upkeepID != 0) {
            _upKeepID = upkeepID;
        } else {
            revert("auto-approve disabled");
        }
    }

    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        bool refundNeeded = block.timestamp >= endDate && !minimumReached && investmentPool != 0;
        bool initialTransferPending = block.timestamp >= endDate && minimumReached && !isInitialDisbursementToProjectTeamComplete;
        bool successfulFundraiseNotificationPending = minimumReached && block.timestamp >= startDate && !isSuccessfulFundraiseNotificationSent;
        upkeepNeeded = refundNeeded || initialTransferPending || successfulFundraiseNotificationPending;
        performData = "";
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        if (block.timestamp >= endDate && !minimumReached && investmentPool != 0) {
            refundInvestors();
        }
        if (block.timestamp >= endDate && minimumReached && !isInitialDisbursementToProjectTeamComplete) {
            //call notification Chainlink Function
            projectTeamWithdrawalPool = investmentPool / 2;
            investmentPool -= projectTeamWithdrawalPool;
            isInitialDisbursementToProjectTeamComplete = true;
        }
        if (minimumReached && block.timestamp >= startDate && !isSuccessfulFundraiseNotificationSent) {
            // trigger CL Functions to send notification
            isSuccessfulFundraiseNotificationSent = true;
        }
    }
}

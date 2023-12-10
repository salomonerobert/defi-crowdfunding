// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/libraries/FunctionsRequest.sol";

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
contract DeFiCrowdFunding is AutomationCompatibleInterface, FunctionsClient  {
    using FunctionsRequest for FunctionsRequest.Request;

    LinkTokenInterface public immutable i_link;
    AutomationRegistrarInterface public immutable i_registrar;

    address private owner;
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

    //Upkeep & Functions control parameters
    bool public isInitialDisbursementToProjectTeamComplete = false;
    bool public isSuccessfulFundraiseNotificationSent = false;
    bool public isLinkFunded = false;
    uint64 public subscriptionId;

    // DONID for ethereum sepolia
    bytes32 public donId=0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000;
    address router = 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0;
    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    constructor(
        uint256 _startDate,
        uint256 _endDate,
        uint256 _minimumInvestment,
        uint256 _quorumPercentage,
        address _projectTeamWalletAddress,
        address _usdcTokenAddress,
        LinkTokenInterface link,
        AutomationRegistrarInterface registrar
    )  FunctionsClient(router) {
        startDate = _startDate;
        endDate = _endDate;
        minimumInvestment = _minimumInvestment;
        quorumPercentage = _quorumPercentage;
        projectTeamWalletAddress = _projectTeamWalletAddress;
        usdcToken = IERC20(_usdcTokenAddress);
        i_link = link;
        i_registrar = registrar;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
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
                sendRequest(postVoteOutcomeSource, [addressToString(address(this)),"PASSED"], subscriptionId);
            } else {
                // Voting failed, reset voting
                resetVoting(); // Reset voting after decision is made
                sendRequest(postVoteOutcomeSource, [addressToString(address(this)),"FAILED"], subscriptionId);
            }
        }
    }

    function projectTeamMilestoneUpdate() public {
        require(
            msg.sender == projectTeamWalletAddress,
            "Not authorised to post milestones"
        );

        isVotingOpen = true;
        sendRequest(requestVoteSource, [addressToString(address(this))], subscriptionId);

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

    function registerCLFunction(uint64 _subscriptionId) external onlyOwner {
        subscriptionId = _subscriptionId;
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
            if(subscriptionId){
                sendRequest(postUpdatesSource, [addressToString(address(this)),"REFUNDED"], subscriptionId);
            }
        }
        if (block.timestamp >= endDate && minimumReached && !isInitialDisbursementToProjectTeamComplete) {
            //call notification Chainlink Function
            projectTeamWithdrawalPool = investmentPool / 2;
            investmentPool -= projectTeamWithdrawalPool;
            isInitialDisbursementToProjectTeamComplete = true;
            sendRequest(postNotifyTransferPendingSource, [addressToString(address(this))], subscriptionId);

        }
        if (minimumReached && block.timestamp >= startDate && !isSuccessfulFundraiseNotificationSent) {
            // trigger CL Functions to send notification
            isSuccessfulFundraiseNotificationSent = true;
            if(subscriptionId){
                sendRequest(postUpdatesSource, [addressToString(address(this)),"FUNDED"], subscriptionId);
            }
        }
    }

    function addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
         
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
         
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
         
        return string(str);
    }
    

    string requestVoteSource =
        "const contractAddress = args[0];"
        "const apiResponse = await Functions.makeHttpRequest({"
        "url: `https://3a5e-116-87-35-218.ngrok-free.app/contract/voteRequest/${contractAddress}/`,"
        " headers:{'ngrok-skip-browser-warning':'ignore'}"
        "});"
        "if (apiResponse.error) {"
        "throw Error('Request failed');"
        "}"
        "console.log('API response data:', JSON.stringify(data, null, 2));"
        "const { data } = apiResponse;"
        "return Functions.encodeString(data.message);";

    string postUpdatesSource =
        "const contractAddress = args[0];"
        "const stat = args[1];"
        "const apiResponse = await Functions.makeHttpRequest({"
        "url: `https://3a5e-116-87-35-218.ngrok-free.app/contract/updates/${contractAddress}/`,"
        "method:'POST',"
        "data:{status:stat},"
        "headers:{"
        "'ngrok-skip-browser-warning':'ignore',"
        "'Content-Type': 'application/json'}"
        "});"
    "if (apiResponse.error) {"
        "throw Error('Request failed');"
        "}"
        "const { data } = apiResponse;"
        "return Functions.encodeString(data.message);";

    string postVoteOutcomeSource =
        "const contractAddress = args[0];"
        "const voteRes = args[1];"
        "const apiResponse = await Functions.makeHttpRequest({"
        "url: `https://3a5e-116-87-35-218.ngrok-free.app/contract/voteOutcome/${contractAddress}/`,"
        "method:'POST',"
        "data:{outcome:voteRes},"
        "headers:{"
        "'ngrok-skip-browser-warning':'ignore',"
        "'Content-Type': 'application/json'}"
        "});"
    "if (apiResponse.error) {"
        "throw Error('Request failed');"
        "}"
        "const { data } = apiResponse;"
        "return Functions.encodeString(data.message);";
    
    string postNotifyTransferPendingSource =
        "const contractAddress = args[0];"
        "const apiResponse = await Functions.makeHttpRequest({"
        "url: `https://3a5e-116-87-35-218.ngrok-free.app/contract/notifyTransferPending/${contractAddress}/`,"
        "headers:{"
        "'ngrok-skip-browser-warning':'ignore'"
        "});"
    "if (apiResponse.error) {"
        "throw Error('Request failed');"
        "}"
        "const { data } = apiResponse;"
        "return Functions.encodeString(data.message);";
    uint32 gasLimit = 300000;

  function sendRequest(
    string calldata source,
    string[] calldata args,
    uint64 subscriptionId
  ) internal {
    FunctionsRequest.Request memory req; // Struct API reference: https://docs.chain.link/chainlink-functions/api-reference/functions-request
    req.initializeRequest(FunctionsRequest.Location.Inline, FunctionsRequest.CodeLanguage.JavaScript, source);
    if (args.length > 0) {
      req.setArgs(args);
    }
    s_lastRequestId = _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donId);
  }

  function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
    if (s_lastRequestId != requestId) {
        revert UnexpectedRequestID(requestId); // Check if request IDs match
        }
    s_lastResponse = response;
    s_lastError = err;
  }
}

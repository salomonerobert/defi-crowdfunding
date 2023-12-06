// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeFiCrowdFunding is AutomationCompatibleInterface {
    uint256 public startDate;
    uint256 public endDate;
    uint256 public constant MINIMUM_INVESTMENT = 10000 * (10 ** 6);
    IERC20 public usdcToken;
    mapping(address => uint256) public investments;
    address[] public investors;
    mapping(address => uint256) public refunds;
    uint256 public totalInvestment;
    bool public minimumReached = false;

    constructor(uint256 _startDate, uint256 _endDate, address _usdcTokenAddress) {
        startDate = _startDate;
        endDate = _endDate;
        usdcToken = IERC20(_usdcTokenAddress);
    }

    function invest(uint256 amount) public {
        require(block.timestamp < startDate, "Investment period has ended");
        usdcToken.transferFrom(msg.sender, address(this), amount);
        if (investments[msg.sender] == 0) {
            investors.push(msg.sender);
        }
        investments[msg.sender] += amount;
        totalInvestment += amount;
    }

    function checkUpkeep(bytes calldata /* checkData */) external view override returns (bool upkeepNeeded, bytes memory performData) {
        bool isStartDate = block.timestamp >= startDate && !minimumReached;
        bool isEndDate = block.timestamp >= endDate;
        upkeepNeeded = isStartDate || isEndDate;
        performData = '';
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        if (block.timestamp >= startDate && !minimumReached) {
            if (totalInvestment < MINIMUM_INVESTMENT) {
                // Refund process
                refundInvestors();
            } else {
                minimumReached = true;
            }
        }
        // Additional logic for end date
    }

    function refundInvestors() internal {
        // Iterate through investors and prepare refunds
        for (uint i = 0; i < investors.length; i++) {
            address investor = investors[i];
            uint256 amount = investments[investor];
            refunds[investor] = amount;
            totalInvestment -= amount;

            // Resetting investment to 0
            investments[investor] = 0;
        }
    }

    function withdrawRefund() public {
        uint256 refundAmount = refunds[msg.sender];
        require(refundAmount > 0, "No refund available");

        // Reset the refund amount before transferring to prevent re-entrancy attacks
        refunds[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Refund transfer failed");
    }
}

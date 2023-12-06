import { ethers } from "hardhat";

// async function main() {
//   const currentTimestampInSeconds = Math.round(Date.now() / 1000);
//   const unlockTime = currentTimestampInSeconds + 60;

//   const lockedAmount = ethers.parseEther("0.001");

//   const lock = await ethers.deployContract("Lock", [unlockTime], {
//     value: lockedAmount,
//   });

//   await lock.waitForDeployment();

//   console.log(
//     `Lock with ${ethers.formatEther(
//       lockedAmount
//     )}ETH and unlock timestamp ${unlockTime} deployed to ${lock.target}`
//   );
// }

// // We recommend this pattern to be able to use async/await everywhere
// // and properly handle errors.
// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });

async function main() {

  const DeFiCrowdFunding = await ethers.deployContract('DeFiCrowdFunding', [1670198400000, 1672876800000, '0x8267cF9254734C6Eb452a7bb9AAF97B392258b21'])
  await DeFiCrowdFunding.waitForDeployment();
  console.log(`Deployed to ${DeFiCrowdFunding.target}`)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import express from 'express';
import { ethers } from 'hardhat';

const app = express();
const port = 3001;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/deploy', async (req, res) => {
  try {
    const { startDate, endDate } = req.body.data;
    const automationRegistrarAddress = '0xb0E49c5D0d05cbc241d68c05BC5BA1d1B7B72976';
    const linkTokenAddress = '0x779877A7B0D9E8603169DdbD7836e478b4624789';
    const usdcTokenAddress = '0x6f14C02Fc1F78322cFd7d707aB90f18baD3B54f5';

    const DeFiCrowdFunding = await ethers.deployContract('DeFiCrowdFunding', [startDate, endDate, usdcTokenAddress, linkTokenAddress, automationRegistrarAddress])
    await DeFiCrowdFunding.waitForDeployment();

    // Send response
    res.status(200).json({ message: 'Contract deployed', contractAddress: DeFiCrowdFunding.target });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deploying contract' });
  }
});

// app.post('/deploy', (req, res) => {
//   exec('npx hardhat run --network sepolia scripts/deploy.ts', (error, stdout, stderr) => {
//       if (error) {
//           console.error(`Error: ${error.message}`);
//           return res.status(500).json({ message: `Error: ${error.message}` });
//       }
//       if (stderr) {
//           console.error(`Stderr: ${stderr}`);
//           return res.status(500).json({ message: `Stderr: ${stderr}` });
//       }
//       console.log(`Stdout: ${stdout}`);
//       res.status(200).json({ message: 'Contract deployed', output: stdout });
//   });
// });


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
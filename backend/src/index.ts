import express from 'express';
import { ethers } from 'hardhat';
import * as hardhat from 'hardhat';
import { exec } from 'child_process';

const app = express();
const port = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/deploy', async (req, res) => {
  try {
    const { startDate, endDate, ownerAddress } = req.body.data;

    const DeFiCrowdFunding = await ethers.deployContract('DeFiCrowdFunding', [startDate, endDate, ownerAddress])
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
import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying PDT_NFT contract with the account:", deployer.address);

  const PDT_NFT = await ethers.getContractFactory("PDT_NFT");
  const nftContract = await PDT_NFT.deploy();

  await nftContract.waitForDeployment();

  console.log("PDT_NFT deployed to:", await nftContract.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
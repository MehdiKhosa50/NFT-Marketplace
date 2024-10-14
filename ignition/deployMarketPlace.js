import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
  console.log("Deploying NFTMarketplace contract...");

  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
  const nftMarketplace = await NFTMarketplace.deploy();

  await nftMarketplace.waitForDeployment();

  console.log("NFTMarketplace deployed to:", await nftMarketplace.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
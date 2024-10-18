import { ethers } from 'hardhat';

async function main() {
  console.log("Deploying NFTMarketplace contract...");

  const name = "NFT Marketplace";
  const symbol = "NFTM";
  const minterAddress = "0x9C8fF314C9f6949aB9d570e09e7cF6E9e9aD6b3E"; 
  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");

  const nftMarketplace = await NFTMarketplace.deploy(name, symbol, minterAddress);

  await nftMarketplace.waitForDeployment();

  console.log("NFTMarketplace deployed to:", await nftMarketplace.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

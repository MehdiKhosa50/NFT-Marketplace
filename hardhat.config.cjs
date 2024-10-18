require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      { version: "0.5.16" },
      { version: "0.6.6" },
      { version: "0.4.23" },
      { version: "0.4.24" },
      { version: "0.4.25" },
      { version: "0.8.18" },
      { version: "0.8.20" },
    ],
    settings: {
      optimizer: { 
        enabled: true, 
        runs: 200, 
        details: { yul: false } 
      },
    },
  },
  networks: {
    ganache: {
      url: "http://127.0.0.1:8545",
      accounts: [
        "0x47c209724e1ec6cc9035dbbb6df20b24105cf0c2de1a0a7c9463025a6740564c"
      ],
    },
  },
};
import React, { createContext, useState, useEffect, useRef } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { ethers } from 'ethers';

const RPC_HTTP_URL = 'https://rpc-amoy.polygon.technology';

export const NFTContext = createContext({
    account: null,
    isConnected: false,
    connectWallet: () => { },
    disconnectWallet: () => { },
    triggerWalletConnect: () => { },
    getContract: () => { },
});

export const NFTContextProvider = ({ children }) => {
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const [provider, setProvider] = useState(null);
    const connectButtonRef = useRef(null);

    useEffect(() => {
        const initProvider = async () => {
            if (window.ethereum) {
                const newProvider = ethers.getDefaultProvider(RPC_HTTP_URL);
                setProvider(newProvider);
            }
        };

        initProvider();
    }, []);

    const getContract = async (signer = false, contractAddress, abi) => {
        try {
            if (signer) {
                if (window.ethereum) {
                    const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
                    const signerInstance = await web3Provider.getSigner();
                    return new ethers.Contract(contractAddress, abi, signerInstance);
                } else {
                    console.error("Ethereum provider is not available.");
                    return null;
                }
            } else {
                return new ethers.Contract(contractAddress, abi, provider);
            }
        } catch (error) {
            console.error("Failed to get contract.", error);
            return null;
        }
    };

    const triggerWalletConnect = () => {
        if (connectButtonRef.current) {
            connectButtonRef.current.click();
        }
    };

    return (
        <NFTContext.Provider value={{
            account: address,
            isConnected,
            connectWallet: triggerWalletConnect,
            disconnectWallet: disconnect,
            triggerWalletConnect,
            getContract,
            connectButtonRef,
        }}>
            {children}
        </NFTContext.Provider>
    );
};
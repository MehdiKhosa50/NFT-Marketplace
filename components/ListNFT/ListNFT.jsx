import { useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { MarketPlace_ADDRESS, MarketPlace_ABI } from '../../constant';
import { NFTContext } from '../../context/NFTContext';

const ListNFT = () => {
    const { account } = useContext(NFTContext);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [tokenId, setTokenId] = useState('');
    const [nftContractAddress, setNftContractAddress] = useState('');
    const [price, setPrice] = useState('');
    const [sellerListings, setSellerListings] = useState([]);

    useEffect(() => {
        if (account && typeof window.ethereum !== 'undefined') {
            console.log("Account: ", account);
            const tempProvider = new ethers.providers.Web3Provider(window.ethereum);
            setProvider(tempProvider);
            console.log("tempProvider: ", tempProvider);
            const tempSigner = tempProvider.getSigner();
            setSigner(tempSigner);
            console.log("tempSigner: ", tempSigner);
            const marketplaceContract = new ethers.Contract(MarketPlace_ADDRESS, MarketPlace_ABI, tempSigner);
            setContract(marketplaceContract);
            console.log("marketplaceContract: ", marketplaceContract);
            fetchSellerListings(account);
        }else {
            console.warn("Account is undefined or window.ethereum is not available.");
        }
    }, [account]);

    const fetchSellerListings = async (address) => {
        if (!contract) return;
        try {
            const listingIds = await contract.getSellerListingIds(address);
            setSellerListings(listingIds);
        } catch (error) {
            console.error("Error fetching seller listings:", error);
        }
    };

    const listNFT = async () => {
        try {
            const transaction = await contract.listNFT(nftContractAddress, tokenId, ethers.utils.parseEther(price), {
                gasLimit: ethers.utils.hexlify(10000000),
            });
            console.log(nftContractAddress, tokenId, price )
            await transaction.wait();
            console.log("Transaction:", transaction);
            console.log("NFT listed successfully!");
            fetchSellerListings(account);
        } catch (error) {
            console.error("Error listing NFT:", error);
        }
    };

    return (
        <div>
            <h1>List Your NFT</h1>
            <TextField
                label="NFT Contract Address"
                value={nftContractAddress}
                onChange={(e) => setNftContractAddress(e.target.value)}
                fullWidth
                margin="normal"
            />
            <TextField
                label="Token ID"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                fullWidth
                margin="normal"
            />
            <TextField
                label="Price (ETH)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                fullWidth
                margin="normal"
            />
            <Button variant="contained" color="primary" onClick={listNFT}>
                List NFT
            </Button>
            <h2>Your Listed NFTs</h2>
            {sellerListings.length > 0 ? (
                <ul>
                    {sellerListings.map((listingId) => (
                        <li key={listingId}>Listing ID: {listingId}</li>
                    ))}
                </ul>
            ) : (
                <p>No NFTs listed yet.</p>
            )}
        </div>
    );
};

export default ListNFT;
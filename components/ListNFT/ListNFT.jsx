import React, { useState, useEffect, useContext, useCallback } from 'react';
import { ethers } from 'ethers';
import { Button, TextField, Typography, Box, CircularProgress, Grid, Card, CardContent, CardMedia } from '@mui/material';
import { MarketPlace_ADDRESS, MarketPlace_ABI, SimpleNFT_ADDRESS, SimpleNFT_ABI } from '../../constant';
import { NFTContext } from '../../context/NFTContext';

const ListNFT = () => {
    const { account } = useContext(NFTContext);
    const [marketplaceContract, setMarketplaceContract] = useState(null);
    const [nftContract, setNftContract] = useState(null);
    const [userNFTs, setUserNFTs] = useState([]);
    const [selectedNFT, setSelectedNFT] = useState(null);
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const initContracts = useCallback(async () => {
        console.log("Initializing contracts...");
        console.log("Account:", account);
        console.log("Window ethereum:", window.ethereum ? "Available" : "Not available");
        
        if (account && window.ethereum) {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                
                const network = await provider.getNetwork();
                console.log("Connected to network:", network.name);

                console.log("MarketPlace_ADDRESS:", MarketPlace_ADDRESS);
                console.log("SimpleNFT_ADDRESS:", SimpleNFT_ADDRESS);
                
                const marketplace = new ethers.Contract(MarketPlace_ADDRESS, MarketPlace_ABI, signer);
                setMarketplaceContract(marketplace);
                
                const nft = new ethers.Contract(SimpleNFT_ADDRESS, SimpleNFT_ABI, signer);
                setNftContract(nft);
                
                console.log("Contracts initialized successfully");
            } catch (error) {
                console.error("Error initializing contracts:", error);
                setError("Failed to initialize contracts. " + error.message);
            }
        } else {
            console.log("Account or window.ethereum not available");
            setError("Please connect your wallet to continue.");
        }
    }, [account]);

    const fetchUserNFTs = useCallback(async () => {
        console.log("Fetching user NFTs...");
        console.log("NFT Contract:", nftContract ? "Available" : "Not available");
        console.log("Account:", account);
        
        if (!nftContract || !account) {
            console.log("NFT contract or account not available");
            setError("Unable to fetch NFTs. Please ensure your wallet is connected.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            console.log("Fetching NFTs for account:", account);
            const balance = await nftContract.balanceOf(account);
            console.log("NFT balance:", balance.toString());
            
            const nfts = [];
            for (let i = 0; i < balance; i++) {
                try {
                    const tokenId = await nftContract.tokenOfOwnerByIndex(account, i);
                    console.log("Token ID:", tokenId.toString());
                    const tokenURI = await nftContract.tokenURI(tokenId);
                    console.log("Token URI:", tokenURI);
                    const metadata = await fetch(tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'))
                        .then(res => res.json());
                    nfts.push({ 
                        tokenId: tokenId.toString(), 
                        ...metadata,
                        image: metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
                    });
                    console.log("Added NFT:", nfts[nfts.length - 1]);
                } catch (error) {
                    console.error("Error fetching NFT at index", i, ":", error);
                }
            }
            console.log("Fetched NFTs:", nfts);
            setUserNFTs(nfts);
        } catch (error) {
            console.error("Error fetching user NFTs:", error);
            setError("Failed to fetch NFTs. " + error.message);
        } finally {
            setLoading(false);
        }
    }, [nftContract, account]);

    useEffect(() => {
        console.log("Running initContracts effect");
        initContracts();
    }, [initContracts]);

    useEffect(() => {
        console.log("Running fetchUserNFTs effect");
        console.log("NFT Contract:", nftContract ? "Available" : "Not available");
        console.log("Account:", account);
        if (nftContract && account) {
            fetchUserNFTs();
        }
    }, [nftContract, account, fetchUserNFTs]);

    const listNFT = async () => {
        if (!marketplaceContract || !nftContract || !selectedNFT || !price) return;
        setLoading(true);
        try {
            const approveTx = await nftContract.approve(MarketPlace_ADDRESS, selectedNFT.tokenId);
            await approveTx.wait();

            const listingTx = await marketplaceContract.listNFT(
                SimpleNFT_ADDRESS,
                selectedNFT.tokenId,
                ethers.parseEther(price)
            );
            await listingTx.wait();

            console.log("NFT listed successfully!");
            setSelectedNFT(null);
            setPrice('');
            await fetchUserNFTs();
        } catch (error) {
            console.error("Error listing NFT:", error);
            setError("Failed to list NFT. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const refreshUserNFTs = async () => {
        await fetchUserNFTs();
        console.log("NFTs refreshed. You may need to navigate to the home page manually.");
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 3 }}>
             <Typography variant="h4" gutterBottom>List Your NFT</Typography>
            <Button onClick={fetchUserNFTs} variant="contained" color="secondary" sx={{ mb: 2 }}>
                Refresh NFTs
            </Button>

            {loading ? (
                <CircularProgress />
            ) : error ? (
                <Typography color="error">{error}</Typography>
            ) : userNFTs.length > 0 ? (
                <Grid container spacing={2}>
                    {userNFTs.map((nft) => (
                        <Grid item xs={12} sm={6} md={4} key={nft.tokenId}>
                            <Card
                                onClick={() => setSelectedNFT(nft)}
                                sx={{ cursor: 'pointer', border: selectedNFT?.tokenId === nft.tokenId ? '2px solid blue' : 'none' }}
                            >
                                <CardMedia
                                    component="img"
                                    height="140"
                                    image={nft.image}
                                    alt={nft.name}
                                />
                                <CardContent>
                                    <Typography gutterBottom variant="h6" component="div">
                                        {nft.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Token ID: {nft.tokenId}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Typography>You don't have any NFTs to list.</Typography>
            )}

            {selectedNFT && (
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom>List Selected NFT</Typography>
                    <TextField
                        label="Price (ETH)"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        fullWidth
                        margin="normal"
                        type="number"
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={listNFT}
                        fullWidth
                        sx={{ mt: 2 }}
                        disabled={loading || !selectedNFT || !price}
                    >
                        {loading ? <CircularProgress size={24} /> : 'List NFT'}
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default ListNFT;

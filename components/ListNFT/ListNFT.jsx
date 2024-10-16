import React, { useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';
import { Button, Typography, Box, CircularProgress, Grid, Card, CardContent, CardMedia, TextField } from '@mui/material';
import { NFTMarketplace_ADDRESS, NFTMarketplace_ABI } from '../../constant';
import { NFTContext } from '../../context/NFTContext';

const ListNFT = () => {
    const { account } = useContext(NFTContext);
    const [ownedNFTs, setOwnedNFTs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [listingPrices, setListingPrices] = useState({});

    useEffect(() => {
        if (account) {
            fetchOwnedNFTs();
        }
    }, [account]);

    const fetchOwnedNFTs = async () => {
        if (!account) return;
        setLoading(true);
        setError(null);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(NFTMarketplace_ADDRESS, NFTMarketplace_ABI, provider);
    
            // Convert balance to a number, as balance will return a BigInt
            const balance = await contract.balanceOf(account);
            const balanceNum = Number(balance); // Safely convert if it's within safe range
            
            // Fetch NFTs owned by the account
            const nftsData = await Promise.all(
                Array.from({ length: balanceNum }, (_, i) => i).map(async (index) => {
                    const tokenId = await contract.tokenOfOwnerByIndex(account, index);
                    
                    // Convert tokenId to a string to avoid BigInt issues
                    const tokenIdStr = tokenId.toString();
                    const tokenURI = await contract.tokenURI(tokenIdStr);
                    
                    const metadata = await fetchMetadata(tokenURI);
                    
                    return {
                        id: tokenIdStr, // Use string for display and manipulation
                        ...metadata,
                        image: metadata.image ? metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') : null
                    };
                })
            );
            setOwnedNFTs(nftsData);
        } catch (error) {
            console.error("Error fetching owned NFTs:", error);
            setError("Failed to fetch owned NFTs. " + error.message);
        } finally {
            setLoading(false);
        }
    };    

    const fetchMetadata = async (tokenURI) => {
        try {
            const response = await fetch(tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'));
            return await response.json();
        } catch (error) {
            console.error("Error fetching metadata:", error);
            return {};
        }
    };

    const handlePriceChange = (tokenId, price) => {
        setListingPrices(prev => ({ ...prev, [tokenId]: price }));
    };

    const listNFT = async (tokenId) => {
        if (!account) return;
        const price = listingPrices[tokenId];
        if (!price) {
            alert("Please enter a price for the NFT.");
            return;
        }
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(NFTMarketplace_ADDRESS, NFTMarketplace_ABI, signer);

            const priceInWei = ethers.parseEther(price);
            const tx = await contract.listNFT(tokenId, priceInWei);
            await tx.wait();
            alert("NFT listed successfully!");
            fetchOwnedNFTs(); // Refresh the list
        } catch (error) {
            console.error("Error listing NFT:", error);
            alert("Failed to list NFT. " + error.message);
        }
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 3 }}>
            <Typography variant="h4" gutterBottom>Your NFTs</Typography>
            <Button onClick={fetchOwnedNFTs} variant="contained" color="secondary" sx={{ mb: 2 }}>
                Refresh NFTs
            </Button>

            {loading ? (
                <CircularProgress />
            ) : error ? (
                <Typography color="error">{error}</Typography>
            ) : ownedNFTs.length > 0 ? (
                <Grid container spacing={2}>
                    {ownedNFTs.map((nft) => (
                        <Grid item xs={12} sm={6} md={4} key={nft.id}>
                            <Card>
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
                                    <TextField
                                        label="Price (ETH)"
                                        type="number"
                                        value={listingPrices[nft.id] || ''}
                                        onChange={(e) => handlePriceChange(nft.id, e.target.value)}
                                        fullWidth
                                        margin="normal"
                                    />
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={() => listNFT(nft.id)}
                                        sx={{ mt: 1 }}
                                        fullWidth
                                    >
                                        List NFT
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Typography>You don't own any NFTs.</Typography>
            )}
        </Box>
    );
};

export default ListNFT
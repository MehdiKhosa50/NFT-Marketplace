import React, { useEffect, useState, useContext } from 'react';
import { ethers } from 'ethers';
import NavBar from '../NavBar/NavBar';
import { Container, Grid, Card, CardMedia, CardContent, Typography, Box, Button, CircularProgress } from '@mui/material';
import { MarketPlace_ADDRESS, MarketPlace_ABI, SimpleNFT_ADDRESS, SimpleNFT_ABI } from '../../constant';
import { NFTContext } from '../../context/NFTContext';

const Home = () => {
    const { account } = useContext(NFTContext);
    const [listedNFTs, setListedNFTs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (typeof window.ethereum !== 'undefined' && account) {
            fetchListedNFTs();
        }
    }, [account]);
    
    const fetchListedNFTs = async () => {
        setError(null);
        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
    
            const marketplaceContract = new ethers.Contract(MarketPlace_ADDRESS, MarketPlace_ABI, signer);
            const simpleNFTContract = new ethers.Contract(SimpleNFT_ADDRESS, SimpleNFT_ABI, signer);
    
            const listingIds = await marketplaceContract.getAllListingIds();
            console.log("Listing IDs:", listingIds);
    
            const currentTimestamp = Math.floor(Date.now() / 1000);
            
            const nfts = await Promise.all(listingIds.map(async (id) => {
                try {
                    const listing = await marketplaceContract.listings(id);
                    
                    if (!listing.isListed || Number(listing.deadline) <= currentTimestamp) {
                        console.log(`Listing ${id} is not active or has expired`);
                        return null;
                    }
            
                    const tokenURI = await simpleNFTContract.tokenURI(listing.tokenId);
                    console.log(`Token URI for listing ${id}:`, tokenURI);
                    
                    const response = await fetch(tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/'));
                    const metadata = await response.json();
            
                    return {
                        id: listing.tokenId.toString(),
                        listingId: id.toString(),
                        image: metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/'),
                        name: metadata.name,
                        price: ethers.formatEther(listing.price.toString()),
                        seller: listing.seller,
                        deadline: new Date(Number(listing.deadline) * 1000).toLocaleString(),
                        isListed: listing.isListed
                    };
                } catch (error) {
                    console.error(`Error processing listing ${id}:`, error);
                    return null;
                }
            }));            
    
            const filteredNFTs = nfts.filter(nft => nft !== null);
            console.log("Filtered NFTs:", filteredNFTs);
            setListedNFTs(filteredNFTs);
        } catch (error) {
            console.error("Error fetching NFTs:", error);
            setError(error.message || "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    }; 

    const buyNFT = async (listingId, price) => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const marketplaceContract = new ethers.Contract(MarketPlace_ADDRESS, MarketPlace_ABI, signer);

            const tx = await marketplaceContract.buyNFT(listingId, { value: ethers.parseEther(price) });
            await tx.wait();

            console.log("NFT purchased successfully!");
            fetchListedNFTs();
        } catch (error) {
            console.error("Error buying NFT:", error);
            setError("Failed to buy NFT. Please try again.");
        }
    };

    return (
        <Container>
            <NavBar />
            <Typography variant="h4" sx={{ mt: 4, mb: 3 }}>Top Collection</Typography>

            {loading ? (
                <CircularProgress />
            ) : error ? (
                <Typography color="error">Error: {error}</Typography>
            ) : listedNFTs.length > 0 ? (
                <Grid container spacing={3}>
                    {listedNFTs.map((nft) => (
                        <Grid item xs={12} sm={6} md={4} key={nft.id}>
                            <Card>
                                <CardMedia
                                    component="img"
                                    height="250"
                                    image={nft.image}
                                    alt={nft.name}
                                    sx={{ objectFit: 'cover' }}
                                />
                                <CardContent>
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        bgcolor: '#f5f5f5',
                                        p: 1,
                                        borderRadius: 1
                                    }}>
                                        <Typography variant="h6" color="primary">
                                            {nft.name}
                                        </Typography>
                                        <Typography variant="body1" color="secondary" fontWeight="bold">
                                            {nft.price} ETH
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Seller: {nft.seller.slice(0, 6)}...{nft.seller.slice(-4)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Deadline: {nft.deadline}
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                        sx={{ mt: 2 }}
                                        onClick={() => buyNFT(nft.listingId, nft.price)}
                                    >
                                        Buy for {nft.price} ETH
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Typography>No active NFT listings at the moment.</Typography>
            )}
        </Container>
    );
};

export default Home;
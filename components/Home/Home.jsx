import React, { useEffect, useState, useContext } from 'react';
import { ethers } from 'ethers';
import NavBar from '../NavBar/NavBar';
import { Container, Grid, Card, CardMedia, CardContent, Typography, Box, Button } from '@mui/material';
import { MarketPlace_ADDRESS, MarketPlace_ABI, SimpleNFT_ADDRESS, SimpleNFT_ABI } from '../../constant';
import { NFTContext } from '../../context/NFTContext';

const Home = () => {
    const { account } = useContext(NFTContext);
    const [listedNFTs, setListedNFTs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (typeof window.ethereum !== 'undefined') {
            fetchListedNFTs();
        }
    }, [account]);

    const fetchListedNFTs = async () => {
        setError(null);
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            console.log("Provider: ", provider);

            if (!MarketPlace_ABI || !SimpleNFT_ABI) {
                throw new Error("Contract ABI is undefined");
            }

            const marketplaceContract = new ethers.Contract(MarketPlace_ADDRESS, MarketPlace_ABI, provider);
            const simpleNFTContract = new ethers.Contract(SimpleNFT_ADDRESS, SimpleNFT_ABI, provider);

            console.log("Marketplace contract:", marketplaceContract);
            console.log("SimpleNFT contract:", simpleNFTContract);

            const listingIds = await marketplaceContract.getListingIds();
            console.log("Listing IDs:", listingIds);

            if (!Array.isArray(listingIds)) {
                throw new Error("getListingIds did not return an array");
            }

            const nfts = await Promise.all(listingIds.map(async (id) => {
                const listing = await marketplaceContract.listings(id);
                if (!listing.isActive) return null;

                const tokenURI = await simpleNFTContract.tokenURI(listing.tokenId);
                console.log("TokenURI: ", tokenURI)
                const response = await fetch(tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'));
                const metadata = await response.json();

                return {
                    id: listing.tokenId.toString(),
                    listingId: id.toString(),
                    image: metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'),
                    name: metadata.name,
                    price: ethers.utils.formatEther(listing.price),
                    seller: listing.seller
                };
            }));

            setListedNFTs(nfts.filter(nft => nft !== null));
        } catch (error) {
            console.error("Error fetching NFTs:", error);
           // setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const buyNFT = async (listingId, price) => {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const marketplaceContract = new ethers.Contract(MarketPlace_ADDRESS, MarketPlace_ABI, signer);

            const transaction = await marketplaceContract.buyNFT(listingId, {
                value: ethers.utils.parseEther(price)
            });

            await transaction.wait();
            alert("NFT purchased successfully!");
            fetchListedNFTs(); // Refresh the list after purchase
        } catch (error) {
            console.error("Error buying NFT:", error);
            alert("Failed to buy NFT. Please try again.");
        }
    };

    return (
        <Container>
            <NavBar />
            <Typography variant="h4" sx={{ mt: 4, mb: 3 }}>NFT Marketplace</Typography>

            {loading ? (
                <Typography>Loading NFTs...</Typography>
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
                <Typography>No NFTs listed at the moment.</Typography>
            )}
        </Container>
    );
};

export default Home;
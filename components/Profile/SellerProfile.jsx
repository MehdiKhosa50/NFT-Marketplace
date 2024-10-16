import React, { useEffect, useState, useContext } from 'react';
import { ethers } from 'ethers';
import { Container, Grid, Card, CardContent, Typography, Box, Button, CircularProgress } from '@mui/material';
import { NFTMarketplace_ADDRESS, NFTMarketplace_ABI } from '../../constant';
import { NFTContext } from '../../context/NFTContext';
import Image from 'next/image';

const SellerProfile = () => {
    const { account } = useContext(NFTContext);
    const [listedNFTs, setListedNFTs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSellerListings = async () => {
        if (!account) return;
        setLoading(true);
        setError(null);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
    
            const marketplaceContract = new ethers.Contract(NFTMarketplace_ADDRESS, NFTMarketplace_ABI, signer);
    
            const listedTokenIds = await marketplaceContract.getSellerListings(account);
            const nfts = [];

            for (let i = 0; i < listedTokenIds.length; i++) {
                const tokenId = listedTokenIds[i];
                const uri = await marketplaceContract.tokenURI(tokenId);
                const listing = await marketplaceContract.getListingDetails(tokenId);

                if (listing.isActive) {
                    const response = await fetch(uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'));
                    const metadata = await response.json();

                    nfts.push({
                        id: tokenId.toString(),
                        image: metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'),
                        name: metadata.name,
                        price: ethers.formatEther(listing.price.toString()),
                        isActive: listing.isActive
                    });
                }
            }

            setListedNFTs(nfts);
        } catch (error) {
            console.error("Error fetching seller listings:", error);
            setError(error.message || "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (account && typeof window !== 'undefined' && window.ethereum) {
            fetchSellerListings();
        }
    }, [account]);

    const cancelListing = async (tokenId) => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(NFTMarketplace_ADDRESS, NFTMarketplace_ABI, signer);

            const tx = await contract.cancelListing(tokenId);
            await tx.wait();

            fetchSellerListings();
        } catch (error) {
            console.error("Error canceling listing:", error);
            setError(error.message || "An unknown error occurred while canceling the listing");
        }
    };

    return (
        <Container>
            <Typography variant="h4" sx={{ mt: 4, mb: 3 }}>Your Listed NFTs</Typography>

            {loading ? (
                <CircularProgress />
            ) : error ? (
                <Box>
                    <Typography color="error">{error}</Typography>
                    <Button onClick={fetchSellerListings} variant="contained" sx={{ mt: 2 }}>
                        Retry
                    </Button>
                </Box>
            ) : listedNFTs.length > 0 ? (
                <Grid container spacing={3}>
                    {listedNFTs.map((nft) => (
                        <Grid item xs={12} sm={6} md={4} key={nft.id}>
                            <Card>
                                <Box sx={{ position: 'relative', height: 250 }}>
                                    <Image
                                        src={nft.image}
                                        alt={nft.name}
                                        layout="fill"
                                        objectFit="cover"
                                    />
                                </Box>
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
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        fullWidth
                                        sx={{ mt: 2 }}
                                        onClick={() => cancelListing(nft.id)}
                                    >
                                        Cancel Listing
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Typography>You don't have any listed NFTs.</Typography>
            )}
        </Container>
    );
};

export default SellerProfile;
import React, { useEffect, useState, useContext, useCallback } from 'react';
import { ethers } from 'ethers';
import { Container, Grid, Card, CardContent, Typography, Box, Button } from '@mui/material';
import { MarketPlace_ADDRESS, MarketPlace_ABI, SimpleNFT_ADDRESS, SimpleNFT_ABI } from '../../constant';
import { NFTContext } from '../../context/NFTContext';
import Image from 'next/image';

const Profile = () => {
    const { account } = useContext(NFTContext);
    const [userNFTs, setUserNFTs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUserNFTs = useCallback(async () => {
        if (!account) return;
        setError(null);
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);

            console.log("MarketPlace_ABI:", MarketPlace_ABI);
            console.log("SimpleNFT_ABI:", SimpleNFT_ABI);

            if (!MarketPlace_ABI || !SimpleNFT_ABI) {
                throw new Error("Contract ABI is undefined");
            }

            const marketplaceContract = new ethers.Contract(MarketPlace_ADDRESS, MarketPlace_ABI, provider);
            const simpleNFTContract = new ethers.Contract(SimpleNFT_ADDRESS, SimpleNFT_ABI, provider);

            console.log("Marketplace contract:", marketplaceContract);
            console.log("SimpleNFT contract:", simpleNFTContract);

            // Debug: Log all available functions on the contract
            console.log("Available functions:", Object.keys(marketplaceContract.functions));

            // Check if the function exists
            if (typeof marketplaceContract.getSellerListingIds !== 'function') {
                throw new Error("getSellerListingIds function does not exist on the contract");
            }

            console.log("Calling getSellerListingIds with account:", account);
            const sellerListingIds = await marketplaceContract.getSellerListingIds(account);
            console.log("Seller Listing IDs:", sellerListingIds);

            if (!Array.isArray(sellerListingIds)) {
                throw new Error("getSellerListingIds did not return an array");
            }

            const nfts = await Promise.all(sellerListingIds.map(async (id) => {
                const listing = await marketplaceContract.listings(id);
                if (!listing.isActive) return null;

                const tokenURI = await simpleNFTContract.tokenURI(listing.tokenId);
                const response = await fetch(tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'));
                const metadata = await response.json();

                return {
                    id: listing.tokenId.toString(),
                    listingId: id.toString(),
                    image: metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'),
                    name: metadata.name,
                    price: ethers.utils.formatEther(listing.price),
                };
            }));

            setUserNFTs(nfts.filter(nft => nft !== null));
        } catch (error) {
            console.error("Error fetching user NFTs:", error);
            setError(error.message || "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    }, [account]);

    useEffect(() => {
        if (account && typeof window !== 'undefined' && window.ethereum) {
            fetchUserNFTs();
        }
    }, [account, fetchUserNFTs]);

    const cancelListing = async (listingId) => {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(MarketPlace_ADDRESS, MarketPlace_ABI, signer);

            const tx = await contract.cancelListing(listingId);
            await tx.wait();

            fetchUserNFTs();
        } catch (error) {
            console.error("Error canceling listing:", error);
            setError(error.message || "An unknown error occurred while canceling the listing");
        }
    };

    return (
        <Container>
            <Typography variant="h4" sx={{ mt: 4, mb: 3 }}>Your Listed NFTs</Typography>

            {loading ? (
                <Typography>Loading your NFTs...</Typography>
            ) : error ? (
                <Box>
                    <Typography color="error">Error: {error}</Typography>
                    <Button onClick={fetchUserNFTs} variant="contained" sx={{ mt: 2 }}>
                        Retry
                    </Button>
                </Box>
            ) : userNFTs.length > 0 ? (
                <Grid container spacing={3}>
                    {userNFTs.map((nft) => (
                        <Grid item xs={12} sm={6} md={4} key={nft.id}>
                            <Card>
                                <Box sx={{ position: 'relative', height: 250 }}>
                                    <Image
                                        src={nft.image}
                                        alt={nft.name}
                                        layout="fill"
                                        objectFit="cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "/placeholder-image.png"; // Replace with your placeholder image path
                                        }}
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
                                        onClick={() => cancelListing(nft.listingId)}
                                    >
                                        Cancel Listing
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Typography>You haven&apos;t listed any NFTs yet.</Typography>
            )}
        </Container>
    );
};

export default Profile;
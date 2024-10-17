import React, { useEffect, useState, useContext } from 'react';
import { ethers } from 'ethers';
import { Container, Grid, Card, CardContent, Typography, Box, Button, CircularProgress } from '@mui/material';
import { NFTMarketplace_ADDRESS, NFTMarketplace_ABI } from '../../constant';
import { NFTContext } from '../../context/NFTContext';
import Image from 'next/image';
import axios from 'axios';

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

            const listings = await marketplaceContract.getSellerListings(account);
            const nfts = await Promise.all(listings.filter(listing => listing.active).map(async (listing) => {
                const uri = await marketplaceContract.tokenURI(listing.tokenId);
                const response = await axios.get(uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'));
                const metadata = response.data;

                return {
                    id: listing.tokenId.toString(),
                    image: metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'),
                    name: metadata.name,
                    price: ethers.formatEther(listing.price),
                    expirationTime: listing.expirationTime.toString()
                };
            }));

            setListedNFTs(nfts);
        } catch (error) {
            console.error("Error fetching seller listings:", error);
            setError(error.message || "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (account) {
            fetchSellerListings();
        }
    }, [account]);

    const cancelListing = async (tokenId) => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(NFTMarketplace_ADDRESS, NFTMarketplace_ABI, signer);

            const domain = {
                name: await contract.name(),
                version: '1',
                chainId: (await provider.getNetwork()).chainId,
                verifyingContract: NFTMarketplace_ADDRESS,
            };

            const types = {
                CancelListing: [
                    { name: 'tokenId', type: 'uint256' },
                    { name: 'creator', type: 'address' },
                ],
            };

            const value = {
                tokenId: tokenId,
                creator: account,
            };

            const signature = await signer.signTypedData(domain, types, value);

            const tx = await contract.cancelListing({
                tokenId: tokenId,
                creator: account,
                signature: signature,
            });

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
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Expires: {new Date(nft.expirationTime * 1000).toLocaleString()}
                                    </Typography>
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
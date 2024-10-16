import React, { useEffect, useState, useContext, useCallback } from 'react';
import { ethers } from 'ethers';
import { Container, Grid, Card, CardContent, Typography, Box, Button, CircularProgress, TextField } from '@mui/material';
import { MarketPlace_ADDRESS, MarketPlace_ABI, SimpleNFT_ADDRESS, SimpleNFT_ABI } from '../../constant';
import { NFTContext } from '../../context/NFTContext';
import Image from 'next/image';

const SellerProfile = () => {
    const { account } = useContext(NFTContext);
    const [userNFTs, setUserNFTs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [listingPrice, setListingPrice] = useState('');
    const [listingDeadline, setListingDeadline] = useState('');

    const fetchUserNFTs = useCallback(async () => {
        if (!account) return;
        setLoading(true);
        setError(null);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
    
            const marketplaceContract = new ethers.Contract(MarketPlace_ADDRESS, MarketPlace_ABI, signer);
            const simpleNFTContract = new ethers.Contract(SimpleNFT_ADDRESS, SimpleNFT_ABI, signer);
    
            const sellerListingIds = await marketplaceContract.getSellerListings(account);
            console.log("Seller Listing IDs:", sellerListingIds);
    
            const currentTimestamp = Math.floor(Date.now() / 1000);

            const nfts = await Promise.all(sellerListingIds.map(async (id) => {
                const listing = await marketplaceContract.listings(id);
            
                if (!listing.isListed || Number(listing.deadline) <= currentTimestamp) {
                    return null;
                }
            
                const tokenURI = await simpleNFTContract.tokenURI(listing.tokenId);
                const response = await fetch(tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'));
                const metadata = await response.json();
            
                return {
                    id: listing.tokenId.toString(),
                    listingId: id.toString(),
                    image: metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'),
                    name: metadata.name,
                    price: ethers.formatEther(listing.price.toString()),
                    deadline: new Date(Number(listing.deadline) * 1000).toLocaleString(),
                    isListed: listing.isListed
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
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(MarketPlace_ADDRESS, MarketPlace_ABI, signer);

            const tx = await contract.cancelListing(listingId);
            await tx.wait();

            fetchUserNFTs();
        } catch (error) {
            console.error("Error canceling listing:", error);
            setError(error.message || "An unknown error occurred while canceling the listing");
        }
    };

    const listNFT = async (tokenId) => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(MarketPlace_ADDRESS, MarketPlace_ABI, signer);

            const price = ethers.parseEther(listingPrice);
            const deadline = Math.floor(new Date(listingDeadline).getTime() / 1000);
            const nonce = await contract.getNonce(account);

            const domain = {
                name: "NFTMarketplace",
                version: "1",
                chainId: (await provider.getNetwork()).chainId,
                verifyingContract: MarketPlace_ADDRESS
            };

            const types = {
                Listing: [
                    { name: "nftContract", type: "address" },
                    { name: "tokenId", type: "uint256" },
                    { name: "price", type: "uint256" },
                    { name: "seller", type: "address" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" }
                ]
            };

            const value = {
                nftContract: SimpleNFT_ADDRESS,
                tokenId: tokenId,
                price: price,
                seller: account,
                nonce: nonce,
                deadline: deadline
            };

            const signature = await signer.signTypedData(domain, types, value);

            const tx = await contract.listNFTWithSignature(
                SimpleNFT_ADDRESS,
                tokenId,
                price,
                deadline,
                signature
            );
            await tx.wait();

            fetchUserNFTs();
        } catch (error) {
            console.error("Error listing NFT:", error);
            setError(error.message || "An unknown error occurred while listing the NFT");
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
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        Deadline: {nft.deadline}
                                    </Typography>
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
                <Typography>You don't have any active NFT listings.</Typography>
            )}
        </Container>
    );
};

export default SellerProfile;
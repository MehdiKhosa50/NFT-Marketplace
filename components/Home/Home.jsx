import React, { useEffect, useState, useContext } from 'react';
import { ethers } from 'ethers';
import NavBar from '../NavBar/NavBar';
import { Container, Grid, Card, CardMedia, CardContent, Typography, Box, Button, CircularProgress } from '@mui/material';
import { NFTMarketplace_ADDRESS, NFTMarketplace_ABI } from '../../constant';
import { NFTContext } from '../../context/NFTContext';

const Home = () => {
    const { account } = useContext(NFTContext);
    const [nfts, setNFTs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (typeof window.ethereum !== 'undefined' && account) {
            fetchNFTs();
        }
    }, [account]);
    
    const fetchNFTs = async () => {
        setError(null);
        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
    
            const marketplaceContract = new ethers.Contract(NFTMarketplace_ADDRESS, NFTMarketplace_ABI, signer);
    
            const nextTokenId = await marketplaceContract.getNextTokenId();
            
            const nftPromises = [];
            for (let i = 0; i < nextTokenId; i++) {
                nftPromises.push(fetchNFTDetails(marketplaceContract, i));
            }
            
            const fetchedNFTs = await Promise.all(nftPromises);
            const filteredNFTs = fetchedNFTs.filter(nft => nft !== null);
            setNFTs(filteredNFTs);
        } catch (error) {
            console.error("Error fetching NFTs:", error);
            setError(error.message || "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    const fetchNFTDetails = async (contract, tokenId) => {
        try {
            const owner = await contract.ownerOf(tokenId);
            const tokenURI = await contract.tokenURI(tokenId);
            const listing = await contract.getListing(tokenId);

            // Check if it's a lazy-minted NFT
            const lazyMintVoucher = await contract.getLazyMintVoucher(tokenId);

            let metadata;
            if (tokenURI.startsWith('ipfs://')) {
                const response = await fetch(tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'));
                metadata = await response.json();
            } else {
                metadata = { name: `NFT #${tokenId}`, image: 'placeholder-image-url' };
            }

            return {
                id: tokenId.toString(),
                owner: owner,
                image: metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'),
                name: metadata.name,
                price: listing.active ? ethers.formatEther(listing.price.toString()) : null,
                seller: listing.active ? listing.seller : null,
                isLazyMinted: lazyMintVoucher.creator !== ethers.ZeroAddress,
                creator: lazyMintVoucher.creator !== ethers.ZeroAddress ? lazyMintVoucher.creator : owner
            };
        } catch (error) {
            console.error(`Error processing NFT ${tokenId}:`, error);
            return null;
        }
    };

    const buyNFT = async (tokenId, price) => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const marketplaceContract = new ethers.Contract(NFTMarketplace_ADDRESS, NFTMarketplace_ABI, signer);

            const tx = await marketplaceContract.buyNFT(tokenId, { value: ethers.parseEther(price) });
            await tx.wait();

            console.log("NFT purchased successfully!");
            fetchNFTs();
        } catch (error) {
            console.error("Error buying NFT:", error);
            setError("Failed to buy NFT. Please try again.");
        }
    };

    const finalizeLazyMint = async (tokenId) => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const marketplaceContract = new ethers.Contract(NFTMarketplace_ADDRESS, NFTMarketplace_ABI, signer);

            const tx = await marketplaceContract.finalizeLazyMint(tokenId);
            await tx.wait();

            console.log("Lazy minted NFT finalized successfully!");
            fetchNFTs();
        } catch (error) {
            console.error("Error finalizing lazy minted NFT:", error);
            setError("Failed to finalize lazy minted NFT. Please try again.");
        }
    };

    return (
        <Container>
            <NavBar />
            <Typography variant="h4" sx={{ mt: 4, mb: 3 }}>NFT Marketplace</Typography>

            {loading ? (
                <CircularProgress />
            ) : error ? (
                <Typography color="error">Error: {error}</Typography>
            ) : nfts.length > 0 ? (
                <Grid container spacing={3}>
                    {nfts.map((nft) => (
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
                                        {nft.price && (
                                            <Typography variant="body1" color="secondary" fontWeight="bold">
                                                {nft.price} ETH
                                            </Typography>
                                        )}
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Owner: {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}
                                    </Typography>
                                    {nft.isLazyMinted && (
                                        <Typography variant="body2" color="text.secondary">
                                            Status: Lazy Minted
                                        </Typography>
                                    )}
                                    {nft.creator !== nft.owner && (
                                        <Typography variant="body2" color="text.secondary">
                                            Creator: {nft.creator.slice(0, 6)}...{nft.creator.slice(-4)}
                                        </Typography>
                                    )}
                                    {nft.price && (
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            fullWidth
                                            sx={{ mt: 2 }}
                                            onClick={() => buyNFT(nft.id, nft.price)}
                                        >
                                            Buy for {nft.price} ETH
                                        </Button>
                                    )}
                                    {nft.isLazyMinted && nft.creator === account && (
                                        <Button
                                            variant="contained"
                                            color="secondary"
                                            fullWidth
                                            sx={{ mt: 2 }}
                                            onClick={() => finalizeLazyMint(nft.id)}
                                        >
                                            Finalize Minting
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Typography>No NFTs available at the moment.</Typography>
            )}
        </Container>
    );
};

export default Home;
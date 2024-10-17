import React, { useEffect, useState, useContext } from 'react';
import { ethers } from 'ethers';
import NavBar from '../NavBar/NavBar';
import { Container, Grid, Card, CardMedia, CardContent, Typography, Box, Button, CircularProgress } from '@mui/material';
import { NFTMarketplace_ADDRESS, NFTMarketplace_ABI } from '../../constant';
import { NFTContext } from '../../context/NFTContext';
import axios from 'axios';

const Home = () => {
    const { account } = useContext(NFTContext);
    const [nfts, setNFTs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (typeof window.ethereum !== 'undefined' && account) {
            fetchAllNFTs();
        }
    }, [account]);

    const fetchAllNFTs = async () => {
        setError(null);
        setLoading(true);
        try {
            console.log('Fetching lazy minted NFTs...');
            const lazyMintedNFTs = getLazyMintedNFTs();
            console.log('Lazy minted NFTs:', lazyMintedNFTs);
            const onChainNFTs = await fetchOnChainNFTs();
            console.log('On-chain NFTs:', onChainNFTs);
            const allNFTs = [...lazyMintedNFTs, ...onChainNFTs];
            console.log('All NFTs:', allNFTs);
            setNFTs(allNFTs);
        } catch (error) {
            console.error("Error fetching NFTs:", error);
            setError(error.message || "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    const getLazyMintedNFTs = () => {
        const storedNFTs = localStorage.getItem('lazyMintedNFTs');
        return storedNFTs ? JSON.parse(storedNFTs) : [];
    };

    const fetchOnChainNFTs = async () => {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(NFTMarketplace_ADDRESS, NFTMarketplace_ABI, provider);

        const nextTokenId = await contract.getNextTokenId();
        const nftPromises = [];

        for (let i = 0; i < nextTokenId; i++) {
            nftPromises.push(fetchNFTData(i, contract));
        }

        const nftData = await Promise.all(nftPromises);
        return nftData.filter(nft => nft !== null);
    };

    const fetchNFTData = async (tokenId, contract) => {
        try {
            const owner = await contract.ownerOf(tokenId);
            if (owner === ethers.ZeroAddress) return null;

            const tokenURI = await contract.tokenURI(tokenId);
            if (!tokenURI) {
                console.error(`No tokenURI found for token ${tokenId}`);
                return null;
            }
            const metadata = await fetchIPFSMetadata(tokenURI);

            return {
                id: tokenId.toString(),
                tokenURI,
                price: metadata.price || '0',
                creator: metadata.creator || owner,
                name: metadata.name || `NFT #${tokenId}`,
                description: metadata.description || '',
                image: metadata.image || '',
                isLazyMinted: false
            };
        } catch (error) {
            console.error(`Error fetching NFT data for token ${tokenId}:`, error);
            return null;
        }
    };

    const fetchIPFSMetadata = async (tokenURI) => {
        if (!tokenURI || !tokenURI.startsWith('ipfs://')) {
            console.error('Invalid tokenURI format:', tokenURI);
            return {};
        }
        try {
            const ipfsHash = tokenURI.replace('ipfs://', '');
            const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching IPFS metadata:", error);
            return {};
        }
    };

    const buyNFT = async (nft) => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(NFTMarketplace_ADDRESS, NFTMarketplace_ABI, signer);

            const price = ethers.parseEther(ethers.formatEther(nft.price));

            const voucher = {
                tokenId: nft.id,
                tokenURI: nft.tokenURI,
                price: price,
                creator: nft.creator,
                signature: nft.signature
            };

            const tx = await contract.lazyMintNFT(voucher, { value: price });
            await tx.wait();

            console.log("NFT purchased successfully!");

            // Remove the purchased NFT from local storage
            const lazyMintedNFTs = getLazyMintedNFTs().filter(item => item.id !== nft.id);
            localStorage.setItem('lazyMintedNFTs', JSON.stringify(lazyMintedNFTs));

            fetchAllNFTs();
        } catch (error) {
            console.error("Error buying NFT:", error);
            setError("Failed to buy NFT. Please try again.");
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
                                    image={nft.image ? nft.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') : ''}
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
                                            {ethers.formatEther(nft.price)} ETH
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        {nft.description}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Creator: {nft.creator.slice(0, 6)}...{nft.creator.slice(-4)}
                                    </Typography>
                                    <Typography variant="body2" color={nft.isLazyMinted ? "success.main" : "info.main"} sx={{ mt: 1 }}>
                                        {nft.isLazyMinted ? "Lazy Minted" : "On-Chain"}
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                        sx={{ mt: 2 }}
                                        onClick={() => buyNFT(nft)}
                                        disabled={nft.creator.toLowerCase() === account.toLowerCase() || !nft.isLazyMinted}
                                    >
                                        {nft.creator.toLowerCase() === account.toLowerCase()
                                            ? 'You created this NFT'
                                            : nft.isLazyMinted
                                                ? 'Buy NFT'
                                                : 'Already Purchased'}
                                    </Button>
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
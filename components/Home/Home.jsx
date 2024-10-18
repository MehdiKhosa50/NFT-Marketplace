import React, { useEffect, useState, useContext } from 'react';
import { ethers } from 'ethers';
import { NFTContext } from '../../context/NFTContext';
import { NFTMarketplace_ADDRESS, NFTMarketplace_ABI } from '../../constant';
import { Container, Grid, Card, CardMedia, CardContent, Typography, Box, Button, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';

const Home = () => {
    const { account } = useContext(NFTContext);
    const [nfts, setNFTs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (account) {
            fetchAllNFTs();
        }
    }, [account]);

    const fetchAllNFTs = async () => {
        try {
            console.log("fetchAllNFTs called");
            if (!account) return;
            setLoading(true);
            setError(null);

            const onChainNFTs = await fetchOnChainNFTs();
            const lazyMintedNFTs = getLazyMintedNFTs();

            const allNFTs = [...onChainNFTs, ...lazyMintedNFTs];

            // Filter out expired NFTs and NFTs with missing data
            const currentTime = Math.floor(Date.now() / 1000);
            const validNFTs = allNFTs.filter(nft =>
                (!nft.expirationTime || nft.expirationTime > currentTime) &&
                nft.image && nft.name && nft.price
            );

            setNFTs(validNFTs);

            // Update local storage for lazy minted NFTs
            const validLazyMintedNFTs = lazyMintedNFTs.filter(nft =>
                (!nft.expirationTime || nft.expirationTime > currentTime) &&
                nft.image && nft.name && nft.price
            );
            localStorage.setItem('lazyMintedNFTs', JSON.stringify(validLazyMintedNFTs));

        } catch (error) {
            console.error("Error fetching NFTs:", error);
            setError("Failed to fetch NFTs. " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const getLazyMintedNFTs = () => {
        const storedNFTs = localStorage.getItem('lazyMintedNFTs');
        return storedNFTs ? JSON.parse(storedNFTs).map(nft => ({ ...nft, isLazyMinted: true })) : [];
    };

    const fetchOnChainNFTs = async () => {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(NFTMarketplace_ADDRESS, NFTMarketplace_ABI, provider);

        const totalSupply = await contract.getNextTokenId();
        const nftPromises = [];

        for (let i = 1; i < totalSupply; i++) {
            nftPromises.push(fetchNFTData(i, contract));
        }

        const nftData = await Promise.all(nftPromises);
        return nftData.filter(nft => nft !== null);
    };

    const fetchNFTData = async (tokenId, contract) => {
        try {
            const owner = await contract.ownerOf(tokenId);
            if (owner === ethers.ZeroAddress) return null;

            const isCanceled = await contract.canceledListings(tokenId);
            if (isCanceled) return null;

            const tokenURI = await contract.tokenURI(tokenId);
            const metadata = await fetchIPFSMetadata(tokenURI);

            // Return null if essential data is missing
            if (!metadata.image || !metadata.name || !metadata.price) {
                console.log(`Incomplete metadata for token ${tokenId}, skipping.`);
                return null;
            }

            return {
                id: tokenId.toString(),
                tokenURI,
                price: metadata.price || '0',
                creator: metadata.creator || owner,
                name: metadata.name,
                description: metadata.description || '',
                image: metadata.image,
                expirationTime: metadata.expirationTime || null,
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
            
            const price = BigInt(nft.price);
    
            console.log("NFT details:", nft);
            console.log("Price in wei:", price.toString());
    
            if (!nft.signature) {
                throw new Error("Signature not found for this NFT");
            }
    
            // Reconstruct the voucher
            const voucher = {
                tokenId: nft.id || 1,
                tokenURI: nft.tokenURI,
                price: price,
                creator: nft.creator,
                expirationTime: BigInt(nft.expirationTime)
            };
    
            console.log("Reconstructed voucher:", voucher);
    
            // Recreate the message that was signed
            const domain = {
                name: 'NFTMarketplace',
                version: '1',
                chainId: await provider.getNetwork().then(network => network.chainId),
                verifyingContract: NFTMarketplace_ADDRESS
            };
    
            console.log("Domain:", domain);
    
            const types = {
                LazyMint: [
                    { name: 'tokenId', type: 'uint256' },
                    { name: 'tokenURI', type: 'string' },
                    { name: 'price', type: 'uint256' },
                    { name: 'creator', type: 'address' },
                    { name: 'expirationTime', type: 'uint256' }
                ]
            };
    
            console.log("Types:", types);
    
            // Verify the signature
            const recoveredAddress = ethers.verifyTypedData(domain, types, voucher, nft.signature);
            // await contract.setMinter(recoveredAddress);
            console.log("Recovered address:", recoveredAddress);
            console.log("Creator address:", nft.creator);
    
            // Use the recovered address instead of the creator's address
            const voucherWithSignature = {
                ...voucher,
                creator: recoveredAddress,  // Use the recovered address here
                signature: nft.signature
            };
    
            console.log("Voucher with signature:", voucherWithSignature);
    
            // Estimate gas
            const gasEstimate = await contract.lazyMintNFT.estimateGas(voucherWithSignature, { value: price });
            console.log("Estimated gas:", gasEstimate.toString());
    
            const gasLimit = gasEstimate * BigInt(120) / BigInt(100);
    
            const tx = await contract.lazyMintNFT(voucherWithSignature, {
                value: price,
                gasLimit: gasLimit
            });
    
            console.log("Transaction details:", tx.hash);
            await tx.wait();
    
            console.log("NFT purchased successfully!");
            await fetchAllNFTs(); // Refresh the NFT list
        } catch (error) {
            console.error("Error buying NFT:", error);
            if (error.reason) {
                console.error("Error reason:", error.reason);
            }
            // Show an error message to the user
            setError("Failed to buy NFT: " + (error.reason || error.message));
        }
    };

    return (
        <Container>
            <Typography variant="h4" sx={{ mt: 4, mb: 3 }}>NFT Marketplace</Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
            )}

            {loading ? (
                <CircularProgress />
            ) : nfts.length > 0 ? (
                <Grid container spacing={3}>
                    {nfts.map((nft, index) => (
                        <Grid item xs={12} sm={6} md={4} key={`${nft.id}-${nft.isLazyMinted ? 'lazy' : 'onchain'}-${index}`}>
                            <Card>
                                <CardMedia
                                    component="img"
                                    height="250"
                                    image={nft.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}
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
                                    {nft.expirationTime && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                            Expires: {new Date(nft.expirationTime * 1000).toLocaleString()}
                                        </Typography>
                                    )}
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                        sx={{ mt: 2 }}
                                        onClick={() => buyNFT(nft)}
                                        disabled={nft.creator.toLowerCase() === account.toLowerCase() || !nft.isLazyMinted}
                                    >
                                        {nft.creator.toLowerCase() === account.toLowerCase()
                                            ? 'Your NFT'
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
                <Typography>No valid NFTs available at the moment.</Typography>
            )}
        </Container>
    );
};

export default Home;
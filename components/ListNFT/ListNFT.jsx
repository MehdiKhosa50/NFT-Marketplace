import React, { useState, useEffect, useContext, useCallback } from 'react';
import { ethers } from 'ethers';
import { Button, TextField, Typography, Box, CircularProgress, Grid, Card, CardContent, CardMedia } from '@mui/material';
import { MarketPlace_ADDRESS, MarketPlace_ABI, SimpleNFT_ADDRESS, SimpleNFT_ABI } from '../../constant';
import { NFTContext } from '../../context/NFTContext';

const ListNFT = () => {
    const { account } = useContext(NFTContext);
    const [marketplaceContract, setMarketplaceContract] = useState(null);
    const [nftContract, setNftContract] = useState(null);
    const [userNFTs, setUserNFTs] = useState([]);
    const [selectedNFT, setSelectedNFT] = useState(null);
    const [price, setPrice] = useState('');
    const [deadline, setDeadline] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const initContracts = useCallback(async () => {
        if (account && window.ethereum) {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();

                const marketplace = new ethers.Contract(MarketPlace_ADDRESS, MarketPlace_ABI, signer);
                setMarketplaceContract(marketplace);

                const nft = new ethers.Contract(SimpleNFT_ADDRESS, SimpleNFT_ABI, signer);
                setNftContract(nft);
            } catch (error) {
                console.error("Error initializing contracts:", error);
                setError("Failed to initialize contracts. " + error.message);
            }
        } else {
            setError("Please connect your wallet to continue.");
        }
    }, [account]);

    const fetchUserNFTs = useCallback(async () => {
        if (!nftContract || !account) {
            setError("Unable to fetch NFTs. Please ensure your wallet is connected.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const balance = await nftContract.balanceOf(account);
            console.log("NFT balance:", balance.toString()); // Log balance

            const nfts = [];
            for (let i = 0; i < balance; i++) {
                const tokenId = await nftContract.tokenOfOwnerByIndex(account, i);
                console.log("Token ID:", tokenId.toString()); // Log token ID

                const tokenURI = await nftContract.tokenURI(tokenId);
                console.log("Token URI:", tokenURI); // Log token URI

                const metadata = await fetch(tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'))
                    .then(res => res.json());
                nfts.push({
                    tokenId: tokenId.toString(),
                    ...metadata,
                    image: metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
                });
            }
            setUserNFTs(nfts);
        } catch (error) {
            console.error("Error fetching user NFTs:", error);
            setError("Failed to fetch NFTs. " + error.message);
        } finally {
            setLoading(false);
        }
    }, [nftContract, account]);


    useEffect(() => {
        initContracts();
    }, [initContracts]);

    useEffect(() => {
        if (nftContract && account) {
            fetchUserNFTs();
        }
    }, [nftContract, account, fetchUserNFTs]);


    const listNFT = async () => {
        if (!marketplaceContract || !nftContract || !selectedNFT || !price || !deadline) return;
        setLoading(true);
        try {
            const approveTx = await nftContract.approve(MarketPlace_ADDRESS, selectedNFT.tokenId);
            await approveTx.wait();

            const priceInWei = ethers.parseEther(price);
            const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);

            const nonce = await marketplaceContract.getNonce(account);

            const provider = new ethers.BrowserProvider(window.ethereum);
            
            const domain = {
                name: "NFTMarketplace",
                version: "1",
                chainId: await provider.getNetwork().then(network => network.chainId),
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
                tokenId: selectedNFT.tokenId,
                price: priceInWei,
                seller: account,
                nonce: nonce,
                deadline: deadlineTimestamp
            };

            const signer = await marketplaceContract.signer;
            const signature = await signer.signTypedData(domain, types, value);

            const listingTx = await marketplaceContract.listNFTWithSignature(
                SimpleNFT_ADDRESS,
                selectedNFT.tokenId,
                priceInWei,
                deadlineTimestamp,
                signature
            );
            await listingTx.wait();

            console.log("NFT listed successfully!");
            setSelectedNFT(null);
            setPrice('');
            setDeadline('');
            await fetchUserNFTs();
        } catch (error) {
            console.error("Error listing NFT:", error);
            setError("Failed to list NFT. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 3 }}>
            <Typography variant="h4" gutterBottom>List Your NFT</Typography>
            <Button onClick={fetchUserNFTs} variant="contained" color="secondary" sx={{ mb: 2 }}>
                Refresh NFTs
            </Button>

            {loading ? (
                <CircularProgress />
            ) : error ? (
                <Typography color="error">{error}</Typography>
            ) : userNFTs.length > 0 ? (
                <Grid container spacing={2}>
                    {userNFTs.map((nft) => (
                        <Grid item xs={12} sm={6} md={4} key={nft.tokenId}>
                            <Card
                                onClick={() => setSelectedNFT(nft)}
                                sx={{ cursor: 'pointer', border: selectedNFT?.tokenId === nft.tokenId ? '2px solid blue' : 'none' }}
                            >
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
                                    <Typography variant="body2" color="text.secondary">
                                        Token ID: {nft.tokenId}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Typography>You don't have any NFTs to list.</Typography>
            )}

            {selectedNFT && (
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom>List Selected NFT</Typography>
                    <TextField
                        label="Price (ETH)"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        fullWidth
                        margin="normal"
                        type="number"
                    />
                    <TextField
                        label="Listing Deadline"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        fullWidth
                        margin="normal"
                        type="datetime-local"
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={listNFT}
                        fullWidth
                        sx={{ mt: 2 }}
                        disabled={loading || !selectedNFT || !price || !deadline}
                    >
                        {loading ? <CircularProgress size={24} /> : 'List NFT'}
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default ListNFT;
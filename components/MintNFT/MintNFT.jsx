import React, { useState, useContext, useEffect } from 'react';
import { Button, TextField, Typography, Box, CircularProgress } from '@mui/material';
import { NFTContext } from '../../context/NFTContext';
import axios from 'axios';
import Image from 'next/image';
import { ethers } from 'ethers';
import { NFTMarketplace_ADDRESS, NFTMarketplace_ABI } from '../../constant';

const LazyMintNFT = () => {
    const { account } = useContext(NFTContext);
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [nextTokenId, setNextTokenId] = useState(0);

    useEffect(() => {
        const storedNextTokenId = localStorage.getItem('nextTokenId');
        if (storedNextTokenId) {
            setNextTokenId(Number(storedNextTokenId));
        }
    }, []);

    useEffect(() => {
        const fetchNextTokenId = async () => {
            if (account) {
                try {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const contract = new ethers.Contract(NFTMarketplace_ADDRESS, NFTMarketplace_ABI, provider);
                    const tokenId = await contract.getNextTokenId();
                    setNextTokenId(Number(tokenId));
                } catch (error) {
                    console.error("Error fetching next token ID:", error);
                }
            }
        };
        fetchNextTokenId();
    }, [account]);

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        setFile(selectedFile);
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
    };

    const uploadToPinata = async () => {
        if (!file) return null;
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'pinata_api_key': 'b6716659c926343c681a',
                    'pinata_secret_api_key': '43e1f90d6ffa1c4b4f1a43a9fadfb1bd1f74da38af9cb1d9d47843ab242958bc'
                }
            });

            const imgHash = response.data.IpfsHash;

            const metadataResponse = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
                name,
                description,
                image: `ipfs://${imgHash}`,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'pinata_api_key': 'b6716659c926343c681a',
                    'pinata_secret_api_key': '43e1f90d6ffa1c4b4f1a43a9fadfb1bd1f74da38af9cb1d9d47843ab242958bc'
                },
            });

            return metadataResponse.data.IpfsHash;
        } catch (error) {
            console.error('Error uploading to Pinata:', error);
            return null;
        }
    };

    const lazyMintNFT = async () => {
        if (!file || !name || !description || !price) return;
        setLoading(true);
        try {
            const metadataHash = await uploadToPinata();
            if (!metadataHash) throw new Error('Failed to upload to IPFS');

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            const contract = new ethers.Contract(NFTMarketplace_ADDRESS, NFTMarketplace_ABI, signer);

            const tokenId = ethers.getBigInt(nextTokenId);
            const priceInWei = ethers.parseEther(price);

            const chainId = await provider.getNetwork().then(network => network.chainId);

            const domain = {
                name: "NFTMarketplace",
                version: "1",
                chainId: chainId,
                verifyingContract: NFTMarketplace_ADDRESS
            };

            const types = {
                LazyMint: [
                    { name: "tokenId", type: "uint256" },
                    { name: "tokenURI", type: "string" },
                    { name: "price", type: "uint256" },
                    { name: "creator", type: "address" }
                ]
            };

            const creatorAddress = await signer.getAddress();

            const value = {
                tokenId: tokenId,
                tokenURI: `ipfs://${metadataHash}`,
                price: priceInWei,
                creator: creatorAddress
            };

            const signature = await signer.signTypedData(domain, types, value);

            // Here, you would typically send this data to your backend or store it
            console.log("Lazy Mint Data:", {
                tokenId: tokenId.toString(),
                tokenURI: `ipfs://${metadataHash}`,
                price: priceInWei.toString(),
                creator: creatorAddress,
                signature: signature
            });

            // For demonstration, we're just logging. In a real app, you'd save this data.
            console.log("NFT lazy minted successfully!");

            const lazyMintedNFTs = JSON.parse(localStorage.getItem('lazyMintedNFTs')) || [];
            lazyMintedNFTs.push({
                id: tokenId.toString(), // Convert BigInt to string
                tokenURI: `ipfs://${metadataHash}`,
                price: priceInWei.toString(), // Convert BigInt to string
                creator: creatorAddress,
                signature: signature,
            });
            localStorage.setItem('lazyMintedNFTs', JSON.stringify(lazyMintedNFTs));

            setNextTokenId(nextTokenId + 1);
            localStorage.setItem('nextTokenId', nextTokenId + 1);
        } catch (error) {
            console.error("Error lazy minting NFT:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 3 }}>
            <Typography variant="h4" gutterBottom>Lazy Mint Your NFT</Typography>

            <TextField
                label="NFT Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                margin="normal"
            />

            <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={4}
                margin="normal"
            />

            <TextField
                label="Price (ETH)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                fullWidth
                type="number"
                margin="normal"
            />

            <input
                accept="image/*"
                type="file"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="nft-image-upload"
            />
            <label htmlFor="nft-image-upload">
                <Button variant="contained" component="span" fullWidth sx={{ mt: 2 }}>
                    Upload Image
                </Button>
            </label>

            {previewUrl && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Image
                        src={previewUrl}
                        alt="NFT Preview"
                        width={500}
                        height={300}
                    />
                </Box>
            )}

            <Button
                variant="contained"
                color="primary"
                onClick={lazyMintNFT}
                fullWidth
                sx={{ mt: 3 }}
                disabled={loading || !file || !name || !description || !price}
            >
                {loading ? <CircularProgress size={24} /> : 'Lazy Mint NFT'}
            </Button>

            <Typography variant="h6" sx={{ mt: 2 }}>
                Next Token ID: {nextTokenId}
            </Typography>
        </Box>
    );
};

export default LazyMintNFT;



import React, { useState, useContext } from 'react';
import { Button, TextField, Typography, Box, CircularProgress, Snackbar } from '@mui/material';
import { NFTContext } from '../../context/NFTContext';
import axios from 'axios';
import Image from 'next/image';
import { ethers } from 'ethers';
import { NFTMarketplace_ADDRESS, NFTMarketplace_ABI } from '../../constant';

const MintNFT = () => {
    const { account } = useContext(NFTContext);
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        setFile(selectedFile);
        console.log("Selected file: ", selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
    };

    const uploadToPinata = async () => {
        if (!file) return null;
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'pinata_api_key': '4617d86f48917c7684bb',
                    'pinata_secret_api_key': '36ba99ab9e33c6e030c8c3ff6146f01aa7cb8b55031650855f81d403770eb4b0'
                }
            });

            const imgHash = response.data.IpfsHash;
            console.log('Image hash:', imgHash);

            const metadataResponse = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
                name,
                description,
                image: `ipfs://${imgHash}`,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'pinata_api_key': '4617d86f48917c7684bb',
                    'pinata_secret_api_key': '36ba99ab9e33c6e030c8c3ff6146f01aa7cb8b55031650855f81d403770eb4b0'
                },
            });

            return metadataResponse.data.IpfsHash;
        } catch (error) {
            console.error('Error uploading to Pinata:', error);
            return null;
        }
    };

    const lazyMintNFT = async () => {
        if (!file || !name || !description || !price || !account || !expirationDate) {
            showSnackbar('Please fill all fields and connect your wallet', 'warning');
            return;
        }
        setLoading(true);
        try {
            const metadataHash = await uploadToPinata();
            if (!metadataHash) throw new Error('Failed to upload to IPFS');

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(NFTMarketplace_ADDRESS, NFTMarketplace_ABI, signer);

            const tokenId = await contract.getNextTokenId();
            const priceInWei = ethers.parseEther(price);
            const expirationTime = Math.floor(new Date(expirationDate).getTime() / 1000);

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
                    { name: "creator", type: "address" },
                    { name: "expirationTime", type: "uint256" }
                ]
            };

            const value = {
                tokenId: tokenId,
                tokenURI: `ipfs://${metadataHash}`,
                price: priceInWei,
                creator: account,
                expirationTime: expirationTime
            };

            const signature = await signer.signTypedData(domain, types, value);

            console.log("Token ID: ", tokenId);
            console.log("Domain: ", domain);
            console.log("Types: ", types);
            console.log("Value: ", value);
            console.log("Signature: ", signature);

            const lazyMintedNFTs = JSON.parse(localStorage.getItem('lazyMintedNFTs') || '[]');
            lazyMintedNFTs.push({
                id: tokenId.toString(),
                tokenURI: `ipfs://${metadataHash}`,
                price: priceInWei.toString(),
                creator: account,
                signature: signature,
                name,
                description,
                image: `ipfs://${metadataHash}`,
                expirationTime: expirationTime
            });
            localStorage.setItem('lazyMintedNFTs', JSON.stringify(lazyMintedNFTs));

            showSnackbar('NFT lazy minted successfully!', 'success');
            resetForm();
        } catch (error) {
            console.error("Error lazy minting NFT:", error);
            showSnackbar('Failed to lazy mint NFT', 'error');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFile(null);
        setPreviewUrl('');
        setName('');
        setDescription('');
        setPrice('');
        setExpirationDate('');
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar({ ...snackbar, open: false });
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

            <TextField
                label="Expiration Date"
                type="datetime-local"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{
                    shrink: true,
                }}
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
                        width={300}
                        height={300}
                        objectFit="contain"
                    />
                </Box>
            )}

            <Button
                variant="contained"
                color="primary"
                onClick={lazyMintNFT}
                fullWidth
                sx={{ mt: 3 }}
                disabled={loading || !file || !name || !description || !price || !account || !expirationDate}
            >
                {loading ? <CircularProgress size={24} /> : 'Lazy Mint NFT'}
            </Button>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                message={snackbar.message}
                severity={snackbar.severity}
            />
        </Box>
    );
};

export default MintNFT;
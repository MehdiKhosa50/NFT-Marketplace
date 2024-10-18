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
        setPreviewUrl(URL.createObjectURL(selectedFile));
    };

    const uploadToPinata = async (content, options = {}) => {
        try {
            let response;
            if (content instanceof File) {
                const formData = new FormData();
                formData.append('file', content);
                response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'pinata_api_key': '4617d86f48917c7684bb',
                        'pinata_secret_api_key': '36ba99ab9e33c6e030c8c3ff6146f01aa7cb8b55031650855f81d403770eb4b0'
                    }
                });
            } else {
                response = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', content, {
                    headers: {
                        'Content-Type': 'application/json',
                        'pinata_api_key': '4617d86f48917c7684bb',
                        'pinata_secret_api_key': '36ba99ab9e33c6e030c8c3ff6146f01aa7cb8b55031650855f81d403770eb4b0'
                    }
                });
            }
            return response.data.IpfsHash;
        } catch (error) {
            console.error('Error uploading to Pinata:', error);
            throw error;
        }
    };

    const lazyMintNFT = async () => {
        // if (!file || !name || !description || !price || !account || !expirationDate) {
        //     showSnackbar('Please fill all fields and connect your wallet', 'warning');
        //     return;
        // }
        setLoading(true);
        try {
            // const imageHash = await uploadToPinata(file);
            // if (!imageHash) throw new Error('Failed to upload image to IPFS');

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(NFTMarketplace_ADDRESS, NFTMarketplace_ABI, signer);

            // const tokenId = await contract.getNextTokenId();
            // const priceInWei = ethers.parseEther(price);
            // const expirationTime = Math.floor(new Date(expirationDate).getTime() / 1000);

            const chainId = await provider.getNetwork().then(network => network.chainId);

            const domain = {
                name: "LazyMint",
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

            // const tokenURI = `ipfs://${imageHash}`;

            // let voucher = {
            //     tokenId: tokenId.toString(),
            //     tokenURI: tokenURI,
            //     price: priceInWei.toString(),
            //     creator: account,
            //     expirationTime: expirationTime.toString()
            // };

            let voucher = {
                tokenId: 1,
                tokenURI: "ipfs://QmWpGWz9APcgfCjvoH9nHq8oD1e7pELzY4wPXvwxJdeBwD",
                price: ethers.parseEther("0.01"),
                creator: "0x01428254bacea6C2bE6e02e427E8624440Ec6146",
                expirationTime: 10000000000000
            };

            const signature = await signer.signTypedData(domain, types, voucher);

            const recoveredAddress = ethers.verifyTypedData(domain, types, voucher, signature);
            // await contract.setMinter(recoveredAddress);
            console.log("Recovered address:", recoveredAddress);

            voucher = {
                tokenId: 1,
                tokenURI: "ipfs://QmWpGWz9APcgfCjvoH9nHq8oD1e7pELzY4wPXvwxJdeBwD",
                price: ethers.parseEther("0.01"),
                creator: "0x01428254bacea6C2bE6e02e427E8624440Ec6146",
                expirationTime: 10000000000000,
                signature: signature
            };

            const tx = await contract.lazyMintNFT(voucher, {
                value: ethers.parseEther("0.01")
            });


            // // Create full metadata including voucher data and signature
            // const fullMetadata = {
            //     name,
            //     description,
            //     image: tokenURI,
            //     tokenId: tokenId.toString(),
            //     tokenURI: tokenURI,
            //     price: priceInWei.toString(),
            //     creator: account,
            //     expirationTime: expirationTime.toString(),
            //     signature: signature
            // };

            // const metadataHash = await uploadToPinata(fullMetadata);

            // const lazyMintedNFTs = JSON.parse(localStorage.getItem('lazyMintedNFTs') || '[]');
            // lazyMintedNFTs.push(fullMetadata);
            // localStorage.setItem('lazyMintedNFTs', JSON.stringify(lazyMintedNFTs));
            // showSnackbar('NFT lazy minted successfully!', 'success');
            // resetForm();
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
            // disabled={loading || !file || !name || !description || !price || !account || !expirationDate}
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
import React, { useState, useContext, useRef, useEffect } from 'react';
import { Button, TextField, Typography, Box, CircularProgress, Switch, FormControlLabel } from '@mui/material';
import { NFTContext } from '../../context/NFTContext';
import axios from 'axios';
import Image from 'next/image';
import { ethers } from 'ethers';
import { SimpleNFT_ADDRESS, SimpleNFT_ABI } from '../../constant';

const MintNFT = () => {
    const { account} = useContext(NFTContext);
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [useSignature, setUseSignature] = useState(false);
    const [nonce, setNonce] = useState(0);
    const tokenIdCounter = useRef(0);

    useEffect(() => {
        const fetchNonce = async () => {
            if (account) {
                try {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const contract = new ethers.Contract(SimpleNFT_ADDRESS, SimpleNFT_ABI, provider);
                    const userNonce = await contract.getNonce(account);
                    
                    // Log the returned userNonce
                    console.log("User Nonce:", userNonce);
    
                    // Check the type and convert accordingly
                    if (typeof userNonce === 'object' && userNonce._isBigNumber) {
                        setNonce(userNonce.toNumber()); // If it's a BigNumber
                    } else {
                        setNonce(Number(userNonce)); // If it's a number or string
                    }
                } catch (error) {
                    console.error("Error fetching nonce:", error);
                }
            }
        };
        fetchNonce();
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

    const mintNFT = async () => {
        if (!file || !name || !description) return;
        setLoading(true);
        try {
            const metadataHash = await uploadToPinata();
            if (!metadataHash) throw new Error('Failed to upload to IPFS');
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const nftContract = new ethers.Contract(SimpleNFT_ADDRESS, SimpleNFT_ABI, signer);
            
            const tokenId = tokenIdCounter.current;
            tokenIdCounter.current += 1;
            
            if (useSignature) {
                const chainId = await provider.getNetwork().then(network => network.chainId);
                const domain = {
                    name: "MyToken",
                    version: "1",
                    chainId: chainId,
                    verifyingContract: SimpleNFT_ADDRESS
                };
                const types = {
                    Mint: [
                        { name: "to", type: "address" },
                        { name: "tokenId", type: "uint256" },
                        { name: "uri", type: "string" },
                        { name: "nonce", type: "uint256" }
                    ]
                };
                const value = {
                    to: account,
                    tokenId: tokenId,
                    uri: `ipfs://${metadataHash}`,
                    nonce: nonce
                };
                
                const signature = await signer.signTypedData(domain, types, value);
                
                const mintTx = await nftContract.mintWithSignature(account, tokenId, `ipfs://${metadataHash}`, signature);
                await mintTx.wait();
            } else {
                const mintTx = await nftContract.safeMint(account, tokenId, `ipfs://${metadataHash}`);
                await mintTx.wait();
            }

            console.log("NFT minted successfully!");
            setNonce(nonce + 1);
        } catch (error) {
            console.error("Error minting NFT:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 3 }}>
            <Typography variant="h4" gutterBottom>Mint Your NFT</Typography>

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

            <FormControlLabel
                control={
                    <Switch
                        checked={useSignature}
                        onChange={(e) => setUseSignature(e.target.checked)}
                        name="useSignature"
                    />
                }
                label="Use Signature for Minting"
            />

            <Button
                variant="contained"
                color="primary"
                onClick={mintNFT}
                fullWidth
                sx={{ mt: 3 }}
                disabled={loading || !file || !name || !description}
            >
                {loading ? <CircularProgress size={24} /> : 'Mint NFT'}
            </Button>

            <Typography variant="body2" sx={{ mt: 2 }}>
                Current Nonce: {nonce}
            </Typography>
        </Box>
    );
};

export default MintNFT;
import { useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';
import { Button, TextField, Typography, Box, CircularProgress } from '@mui/material';
import { MarketPlace_ADDRESS, MarketPlace_ABI } from '../../constant';
import { NFTContext } from '../../context/NFTContext';
import axios from 'axios';
import Image from 'next/image';

const SimpleNFT_ADDRESS = "0xaFEFeD1Dee4259eE87aF49D2ceaeE50cF605a3dE";
const SimpleNFT_ABI = [
    "function mint(address to, string memory uri) external",
    "function approve(address to, uint256 tokenId) external",
    "function nextTokenId() external view returns (uint256)"
];

const ListNFT = () => {
    const { account } = useContext(NFTContext);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [marketplaceContract, setMarketplaceContract] = useState(null);
    const [nftContract, setNftContract] = useState(null);
    const [price, setPrice] = useState('');
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (account && typeof window.ethereum !== 'undefined') {
            const tempProvider = new ethers.providers.Web3Provider(window.ethereum);
            setProvider(tempProvider);            
            const tempSigner = tempProvider.getSigner();
            setSigner(tempSigner);
            
            try {
                const marketplace = new ethers.Contract(MarketPlace_ADDRESS, MarketPlace_ABI, tempSigner);
                setMarketplaceContract(marketplace);
                const nft = new ethers.Contract(SimpleNFT_ADDRESS, SimpleNFT_ABI, tempSigner);
                setNftContract(nft);
            } catch (error) {
                console.error("Error initializing contracts:", error);
            }
        }
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
                    'pinata_api_key': 'Your Pinata API Key',
                    'pinata_secret_api_key': 'Your Pinata Secret API Key',
                },
            });

            const imgHash = response.data.IpfsHash;

            const metadataResponse = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
                name,
                description,
                image: `ipfs://${imgHash}`,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'pinata_api_key': 'Your Pinata API Key',
                    'pinata_secret_api_key': 'Your Pinata Secret API Key',
                },
            });

            return metadataResponse.data.IpfsHash;
        } catch (error) {
            console.error('Error uploading to Pinata:', error);
            return null;
        }
    };

    const listNFT = async () => {
        if (!marketplaceContract || !nftContract || !file || !price || !name || !description) return;
        setLoading(true);
        try {
            const metadataHash = await uploadToPinata();
            if (!metadataHash) throw new Error('Failed to upload to IPFS');

            const mintTx = await nftContract.mint(account, `ipfs://${metadataHash}`);
            const mintReceipt = await mintTx.wait();
            if (!mintReceipt) throw new Error('Failed to mint NFT');
            
            const tokenId = await nftContract.nextTokenId() - 1;
            
            const approveTx = await nftContract.approve(MarketPlace_ADDRESS, tokenId);
            await approveTx.wait();

            const listingTx = await marketplaceContract.listNFT(
                SimpleNFT_ADDRESS,
                tokenId,
                ethers.utils.parseEther(price)
            );
            await listingTx.wait();

            console.log("NFT listed successfully!");
        } catch (error) {
            console.error("Error listing NFT:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 3 }}>
            <Typography variant="h4" gutterBottom>List Your NFT</Typography>

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
                margin="normal"
                type="number"
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
                    height={300} />
                </Box>
            )}

            <Button
                variant="contained"
                color="primary"
                onClick={listNFT}
                fullWidth
                sx={{ mt: 3 }}
                disabled={loading || !file || !price || !name || !description}
            >
                {loading ? <CircularProgress size={24} /> : 'List NFT'}
            </Button>
        </Box>
    );
};

export default ListNFT;
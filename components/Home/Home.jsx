import React from 'react';
import NavBar from '../NavBar/NavBar';
import { Container, Grid, Card, CardMedia, CardContent, Typography, Box } from '@mui/material';

const nftData = [
    {
        id: 1,
        image: 'https://brown-left-fowl-93.mypinata.cloud/ipfs/QmWpGWz9APcgfCjvoH9nHq8oD1e7pELzY4wPXvwxJdeBwD',
        name: 'NFT Item 1',
        price: '0.5 ETH',
    },
    {
        id: 2,
        image: 'https://brown-left-fowl-93.mypinata.cloud/ipfs/Qmd9UynWVe8vWWuBzgCJ6E1shHPL1fTaRA9nVHg5BAyfTH',
        name: 'NFT Item 2',
        price: '0.75 ETH',
    },
    {
        id: 3,
        image: 'https://brown-left-fowl-93.mypinata.cloud/ipfs/QmUUmtBH1TehKecwBXTHFy8Rc911tRr2odpnrhd3MkUQYo',
        name: 'NFT Item 3',
        price: '1 ETH',
    },
];

const Home = () => {
    return (
        <Container>
            {/* Navigation Bar */}
            <NavBar />

            {/* Grid for NFT Items */}
            <Grid container spacing={3} sx={{ mt: 4 }}>
                {nftData.map((nft) => (
                    <Grid item xs={12} sm={6} md={4} key={nft.id}>
                        <Card>
                            <CardMedia
                                component="img"
                                alt={nft.name}
                                height="250"
                                image={nft.image}
                                sx={{ objectFit: 'cover' }}
                            />
                            <CardContent>
                                {/* Layout for Name and Price */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        backgroundColor: '#f5f5f5',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                                    }}
                                >
                                    <Typography variant="h6" component="div" sx={{ color: '#3f51b5' }}>
                                        {nft.name}
                                    </Typography>
                                    <Typography variant="body1" component="div" sx={{ color: '#e91e63', fontWeight: 'bold' }}>
                                        {nft.price}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
};

export default Home;
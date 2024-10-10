import React, { useContext, useState, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import Link from 'next/link';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';

import { NFTContext } from '../../context/NFTContext';

const NavBar = () => {
    const { account } = useContext(NFTContext);
    const connectButtonRef = useRef(null);

    return (
        <AppBar position="static" color="transparent" elevation={0}>
            <Container>
                <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        NFT MarketPlace
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: 2,
                            mt: 1,
                        }}
                    >
                        <Link href="/" passHref>
                            <Button variant="contained" color="primary" size="large" sx={{ mx: 1 }}>
                                List NFT
                            </Button>
                        </Link>
                        <Link href="/profile" passHref>
                            <Button variant="outlined" color="secondary" size="large" sx={{ mx: 1 }}>
                                Profile
                            </Button>
                        </Link>
                    </Box>
                    <Button color="primary" variant="contained">
                        <div ref={connectButtonRef}>
                            <ConnectButton />
                        </div>
                    </Button>
                </Toolbar>
            </Container>
        </AppBar>
    );
};

export default NavBar;
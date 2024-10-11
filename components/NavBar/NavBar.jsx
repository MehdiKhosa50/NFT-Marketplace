import React, { useContext } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { NFTContext } from '../../context/NFTContext';

const NavBar = () => {
    const { account } = useContext(NFTContext);
    const router = useRouter();

    const isActive = (pathname) => router.pathname === pathname;

    return (
        <AppBar position="static" color="default" elevation={1}>
            <Container>
                <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                    <Link href="/" passHref>
                        <Typography
                            variant="h6"
                            component="div"
                            sx={{
                                flexGrow: 1,
                                cursor: 'pointer',
                                color: 'primary.main',
                                fontWeight: 'bold'
                            }}
                        >
                            NFT Marketplace
                        </Typography>
                    </Link>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Link href="/" passHref>
                            <Button
                                color="inherit"
                                sx={{
                                    fontWeight: isActive('/') ? 'bold' : 'normal',
                                    borderBottom: isActive('/') ? 2 : 0,
                                    borderColor: 'primary.main',
                                    borderRadius: 0
                                }}
                            >
                                Marketplace
                            </Button>
                        </Link>

                        <Link href="/ListNFT" passHref>
                            <Button
                                color="inherit"
                                sx={{
                                    fontWeight: isActive('/ListNFT') ? 'bold' : 'normal',
                                    borderBottom: isActive('/ListNFT') ? 2 : 0,
                                    borderColor: 'primary.main',
                                    borderRadius: 0
                                }}
                            >
                                List NFT
                            </Button>
                        </Link>

                        {account && (
                            <Link href="/profile" passHref>
                                <Button
                                    color="inherit"
                                    sx={{
                                        fontWeight: isActive('/profile') ? 'bold' : 'normal',
                                        borderBottom: isActive('/profile') ? 2 : 0,
                                        borderColor: 'primary.main',
                                        borderRadius: 0
                                    }}
                                >
                                    My NFTs
                                </Button>
                            </Link>
                        )}

                        <Box sx={{ ml: 2 }}>
                            <ConnectButton />
                        </Box>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
};

export default NavBar;
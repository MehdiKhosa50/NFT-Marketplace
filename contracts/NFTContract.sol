// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is ERC721, EIP712, ReentrancyGuard, Ownable {
    using ECDSA for bytes32;

    bytes32 private constant MINTING_TYPEHASH =
        keccak256("LazyMint(uint256 tokenId,string tokenURI,address creator)");

    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool active;
    }

    struct LazyMintVoucher {
        uint256 tokenId;
        string tokenURI;
        address creator;
        bytes signature;
    }

    mapping(uint256 => Listing) private _listings;
    mapping(uint256 => LazyMintVoucher) private _lazyMintVouchers;
    mapping(address => uint256[]) private _sellerListings;
    mapping(uint256 => string) private _tokenURIs;

    uint256 private _nextTokenId;

    event NFTListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event NFTSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);

    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) EIP712(name, "1") Ownable(msg.sender) {}

    function isApprovedOrOwner(
        address spender,
        uint256 tokenId
    ) public view returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner ||
            isApprovedForAll(owner, spender) ||
            getApproved(tokenId) == spender);
    }

    function listNFT(uint256 tokenId, uint256 price) external {
        require(
            isApprovedOrOwner(_msgSender(), tokenId),
            "Not approved or owner"
        );
        require(price > 0, "Price must be greater than zero");

        _listings[tokenId] = Listing(tokenId, _msgSender(), price, true);
        _sellerListings[_msgSender()].push(tokenId);

        emit NFTListed(tokenId, _msgSender(), price);
    }

    function buyNFT(uint256 tokenId) external payable nonReentrant {
        Listing storage listing = _listings[tokenId];
        require(listing.active, "Listing is not active");
        require(msg.value >= listing.price, "Insufficient payment");

        address seller = listing.seller;
        uint256 price = listing.price;

        listing.active = false;

        _safeTransfer(seller, _msgSender(), tokenId, "");

        payable(seller).transfer(price);

        if (msg.value > price) {
            payable(_msgSender()).transfer(msg.value - price);
        }

        emit NFTSold(tokenId, seller, _msgSender(), price);
    }

    function cancelListing(uint256 tokenId) external {
        require(_listings[tokenId].seller == _msgSender(), "Not the seller");
        require(_listings[tokenId].active, "Listing is not active");

        delete _listings[tokenId];

        emit ListingCancelled(tokenId, _msgSender());
    }

    function getListing(
        uint256 tokenId
    ) external view returns (Listing memory) {
        return _listings[tokenId];
    }

    function getNextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    function getSellerListings(
        address seller
    ) external view returns (uint256[] memory) {
        return _sellerListings[seller];
    }

    function lazyMint(
        LazyMintVoucher calldata voucher
    ) external payable nonReentrant {
        require(msg.value > 0, "Payment required for minting");

        emit Debug(
            "LazyMint called",
            voucher.tokenId,
            voucher.tokenURI,
            voucher.creator,
            bytes32(voucher.signature)
        );

        require(_verify(voucher), "Invalid signature");

        _safeMint(voucher.creator, voucher.tokenId);
        _setTokenURI(voucher.tokenId, voucher.tokenURI);

        _lazyMintVouchers[voucher.tokenId] = voucher;

        if (voucher.tokenId >= _nextTokenId) {
            _nextTokenId = voucher.tokenId + 1;
        }

        // Transfer the minting fee to the contract owner
        payable(owner()).transfer(msg.value);
    }

    event Debug(
        string message,
        uint256 tokenId,
        string tokenURI,
        address creator,
        address recoveredSigner,
        bytes32 digest
    );

    event SignatureDebug(bytes32 digest, address signer, address creator);

    function _verify(LazyMintVoucher calldata voucher) internal returns (bool) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    MINTING_TYPEHASH,
                    voucher.tokenId,
                    keccak256(bytes(voucher.tokenURI)),
                    voucher.creator
                )
            )
        );

        address signer = ECDSA.recover(digest, voucher.signature);

        emit SignatureDebug(digest, signer, voucher.creator);

        return signer == voucher.creator;
    }
    event Debug(
        string message,
        uint256 tokenId,
        string tokenURI,
        address addr,
        bytes32 data
    );

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(
            _ownerOf(tokenId) != address(0),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory _tokenURI = _tokenURIs[tokenId];

        if (bytes(_tokenURI).length > 0) {
            return _tokenURI;
        }

        if (_lazyMintVouchers[tokenId].creator != address(0)) {
            return _lazyMintVouchers[tokenId].tokenURI;
        }

        return "";
    }

    function _setTokenURI(
        uint256 tokenId,
        string memory _tokenURI
    ) internal virtual {
        require(
            _ownerOf(tokenId) != address(0),
            "ERC721Metadata: URI set of nonexistent token"
        );
        _tokenURIs[tokenId] = _tokenURI;
    }

    function getDomainSeparator() public view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function getTypedDataHash(
        LazyMintVoucher calldata voucher
    ) public view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        MINTING_TYPEHASH,
                        voucher.tokenId,
                        keccak256(bytes(voucher.tokenURI)),
                        voucher.creator
                    )
                )
            );
    }
}
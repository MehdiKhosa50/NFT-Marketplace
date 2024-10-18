// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../node_modules/@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "../node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Libraries/Counters.sol";

contract NFTMarketplace is ERC721, EIP712, ReentrancyGuard, Ownable {
    using ECDSA for bytes32;
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    bytes32 private constant LAZY_MINT_TYPEHASH =
        keccak256("LazyMint(uint256 tokenId,string tokenURI,uint256 price,address creator,uint256 expirationTime)");
    bytes32 private constant CANCEL_LISTING_TYPEHASH =
        keccak256("CancelListing(uint256 tokenId,address creator)");

    struct LazyMintVoucher {
        uint256 tokenId;
        string tokenURI;
        uint256 price;
        address creator;
        uint256 expirationTime;
        bytes signature;
    }

    struct CancelListingVoucher {
        uint256 tokenId;
        address creator;
        bytes signature;
    }

    mapping(uint256 => string) private _tokenURIs;
    mapping(address => uint256[]) public sellerListings;
    mapping(uint256 => bool) public canceledListings;

    address public minter;

    event NFTLazyMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string tokenURI,
        uint256 price,
        uint256 expirationTime
    );
    event NFTSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );
    event ListingCanceled(uint256 indexed tokenId, address indexed creator);
    event Signer(address indexed signer);

    constructor(
        string memory name,
        string memory symbol,
        address _minter
    ) ERC721(name, symbol) EIP712(name, "1") Ownable(msg.sender) {
        minter = _minter;
    }

    function lazyMintNFT(LazyMintVoucher calldata voucher) external payable nonReentrant {
        require(msg.value >= voucher.price, "Insufficient payment");
     emit Signer(minter);
        require(_verify(voucher), "Invalid signature");
        require(block.timestamp <= voucher.expirationTime, "Voucher has expired");
        require(!canceledListings[voucher.tokenId], "Listing has been canceled");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, voucher.tokenURI);

        sellerListings[voucher.creator].push(newTokenId);

        payable(voucher.creator).transfer(voucher.price);

        if (msg.value > voucher.price) {
            payable(msg.sender).transfer(msg.value - voucher.price);
        }

        emit NFTLazyMinted(newTokenId, voucher.creator, voucher.tokenURI, voucher.price, voucher.expirationTime);
        emit NFTSold(newTokenId, voucher.creator, msg.sender, voucher.price);
    }

    function cancelListing(CancelListingVoucher calldata voucher) external {
        require(_verifyCancelListing(voucher), "Invalid signature");
        require(!canceledListings[voucher.tokenId], "Listing already canceled");

        canceledListings[voucher.tokenId] = true;

        emit ListingCanceled(voucher.tokenId, voucher.creator);
    }

    function _verify(LazyMintVoucher calldata voucher) internal view returns (bool) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    LAZY_MINT_TYPEHASH,
                    voucher.tokenId,
                    keccak256(bytes(voucher.tokenURI)),
                    voucher.price,
                    voucher.creator,
                    voucher.expirationTime
                )
            )
        );

        address signer = ECDSA.recover(digest, voucher.signature);
        
        return signer == minter;
    }

    function _verifyCancelListing(CancelListingVoucher calldata voucher) internal returns (bool) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    CANCEL_LISTING_TYPEHASH,
                    voucher.tokenId,
                    voucher.creator
                )
            )
        );

        address signer = ECDSA.recover(digest, voucher.signature);
       //return signer == minter || signer == owner();
        
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "ERC721Metadata: URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }

    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        require(ownerOf(tokenId) != address(0), "ERC721Metadata: URI set of nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }

    function getNextTokenId() external view returns (uint256) {
        return _tokenIds.current() + 1;
    }

    function getDomainSeparator() public view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function getTypedDataHash(LazyMintVoucher calldata voucher) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    LAZY_MINT_TYPEHASH,
                    voucher.tokenId,
                    keccak256(bytes(voucher.tokenURI)),
                    voucher.price,
                    voucher.creator,
                    voucher.expirationTime
                )
            )
        );
    }
    
    function getSellerListings(address seller) external view returns (uint256[] memory) {
        return sellerListings[seller];
    }

    function setMinter(address newMinter) external onlyOwner {
        minter = newMinter;
    }
}
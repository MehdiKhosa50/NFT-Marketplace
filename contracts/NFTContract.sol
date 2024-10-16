// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./Interfaces/IERC721.sol";
import "./Interfaces/IERC721Receiver.sol";
import "./Interfaces/IERC20.sol";

contract NFTMarketplace is EIP712, ReentrancyGuard, IERC721Receiver {
    using Counters for Counters.Counter;
    using ECDSA for bytes32;

    bytes32 private constant LISTING_TYPEHASH = keccak256(
        "Listing(address nftContract,uint256 tokenId,uint256 price,address seller,uint256 nonce,uint256 deadline)"
    );

    struct Listing {
        uint256 listingId;
        address nftContract;
        uint256 tokenId;
        address seller;
        uint256 price;
        uint256 deadline;
        bool isListed;
    }

    Counters.Counter private _listingIds;
    mapping(uint256 => Listing) public listings;
    mapping(address => mapping(uint256 => uint256)) public tokenIdToListingId;
    mapping(address => uint256[]) public sellerListings;
    mapping(address => uint256) private _nonces;
    uint256[] public allListingIds;

    event NFTListed(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller, uint256 price, uint256 deadline);
    event NFTSold(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller, address buyer, uint256 price);
    event ListingCanceled(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller);

    constructor() EIP712("NFTMarketplace", "1") {}

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function listNFTWithSignature(
        address _nftContract, 
        uint256 _tokenId, 
        uint256 _price,
        uint256 _deadline,
        bytes memory _signature
    ) external nonReentrant {
        require(_price > 0, "Price must be greater than 0");
        require(_deadline > block.timestamp, "Deadline must be in the future");

        bytes32 structHash = keccak256(abi.encode(
            LISTING_TYPEHASH,
            _nftContract,
            _tokenId,
            _price,
            msg.sender,
            _nonces[msg.sender],
            _deadline
        ));

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(_signature);
        require(signer == msg.sender, "Invalid signature");

        IERC721 nftContract = IERC721(_nftContract);
        require(nftContract.ownerOf(_tokenId) == msg.sender, "Not the owner");

        nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);

        _listingIds.increment();
        uint256 listingId = _listingIds.current();

        listings[listingId] = Listing(
            listingId,
            _nftContract,
            _tokenId,
            msg.sender,
            _price,
            _deadline,
            true
        );

        tokenIdToListingId[_nftContract][_tokenId] = listingId;
        sellerListings[msg.sender].push(listingId);
        allListingIds.push(listingId);

        _nonces[msg.sender]++;

        emit NFTListed(listingId, _nftContract, _tokenId, msg.sender, _price, _deadline);
    }

    function buyNFT(uint256 _listingId) external payable nonReentrant {
        Listing storage listing = listings[_listingId];
        require(listing.isListed, "NFT not listed");
        require(msg.value >= listing.price, "Insufficient payment");
        require(block.timestamp <= listing.deadline, "Listing has expired");

        listing.isListed = false;
        IERC721(listing.nftContract).safeTransferFrom(address(this), msg.sender, listing.tokenId);

        payable(listing.seller).transfer(listing.price);

        emit NFTSold(_listingId, listing.nftContract, listing.tokenId, listing.seller, msg.sender, listing.price);
    }

    function cancelListing(uint256 _listingId) external nonReentrant {
        Listing storage listing = listings[_listingId];
        require(listing.isListed, "NFT not listed");
        require(listing.seller == msg.sender, "Not the seller");

        listing.isListed = false;
        IERC721(listing.nftContract).safeTransferFrom(address(this), msg.sender, listing.tokenId);

        emit ListingCanceled(_listingId, listing.nftContract, listing.tokenId, msg.sender);
    }

    function getNonce(address user) external view returns (uint256) {
        return _nonces[user];
    }

    function getListingDetails(uint256 _listingId) external view returns (Listing memory) {
        return listings[_listingId];
    }

    function getSellerListings(address seller) public view returns (uint256[] memory) {
        return sellerListings[seller];
    }

    function getAllListingIds() public view returns (uint256[] memory) {
        return allListingIds;
    }
}


// I Want you to write an NFT MarketPlace Contract which should be fully functional and secure.
// The contract should support the following functionalities:
// 1. List an NFT for sale
// 2. Buy an NFT
// 3. Cancel a listing
// 4. Get listing details
// 5. Get all listings
// 6. Get all listings for a seller
// It should be fully implementation of EIP712 with Lazy Minting!
// When user mints an NFT, We have to store it's metamadata signature and every other thing which
// is complasory for an functionality. of EIP712 and Lazy Minting. But it should be truely Lazy Minting.
// The user who mints it he actually uploaded the data but the person who buys it will pay the fee for minting and buying i mean actual minting will be happened then. I hope you understand!
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Interfaces/IERC721.sol";
import "./Interfaces/IERC721Receiver.sol";
import "./Interfaces/IERC20.sol";

contract NFTMarketplace {
    // Counter for unique ID
    struct Counter {
        uint256 value;
    }
    
    Counter private _listingIds;
    
    function increment(Counter storage counter) internal {
        counter.value += 1;
    }
    
    function current(Counter storage counter) internal view returns (uint256) {
        return counter.value;
    }

    // Struct to store listed NFT details
    struct Listing {
        uint256 listingId;
        address nftContract;
        uint256 tokenId;
        address seller;
        uint256 price;
        bool isListed;
    }

    // Mapping to store listed data
    mapping(uint256 => Listing) public listings;
    mapping(address => mapping(uint256 => uint256)) public tokenIdToListingId;
    mapping(address => uint256[]) public sellerListings;
    
    uint256[] public allListingIds;
    
    // ReentrancyGuard: To prevent attacks
    bool private _locked;
    
    modifier nonReentrant() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }
    
    // Events to display logs on Blockchain
    event NFTListed(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller, uint256 price);
    event NFTSold(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller, address buyer, uint256 price);
    event ListingCanceled(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller);
    
    // To get Onwership of an NFT
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual returns (bytes4) {
        return this.onERC721Received.selector;
    }
    
    // List NFT
    function listNFT(address _nftContract, uint256 _tokenId, uint256 _price) external nonReentrant {
        require(_price > 0, "Price must be greater than 0");
        
        IERC721 nftContract = IERC721(_nftContract);
        require(nftContract.ownerOf(_tokenId) == msg.sender, "Not the owner");

        nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);

        increment(_listingIds);
        uint256 listingId = current(_listingIds);

        listings[listingId] = Listing(
            listingId,
            _nftContract,
            _tokenId,
            msg.sender,
            _price,
            true
        );

        tokenIdToListingId[_nftContract][_tokenId] = listingId;
        sellerListings[msg.sender].push(listingId);
        allListingIds.push(listingId);

        emit NFTListed(listingId, _nftContract, _tokenId, msg.sender, _price);
    }

    // Buy NFT
    function buyNFT(uint256 _listingId, address _paymentToken, uint256 _amount) external payable nonReentrant {
    Listing storage listing = listings[_listingId];
    require(listing.isListed, "Listing is not active");
    require(msg.sender != listing.seller, "Seller cannot buy their own NFT");

    // Payment in ERC20 tokens
    if (_paymentToken != address(0)) {
        require(_amount == listing.price, "Incorrect price");
        require(IERC20(_paymentToken).transferFrom(msg.sender, listing.seller, _amount), "Token transfer failed");
    } else {
        // Native Currency
        require(msg.value == listing.price, "Incorrect price");
        payable(listing.seller).transfer(msg.value);
    }
    
    // Transfer the NFT to the buyer
    listing.isListed = false;     // Mark as sold
    IERC721(listing.nftContract).safeTransferFrom(address(this), msg.sender, listing.tokenId);

    emit NFTSold(_listingId, listing.nftContract, listing.tokenId, listing.seller, msg.sender, _amount != 0 ? _amount : msg.value);
}

    // Cancel Listing
    function cancelListing(uint256 _listingId) external nonReentrant {
        Listing storage listing = listings[_listingId];
        require(listing.isListed, "Listing is not active");
        require(listing.seller == msg.sender, "Not the seller");

        listing.isListed = false;
        
        IERC721(listing.nftContract).safeTransferFrom(address(this), listing.seller, listing.tokenId);

        emit ListingCanceled(_listingId, listing.nftContract, listing.tokenId, msg.sender);
    }

    // To get all Listed Item 
    function getListingIds() external view returns (uint256[] memory) {
        return allListingIds;
    }

    // To get specific Seller Listed Items
    function getSellerListingIds(address seller) external view returns (uint256[] memory) {
        return sellerListings[seller];
    }
}
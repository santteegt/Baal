// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@semaphore-protocol/contracts/base/SemaphoreCore.sol";
import "@semaphore-protocol/contracts/base/SemaphoreGroups.sol";

// import "../Baal.sol";
// import "../interfaces/IBaal.sol";

import "hardhat/console.sol";

interface IBaal {

  function multisendLibrary() external view returns (address);
  function isManager(address shaman) external view returns (bool);

  // Manager Only
  function mintShares(address[] calldata to, uint256[] calldata amount) external;
  function burnShares(address[] calldata from, uint256[] calldata amount) external;

  function mintLoot(address[] calldata to, uint256[] calldata amount) external;
  function burnLoot(address[] calldata from, uint256[] calldata amount) external;

  function proposalCount() external returns (uint32);

  function submitProposal(
    bytes calldata proposalData,
    uint32 expiration,
    uint256 baalGas,
    string calldata details
  ) external payable returns (uint256);
}

contract SemaphoreShaman is SemaphoreCore, SemaphoreGroups, Initializable {

  struct Poll {
    address coordinator;
    uint16 opposingThreshold;
  }

  IBaal public baal;

  mapping(uint32 => Poll) public polls;

  modifier baalOnly () {
    require(_msgSender() == address(baal), "!baal");
    _;
  }

  error SemaphoreTriggered(address baal, uint32 proposalId, uint16 opposingVotes);
  error PollSlotTaken();

  event SemaphoreProposal(address indexed baal, uint32 indexed proposalId, uint16 opposingThreshold);
  event SemaphorePassed(address indexed baal, uint32 proposalId, uint16 opposingVotes);

  constructor() initializer {}

  function init(address _baal, bytes memory _initializationParams) external initializer {
    baal = IBaal(_baal);

    // (uint26 param) = abi.decode(
    //     _initializationParams,
    //     (uint16)
    // );
  }

  function processSemaphoreProposal(
    uint32 _pollId
  ) external {
    // TODO: check proposal status
    // TODO: eval poll votes with opossing threshold
    uint16 opposingVotes = 0;
    // TODO: revert if block votes > threshold
    if (opposingVotes > polls[_pollId].opposingThreshold) {
      revert SemaphoreTriggered(address(baal), _pollId, opposingVotes);
    }
    emit SemaphorePassed(address(baal), _pollId, opposingVotes);
  }

  function encodeProposal(
    uint32 _proposalId,
    bytes memory _proposalData
  ) public view returns (bytes memory) {
    bytes memory _processSemaphore = abi.encodeWithSignature(
        "processSemaphoreProposal(uint32)",
        _proposalId
    );

    bytes memory multisendActions = abi.encodePacked(
      uint8(0),
      address(this),
      uint256(0),
      uint256(_processSemaphore.length),
      bytes(_processSemaphore)
    );

    multisendActions = abi.encodePacked(
      multisendActions,
      uint8(1), // TODO: ?
      baal.multisendLibrary,
      uint256(0),
      uint256(_proposalData.length),
      bytes(_proposalData)
    );

    return abi.encodeWithSignature(
      "multiSend(bytes)",
      multisendActions
    );
    // return _proposalData;
  }

  function submitSemaphoreProposal(
    bytes calldata proposalData,
    uint32 expiration,
    uint256 baalGas,
    string calldata details,
    uint16 opposingThreshold,
    uint256 merkleTreeDepth
  ) external payable {

    uint32 proposalId = baal.proposalCount() + 1;

    if (polls[proposalId].coordinator != address(0))
      revert PollSlotTaken();

    _createGroup(uint256(proposalId), merkleTreeDepth, 0);

    polls[proposalId] = Poll({
      coordinator: _msgSender(),
      opposingThreshold: opposingThreshold
    });

    bytes memory encodedProposal = encodeProposal(proposalId, proposalData);

    baal.submitProposal{value:msg.value}(encodedProposal, expiration, baalGas, details);

    emit SemaphoreProposal(address(baal), proposalId, opposingThreshold);
  }
}


contract SemaphoreShamanSummoner {
  using Clones for address;

  address public template;

  event SummonSemaphore(
    address baal,
    address shaman,  
    bytes initializationParams
  );

  constructor() {
      SemaphoreShaman semaphore = new SemaphoreShaman();
      template = address(semaphore);
  }

  function predictShamanAddress(bytes32 _salt) public view returns (address) {
    return template.predictDeterministicAddress(_salt);
  }

  function summonSemaphore(
      address _baal,
      bytes memory _initializationParams,
      bytes32 _salt
  ) public returns (address) {
      SemaphoreShaman shaman = SemaphoreShaman(template.cloneDeterministic(_salt));

      shaman.init(_baal, _initializationParams);

      emit SummonSemaphore(_baal, address(shaman), _initializationParams);

      return address(shaman);
  }
}

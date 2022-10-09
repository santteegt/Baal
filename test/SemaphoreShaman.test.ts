import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Group } from "@semaphore-protocol/group"
import { Identity } from "@semaphore-protocol/identity"
import {
  generateNullifierHash,
  generateProof,
  packToSolidityProof,
  PublicSignals,
  SolidityProof
} from "@semaphore-protocol/proof"
import { randomBytes } from 'crypto-browserify';
import { expect } from "chai"
import { Signer, utils, BigNumber, ContractFactory, ContractTransaction } from "ethers"
import { ethers, run, network } from "hardhat"

import { encodeMultiAction } from "../src/util";
import { Config } from '../tasks/deploy-semaphore-req';

import {
  Baal,
  TestERC20,
  Loot,
  MultiSend,
  CompatibilityFallbackHandler,
  BaalSummoner,
  GnosisSafe,
  Poster,
  Shares,
  SemaphoreShamanSummoner,
  SemaphoreShaman,
} from '../src/types';

type DAOSettings = {
  PROPOSAL_OFFERING: any;
  GRACE_PERIOD_IN_SECONDS: any;
  VOTING_PERIOD_IN_SECONDS: any;
  QUORUM_PERCENT: any;
  SPONSOR_THRESHOLD: any;
  MIN_RETENTION_PERCENT: any;
  MIN_STAKING_PERCENT: any;
  TOKEN_NAME: any;
  TOKEN_SYMBOL: any;
};

const defaultDAOSettings = {
  GRACE_PERIOD_IN_SECONDS: 43200,
  VOTING_PERIOD_IN_SECONDS: 432000,
  PROPOSAL_OFFERING: 69,
  SPONSOR_THRESHOLD: 1,
  MIN_RETENTION_PERCENT: 0,
  MIN_STAKING_PERCENT: 0,
  QUORUM_PERCENT: 0,
  TOKEN_NAME: "wrapped ETH",
  TOKEN_SYMBOL: "WETH",
};

const metadataConfig = {
  CONTENT: '{"name":"test"}',
  TAG: "daohaus.summoner.daoProfile",
};

const signalMetadata = {
  DETAILS: JSON.stringify({
    title: `Signal Proposal with Semaphore`,
    description: `Let the minorities have a voice`,
    contentURI: `https://daohaus.club`,
    contentURIType: 'url',
    proposalType: 'SIGNAL',
  }),
  TAG: 'daohaus.proposal.signalProposal',
}

const abiCoder = ethers.utils.defaultAbiCoder;

async function blockTime() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}

const getBaalParams = async function (
  baal: Baal,
  poster: Poster,
  config: DAOSettings,
  adminConfig: [boolean, boolean],
  shamans: [string[], number[]],
  shares: [string[], number[]],
  loots: [string[], number[]]
) {
  const governanceConfig = abiCoder.encode(
    ["uint32", "uint32", "uint256", "uint256", "uint256", "uint256"],
    [
      config.VOTING_PERIOD_IN_SECONDS,
      config.GRACE_PERIOD_IN_SECONDS,
      config.PROPOSAL_OFFERING,
      config.QUORUM_PERCENT,
      config.SPONSOR_THRESHOLD,
      config.MIN_RETENTION_PERCENT,
    ]
  );

  const setAdminConfig = await baal.interface.encodeFunctionData(
    "setAdminConfig",
    adminConfig
  );
  const setGovernanceConfig = await baal.interface.encodeFunctionData(
    "setGovernanceConfig",
    [governanceConfig]
  );
  const setShaman = await baal.interface.encodeFunctionData(
    "setShamans",
    shamans
  );
  const mintShares = await baal.interface.encodeFunctionData(
    "mintShares",
    shares
  );
  const mintLoot = await baal.interface.encodeFunctionData("mintLoot", loots);
  const postMetaData = await poster.interface.encodeFunctionData("post", [
    metadataConfig.CONTENT,
    metadataConfig.TAG,
  ]);
  const posterFromBaal = await baal.interface.encodeFunctionData(
    "executeAsBaal",
    [poster.address, 0, postMetaData]
  );

  const initalizationActions = [
    setAdminConfig,
    setGovernanceConfig,
    setShaman,
    mintShares,
    mintLoot,
    posterFromBaal,
  ];

  return {
    initParams: abiCoder.encode(
      ["string", "string"],
      [
        config.TOKEN_NAME,
        config.TOKEN_SYMBOL
      ]
    ),
    initalizationActions,
  };
};

async function moveForwardPeriods(periods: number, extra?: number) {
  const goToTime =
    (await blockTime()) +
    defaultDAOSettings.VOTING_PERIOD_IN_SECONDS * periods +
    (extra ? extra : 0);
  await ethers.provider.send("evm_mine", [goToTime]);
  return true;
}

const getNewBaalAddresses = async (
  tx: ContractTransaction
): Promise<{ baal: string; loot: string; safe: string }> => {
  const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
  // console.log({logs: receipt.logs})
  let baalSummonAbi = [
    "event SummonBaal(address indexed baal, address indexed loot, address indexed shares, address safe, bool existingSafe)",
  ];
  let iface = new ethers.utils.Interface(baalSummonAbi);
  let log = iface.parseLog(receipt.logs[receipt.logs.length - 1]);
  const { baal, loot, safe } = log.args;
  return { baal, loot, safe };
};

describe('SemaphoreShaman', () => {

  let baal: Baal;
  let lootSingleton: Loot;
  let LootFactory: ContractFactory;
  let sharesSingleton: Shares;
  let SharesFactory: ContractFactory;
  let ERC20: ContractFactory;
  let lootToken: Loot;
  let sharesToken: Shares;
  let shamanLootToken: Loot;
  let shamanBaal: Baal;
  let applicantBaal: Baal;
  let weth: TestERC20;
  let applicantWeth: TestERC20;
  let multisend: MultiSend;
  let poster: Poster;

  let BaalFactory: ContractFactory;
  let baalSingleton: Baal;
  let baalSummoner: BaalSummoner;
  let gnosisSafeSingleton: GnosisSafe;
  let gnosisSafe: GnosisSafe;
  let ShamanFactory: ContractFactory;
  let shamanSingleton: SemaphoreShaman;
  let shamanSummoner: SemaphoreShamanSummoner;

  let Poster: ContractFactory;

  let applicant: SignerWithAddress;
  let summoner: SignerWithAddress;
  let shaman: SignerWithAddress;
  let s1: SignerWithAddress;

  // shaman baals, to test permissions
  let s1Baal: Baal;

  const loot = 500;
  const shares = 100;
  const sharesPaused = false;
  const lootPaused = false;

  let proposal: { [key: string]: any };

  let saltNonce: string;

  const setupBaal = async (
    baal: Baal,
    poster: Poster,
    config: DAOSettings,
    adminConfig: [boolean, boolean],
    shamans: [string[], number[]],
    shares: [string[], number[]],
    loots: [string[], number[]]
  ) => {
    const saltNonce = (Math.random() * 1000).toFixed(0);
    const encodedInitParams = await getBaalParams(
      baal,
      poster,
      config,
      adminConfig,
      shamans,
      shares,
      loots,
    );
    const tx = await baalSummoner.summonBaalAndSafe(
      encodedInitParams.initParams,
      encodedInitParams.initalizationActions,
      saltNonce,
    );
    return await getNewBaalAddresses(tx);
  };

  const setupShaman = async (
    saltNonce: string
  ) => {
    const predictedAddress = await shamanSummoner.predictShamanAddress(saltNonce);
    const setShamanAction = await baal.interface.encodeFunctionData("setShamans", [
      [predictedAddress],
      [1], // TODO: admin but not required. Implement as a minion?
    ]);
    const summonShamanAction = await shamanSummoner.interface.encodeFunctionData("summonSemaphore", [
      baal.address,
      '0x',
      saltNonce
    ]);
    const encodedProposal = encodeMultiAction(
      multisend,
      [setShamanAction, summonShamanAction],
      [baal.address, shamanSummoner.address],
      [BigNumber.from(0), BigNumber.from(0)],
      [0, 0]
    );

    await baal.submitProposal(
      encodedProposal,
      proposal.expiration,
      0,
      ethers.utils.id(proposal.details),
      {value: defaultDAOSettings.PROPOSAL_OFFERING}
    );
    await baal.submitVote(1, true);
    await moveForwardPeriods(2);
    await baal.processProposal(1, encodedProposal);

    return predictedAddress;
  };

  let semaphoreContracts: Config;

  before(async () => {
    console.log('CHainid', network.config.chainId);
    semaphoreContracts = await run('deploy:semaphore-requirements', { logs: true });
    console.log('semaphoreContracts', semaphoreContracts);

    LootFactory = await ethers.getContractFactory("Loot");
    lootSingleton = (await LootFactory.deploy()) as Loot;
    SharesFactory = await ethers.getContractFactory("Shares");
    sharesSingleton = (await SharesFactory.deploy()) as Shares;
    BaalFactory = await ethers.getContractFactory("Baal");
    baalSingleton = (await BaalFactory.deploy()) as Baal;
    Poster = await ethers.getContractFactory("Poster");
    poster = (await Poster.deploy()) as Poster;

    ShamanFactory = await ethers.getContractFactory("SemaphoreShaman", {
      libraries: {
        IncrementalBinaryTree: semaphoreContracts.IncrementalBinaryTree,
      }
    });
    // shamanSingleton = (await ShamanFactory.deploy()) as SemaphoreShaman;
    // saltNonce = `0x${randomBytes(32).toString('hex')}`;
  })

  beforeEach(async function () {
    const GnosisSafe = await ethers.getContractFactory("GnosisSafe");
    const BaalSummoner = await ethers.getContractFactory("BaalSummoner");
    const CompatibilityFallbackHandler = await ethers.getContractFactory(
      "CompatibilityFallbackHandler"
    );
    const BaalContract = await ethers.getContractFactory("Baal");
    const MultisendContract = await ethers.getContractFactory("MultiSend");
    const GnosisSafeProxyFactory = await ethers.getContractFactory(
      "GnosisSafeProxyFactory"
    );
    const ModuleProxyFactory = await ethers.getContractFactory(
      "ModuleProxyFactory"
    );
    [summoner, applicant, shaman, s1] =
      await ethers.getSigners();

    ERC20 = await ethers.getContractFactory("TestERC20");
    weth = (await ERC20.deploy("WETH", "WETH", 10000000)) as TestERC20;
    applicantWeth = weth.connect(applicant);

    await weth.transfer(applicant.address, 1000);

    multisend = (await MultisendContract.deploy()) as MultiSend;
    gnosisSafeSingleton = (await GnosisSafe.deploy()) as GnosisSafe;
    const handler =
      (await CompatibilityFallbackHandler.deploy()) as CompatibilityFallbackHandler;
    const proxy = await GnosisSafeProxyFactory.deploy();
    const moduleProxyFactory = await ModuleProxyFactory.deploy();

    baalSummoner = (await BaalSummoner.deploy(
      baalSingleton.address,
      gnosisSafeSingleton.address,
      handler.address,
      multisend.address,
      proxy.address,
      moduleProxyFactory.address,
      lootSingleton.address,
      sharesSingleton.address,
    )) as BaalSummoner;

    const addresses = await setupBaal(
      baalSingleton,
      poster,
      defaultDAOSettings,
      [sharesPaused, lootPaused],
      [[shaman.address], [7]],
      [
        [summoner.address, applicant.address],
        [shares * 2, shares],
      ],
      [
        [summoner.address, applicant.address],
        [loot, loot],
      ]
    );

    baal = BaalFactory.attach(addresses.baal) as Baal;
    gnosisSafe = BaalFactory.attach(addresses.safe) as GnosisSafe;
    shamanBaal = baal.connect(shaman); // needed to send txns to baal as the shaman
    applicantBaal = baal.connect(applicant); // needed to send txns to baal as the shaman
    s1Baal = baal.connect(s1);

    const lootTokenAddress = await baal.lootToken();

    lootToken = LootFactory.attach(lootTokenAddress) as Loot;
    shamanLootToken = lootToken.connect(shaman);

    const sharesTokenAddress = await baal.sharesToken();

    sharesToken = SharesFactory.attach(sharesTokenAddress) as Shares;
    shamanLootToken = lootToken.connect(shaman);

    const selfTransferAction = encodeMultiAction(
      multisend,
      ["0x"],
      [baal.address],
      [BigNumber.from(0)],
      [0]
    );

    proposal = {
      flag: 0,
      account: applicant.address,
      data: selfTransferAction,
      details: "all hail baal",
      expiration: 0,
      baalGas: 0,
    };


    // ========= SemaphoreShaman
    const ShamanSummoner = await ethers.getContractFactory("SemaphoreShamanSummoner", {
      libraries: {
        IncrementalBinaryTree: semaphoreContracts.IncrementalBinaryTree,
      }
    });
    shamanSummoner = (await ShamanSummoner.deploy()) as SemaphoreShamanSummoner;
    saltNonce = `0x${randomBytes(32).toString('hex')}`;
  });

  it('should have deployed semaphore contracts', async () => {
    expect(Object.keys(semaphoreContracts.verifiers).length, "Deployed contracts not found");
  });

  it('should be able to determinastically guess the summoned shaman address', async () => {
    
    const predictedAddress = await shamanSummoner.predictShamanAddress(saltNonce);
    const tx = shamanSummoner.summonSemaphore(baal.address, '0x', saltNonce);
    await expect(tx).to.emit(shamanSummoner, 'SummonSemaphore').withArgs(baal.address, predictedAddress, '0x')
  })

  it('should send and accept a shaman proposal', async () => {
    const newShamanAddress = await setupShaman(saltNonce)
    console.log('Status', await baal.getProposalStatus('1'))
    expect(await baal.shamans(newShamanAddress)).to.eq('1');
  })

  describe("Shaman in action", () => {
    let semaphoreShaman: SemaphoreShaman;
    let opposingThreshold = BigNumber.from(1);
    let merkleTreeDepth = BigNumber.from(20);

    const submitSignalProposal = async (pollId: string) => {
      const postMetaDataAction = await poster.interface.encodeFunctionData("post", [
        signalMetadata.DETAILS,
        signalMetadata.TAG,
      ]);
      const encodedActions = encodeMultiAction(
        multisend,
        [postMetaDataAction],
        [poster.address],
        [BigNumber.from(0)],
        [0]
      );
      await semaphoreShaman.submitSemaphoreProposal(
        encodedActions,
        '0',
        '0',
        JSON.stringify({
          ...JSON.parse(signalMetadata.DETAILS),
          opposingThreshold,
        }),
        opposingThreshold,
        merkleTreeDepth,
      )
      return await semaphoreShaman.encodeProposal(pollId, encodedActions);
    };

    beforeEach(async () => {
      semaphoreShaman = ShamanFactory.attach(
        await setupShaman(saltNonce)
      ) as SemaphoreShaman;
    })

    it('should submit & execute a signal proposal', async () => {
      const pollId = '2';
      const encodedProposal = await submitSignalProposal(pollId);

      await baal.submitVote(pollId, true);
      await moveForwardPeriods(2);
      console.log('Prop after', await semaphoreShaman.polls(pollId));
      const tx = baal.processProposal(pollId, encodedProposal);
      (await tx).wait();
      console.log('Prop after', await baal.getProposalStatus(pollId));
      // await expect(tx).to.emit(baal, 'ProcessProposal').withArgs(pollId, true, false); // Successfully executed
    })
  })
});


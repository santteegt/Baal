import { poseidonContract } from "circomlibjs"
import {  } from "circomlibjs"
import { Contract } from "ethers"
import { task, types } from "hardhat/config"

export type Config = {
    verifiers: {[key: string]: string};
    Semaphore?: string;
    PoseidonT3: string;
    IncrementalBinaryTree: string;
}

task("deploy:semaphore-requirements", "Deploy a SemaphoreVoting contract")
    .addOptionalParam<boolean>("logs", "Print the logs", true, types.boolean)
    .setAction(async ({ logs }, { ethers, network, run }): Promise<Config> => {
        let deployedContracts: Config
        if (network.config.chainId === 5) {
            const request = await fetch(
                'https://raw.githubusercontent.com/semaphore-protocol/semaphore/main/packages/contracts/deployed-contracts/goerli.json',
            );
            deployedContracts = request.ok ? await request.json() : {};
        } else {
            const verifierContract = await run('deploy:verifier', {
                merkleTreeDepth: 20,
                logs: true
            })
            

            const poseidonABI = poseidonContract.generateABI(2)
            const poseidonBytecode = poseidonContract.createCode(2)

            const [signer] = await ethers.getSigners()

            const PoseidonLibFactory = new ethers.ContractFactory(poseidonABI, poseidonBytecode, signer)
            const poseidonLib = await PoseidonLibFactory.deploy()

            await poseidonLib.deployed()

            if (logs) {
                console.info(`Poseidon library has been deployed to: ${poseidonLib.address}`)
            }

            const IncrementalBinaryTreeLibFactory = await ethers.getContractFactory("IncrementalBinaryTree", {
                libraries: {
                    PoseidonT3: poseidonLib.address
                }
            })
            const incrementalBinaryTreeLib = await IncrementalBinaryTreeLibFactory.deploy()

            await incrementalBinaryTreeLib.deployed()

            if (logs) {
                console.info(`IncrementalBinaryTree library has been deployed to: ${incrementalBinaryTreeLib.address}`)
            }
            deployedContracts = {
                verifiers: {
                    "Verifier20": verifierContract.address,
                },
                PoseidonT3: poseidonLib.address,
                IncrementalBinaryTree: incrementalBinaryTreeLib.address,
            };
        }
        return deployedContracts;
    });
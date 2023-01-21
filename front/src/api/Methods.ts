import {ProjectInfo, ProjectInfoResponse, ProjectVotes, Result} from "./Types";
import {ContractPromise} from "@polkadot/api-contract";
import type {ContractExecResultResult, WeightV2} from '@polkadot/types/interfaces';
import type {Codec} from '@polkadot/types/types';
import {web3FromAddress} from "@polkadot/extension-dapp";

function handleResult<T>(result: ContractExecResultResult, output: Codec | null): T {
    if (result.isOk) {
        const x = output!.toJSON() as Result<T>
        if ("ok" in x)
            return x.ok
        throw x.err
    }

    throw result.asErr.toHuman()
}


export class API {
    private contract: ContractPromise
    private originAddress: string
    private options: {gasLimit: WeightV2, storageDepositLimit: null}

    constructor(contract: ContractPromise, origin: string, options: {gasLimit: WeightV2, storageDepositLimit: null}) {
        this.contract = contract
        this.originAddress = origin
        this.options = options
    }

    async getCollectedBudget(projectName: string): Promise<number> {
        const {result, output} = await this.contract.query.getCollectedBudget(
            this.originAddress,
            this.options,
            projectName
        )

        return handleResult(result, output)
    }


    async getProjectInfo(projectName: string): Promise<ProjectInfo> {
        const {result, output} = await this.contract.query.getProjectInfo(
            this.originAddress,
            this.options,
            projectName
        )

        const response = handleResult<ProjectInfoResponse>(result, output)
        return {
            author: response.author,
            createTime: new Date(response.createTime),
            deadline: new Date(response.deadline),
            description: response.description,
            goal: response.goal
        }
    }

    async getDonatedAmount(projectName: string, account: string): Promise<number> {
        const {result, output} = await this.contract.query.getDonatedAmount(
            this.originAddress,
            this.options,
            projectName,
            account
        )

        return handleResult(result, output)
    }

    async getVotingState(projectName: string): Promise<ProjectVotes> {
        const {result, output} = await this.contract.query.getVotingState(
            this.originAddress,
            this.options,
            projectName,
        )

        return handleResult(result, output)
    }

    async getVote(projectName: string, account: string): Promise<boolean> {
        const {result, output} = await this.contract.query.getVote(
            this.originAddress,
            this.options,
            projectName,
            account
        )

        return handleResult(result, output)
    }

    async createProject(
        projectName: string,
        description: string,
        deadline: string,
        goal: string
    ){
        const injector = await web3FromAddress(this.originAddress);

        const unsub = await this.contract.tx.createProject(
            this.options,
            projectName,
            description,
            Date.parse(deadline),
            goal,
        ).signAndSend(this.originAddress, {signer: injector.signer}, (result) => {
            if (result.status.isInBlock) {
                console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
            } else if (result.status.isFinalized) {
                console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
                unsub();
            }
        });
    }

    async makeDonation(projectName: string){
        const injector = await web3FromAddress(this.originAddress);

        const unsub = await this.contract.tx.makeDonation(
            this.options,
            projectName,
        ).signAndSend(this.originAddress, {signer: injector.signer}, (result) => {
            if (result.status.isInBlock) {
                console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
            } else if (result.status.isFinalized) {
                console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
                unsub();
            }
        });
    }

    async makeVote(projectName: string, vote: boolean){
        const injector = await web3FromAddress(this.originAddress);

        const unsub = await this.contract.tx.makeVote(
            this.options,
            projectName,
            vote
        ).signAndSend(this.originAddress, {signer: injector.signer}, (result) => {
            if (result.status.isInBlock) {
                console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
            } else if (result.status.isFinalized) {
                console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
                unsub();
            }
        });
    }

    async refundDonation(projectName: string){
        const injector = await web3FromAddress(this.originAddress);

        const unsub = await this.contract.tx.refundDonation(
            this.options,
            projectName,
        ).signAndSend(this.originAddress, {signer: injector.signer}, (result) => {
            if (result.status.isInBlock) {
                console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
            } else if (result.status.isFinalized) {
                console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
                unsub();
            }
        });
    }

    async claimBudget(projectName: string){
        const injector = await web3FromAddress(this.originAddress);

        const unsub = await this.contract.tx.claimBudget(
            this.options,
            projectName,
        ).signAndSend(this.originAddress, {signer: injector.signer}, (result) => {
            if (result.status.isInBlock) {
                console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
            } else if (result.status.isFinalized) {
                console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
                unsub();
            }
        });
    }
}

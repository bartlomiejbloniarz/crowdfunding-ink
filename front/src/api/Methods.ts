import { ProjectInfo, ProjectInfoResponse, ProjectVotes, Result } from "./Types"
import { ContractPromise } from "@polkadot/api-contract"
import type { WeightV2 } from "@polkadot/types/interfaces"
import { web3FromAddress } from "@polkadot/extension-dapp"
import { ApiPromise } from "@polkadot/api"
import metadata from "../resources/metadata.json"
import { ContractCallOutcome } from "@polkadot/api-contract/types"
import { ISubmittableResult } from "@polkadot/types/types/extrinsic"

function getResult<T>(outcome: ContractCallOutcome): T {
    if (outcome.result.isOk) {
        const x = outcome.output!.toJSON() as Result<T>
        if ("ok" in x) return x.ok
        throw x.err
    }

    throw outcome.result.asErr.toHuman()
}

function handleOutcome<T>(outcome: ContractCallOutcome, handler: Handler<T>) {
    if (outcome.result.isOk) {
        const x = outcome.output!.toJSON() as Result<T>
        if ("ok" in x) {
            console.log(x.ok)
            return handler.handleOk(x.ok)
        }
        return handler.handleErr(x.err)
    }

    return handler.handleErr(outcome.result.asErr.toHuman()!.toString())
}

type Handler<T> = {
    handleInfo: (str: string) => void
    handleOk: (t: T) => void
    handleErr: (str: string) => void
}

const contractAddress = "5CggKY6ozvXFMpe8ZPnxgCsP18bL2VxQufXUKYJ2fFPfAZrY"

export class API {
    private readonly api: ApiPromise
    private readonly contract: ContractPromise
    private readonly originAddress: string
    private readonly options: { gasLimit: WeightV2; storageDepositLimit: null }

    constructor(
        api: ApiPromise,
        origin: string,
        options: { gasLimit: WeightV2; storageDepositLimit: null }
    ) {
        this.api = api
        this.contract = new ContractPromise(api, metadata, contractAddress)
        this.originAddress = origin
        this.options = options
    }

    private handleResult(result: ISubmittableResult, handler: Handler<void>) {
        if (result.status.isInBlock) {
            handler.handleInfo(
                `Transaction included at blockHash ${result.status.asInBlock}`
            )
        } else if (result.status.isFinalized) {
            handler.handleInfo(
                `Transaction finalized at blockHash ${result.status.asFinalized}`
            )
            if (result.dispatchError) {
                if (result.dispatchError.isModule) {
                    const decoded = this.api.registry.findMetaError(
                        result.dispatchError.asModule
                    )
                    const { docs, name, section } = decoded
                    handler.handleErr(`${section}.${name}: ${docs.join(" ")}`)
                } else {
                    handler.handleErr(result.dispatchError.toString())
                }
            } else {
                handler.handleOk()
            }
        }
    }

    async getAccountBalance(): Promise<number> {
        const result = await this.api.query.system.account(this.originAddress)
        const x = result.toJSON() as { data: { free: string } }
        return Number(x.data.free)
    }

    async getCollectedBudget(projectName: string): Promise<number> {
        const outcome = await this.contract.query.getCollectedBudget(
            this.originAddress,
            this.options,
            projectName
        )

        return getResult(outcome)
    }

    async getCollectedBudgetSub(projectName: string, handler: Handler<number>) {
        const unsub = await this.api.query.contracts.contractInfoOf(
            contractAddress,
            async () => {
                const outcome = await this.contract.query.getCollectedBudget(
                    this.originAddress,
                    this.options,
                    projectName
                )

                handleOutcome(outcome, handler)
            }
        )
    }

    async getProjectInfo(projectName: string): Promise<ProjectInfo> {
        const outcome = await this.contract.query.getProjectInfo(
            this.originAddress,
            this.options,
            projectName
        )

        const response = getResult<ProjectInfoResponse>(outcome)
        return {
            author: response.author,
            createTime: new Date(response.createTime),
            deadline: new Date(response.deadline),
            description: response.description,
            goal: response.goal,
        }
    }

    async getAllProjects(): Promise<string[]> {
        const outcome = await this.contract.query.getAllProjects(
            this.originAddress,
            this.options
        )

        return getResult(outcome)
    }

    async getDonatedAmount(
        projectName: string,
        account: string
    ): Promise<number> {
        const outcome = await this.contract.query.getDonatedAmount(
            this.originAddress,
            this.options,
            projectName,
            account
        )

        return getResult(outcome)
    }

    async getDonatedAmountSub(
        projectName: string,
        account: string,
        handler: Handler<number>
    ) {
        const unsub = await this.api.query.contracts.contractInfoOf(
            contractAddress,
            async () => {
                const outcome = await this.contract.query.getDonatedAmount(
                    this.originAddress,
                    this.options,
                    projectName,
                    account
                )

                handleOutcome(outcome, handler)
            }
        )
    }

    async getVotingState(projectName: string): Promise<ProjectVotes> {
        const outcome = await this.contract.query.getVotingState(
            this.originAddress,
            this.options,
            projectName
        )

        return getResult(outcome)
    }

    async getVote(projectName: string, account: string): Promise<boolean> {
        const outcome = await this.contract.query.getVote(
            this.originAddress,
            this.options,
            projectName,
            account
        )

        return getResult(outcome)
    }

    async createProject(
        projectName: string,
        description: string,
        deadline: string,
        goal: number,
        handler: Handler<void>
    ) {
        const injector = await web3FromAddress(this.originAddress)

        const unsub = await this.contract.tx
            .createProject(
                this.options,
                projectName,
                description,
                Date.parse(deadline),
                goal
            )
            .signAndSend(
                this.originAddress,
                { signer: injector.signer },
                (result) => {
                    this.handleResult(result, handler)
                    if (result.status.isFinalized) unsub()
                }
            )
    }

    async makeDonation(
        projectName: string,
        value: number,
        handler: Handler<void>
    ) {
        const outcome = await this.contract.query.makeDonation(
            this.originAddress,
            this.options,
            projectName
        )

        getResult<void>(outcome)

        const injector = await web3FromAddress(this.originAddress)

        const unsub = await this.contract.tx
            .makeDonation({ ...this.options, value }, projectName)
            .signAndSend(
                this.originAddress,
                { signer: injector.signer },
                (result) => {
                    this.handleResult(result, handler)
                    if (result.status.isFinalized) unsub()
                }
            )
    }

    async makeVote(projectName: string, vote: boolean, handler: Handler<void>) {
        const outcome = await this.contract.query.makeVote(
            this.originAddress,
            this.options,
            projectName,
            vote
        )

        getResult<void>(outcome)

        const injector = await web3FromAddress(this.originAddress)

        const unsub = await this.contract.tx
            .makeVote(this.options, projectName, vote)
            .signAndSend(
                this.originAddress,
                { signer: injector.signer },
                (result) => {
                    this.handleResult(result, handler)
                    if (result.status.isFinalized) unsub()
                }
            )
    }

    async refundDonation(projectName: string, handler: Handler<void>) {
        const outcome = await this.contract.query.refundDonation(
            this.originAddress,
            this.options,
            projectName
        )

        getResult<void>(outcome)

        const injector = await web3FromAddress(this.originAddress)

        const unsub = await this.contract.tx
            .refundDonation(this.options, projectName)
            .signAndSend(
                this.originAddress,
                { signer: injector.signer },
                (result) => {
                    this.handleResult(result, handler)
                    if (result.status.isFinalized) unsub()
                }
            )
    }

    async claimBudget(projectName: string, handler: Handler<void>) {
        const outcome = await this.contract.query.claimBudget(
            this.originAddress,
            this.options,
            projectName
        )

        getResult<void>(outcome)

        const injector = await web3FromAddress(this.originAddress)

        const unsub = await this.contract.tx
            .claimBudget(this.options, projectName)
            .signAndSend(
                this.originAddress,
                { signer: injector.signer },
                (result) => {
                    this.handleResult(result, handler)
                    if (result.status.isFinalized) unsub()
                }
            )
    }
}

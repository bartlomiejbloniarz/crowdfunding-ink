import { ProjectInfo, ProjectInfoResponse, ProjectVotes, Result } from "./Types"
import { ContractPromise } from "@polkadot/api-contract"
import type { WeightV2 } from "@polkadot/types/interfaces"
import { web3FromAddress } from "@polkadot/extension-dapp"
import { ApiPromise, Keyring } from "@polkadot/api"
import metadata from "../resources/metadata.json"
import { ContractCallOutcome } from "@polkadot/api-contract/types"
import { ISubmittableResult } from "@polkadot/types/types/extrinsic"
import { Account } from "../App"
import { SubmittableExtrinsic } from "@polkadot/api/promise/types"

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
    private readonly originAccount: Account
    private readonly options: { gasLimit: WeightV2; storageDepositLimit: null }
    private readonly keyring: Keyring
    constructor(
        api: ApiPromise,
        origin: Account,
        options: { gasLimit: WeightV2; storageDepositLimit: null },
        keyring: Keyring
    ) {
        this.api = api
        this.contract = new ContractPromise(api, metadata, contractAddress)
        this.originAccount = origin
        this.options = options
        this.keyring = keyring
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
        const result = await this.api.query.system.account(
            this.originAccount.account.address
        )
        const x = result.toJSON() as { data: { free: string } }
        return Number(x.data.free)
    }

    async getCollectedBudget(projectName: string): Promise<number> {
        const outcome = await this.contract.query.getCollectedBudget(
            this.originAccount.account.address,
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
                    this.originAccount.account.address,
                    this.options,
                    projectName
                )

                handleOutcome(outcome, handler)
            }
        )
    }

    async getProjectInfo(projectName: string): Promise<ProjectInfo> {
        const outcome = await this.contract.query.getProjectInfo(
            this.originAccount.account.address,
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
            this.originAccount.account.address,
            this.options
        )

        return getResult(outcome)
    }

    async getDonatedAmount(
        projectName: string,
        account: string
    ): Promise<number> {
        const outcome = await this.contract.query.getDonatedAmount(
            this.originAccount.account.address,
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
                    this.originAccount.account.address,
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
            this.originAccount.account.address,
            this.options,
            projectName
        )

        return getResult(outcome)
    }

    async getVote(projectName: string, account: string): Promise<boolean> {
        const outcome = await this.contract.query.getVote(
            this.originAccount.account.address,
            this.options,
            projectName,
            account
        )

        return getResult(outcome)
    }

    async signAndSend(tx: SubmittableExtrinsic, handler: Handler<void>) {
        if (this.originAccount.type === "injected") {
            const injector = await web3FromAddress(
                this.originAccount.account.address
            )

            const unsub = await tx.signAndSend(
                this.originAccount.account.address,
                { signer: injector.signer },
                (result) => {
                    this.handleResult(result, handler)
                    if (result.status.isFinalized) unsub()
                }
            )
        } else {
            const pair = this.keyring.getPair(
                this.originAccount.account.address
            )

            const unsub = await tx.signAndSend(pair, (result) => {
                this.handleResult(result, handler)
                if (result.status.isFinalized) unsub()
            })
        }
    }

    async createProject(
        projectName: string,
        description: string,
        deadline: string,
        goal: number,
        handler: Handler<void>
    ) {
        const outcome = await this.contract.query.createProject(
            this.originAccount.account.address,
            this.options,
            projectName,
            description,
            Date.parse(deadline),
            goal
        )

        getResult<void>(outcome)

        const tx = this.contract.tx.createProject(
            this.options,
            projectName,
            description,
            Date.parse(deadline),
            goal
        )

        await this.signAndSend(tx, handler)
    }

    async makeDonation(
        projectName: string,
        value: number,
        handler: Handler<void>
    ) {
        const outcome = await this.contract.query.makeDonation(
            this.originAccount.account.address,
            this.options,
            projectName
        )

        getResult<void>(outcome)

        const tx = this.contract.tx.makeDonation(
            { ...this.options, value },
            projectName
        )

        await this.signAndSend(tx, handler)
    }

    async makeVote(projectName: string, vote: boolean, handler: Handler<void>) {
        const outcome = await this.contract.query.makeVote(
            this.originAccount.account.address,
            this.options,
            projectName,
            vote
        )

        getResult<void>(outcome)

        const tx = this.contract.tx.makeVote(this.options, projectName, vote)

        await this.signAndSend(tx, handler)
    }

    async refundDonation(projectName: string, handler: Handler<void>) {
        const outcome = await this.contract.query.refundDonation(
            this.originAccount.account.address,
            this.options,
            projectName
        )

        getResult<void>(outcome)

        const tx = this.contract.tx.refundDonation(this.options, projectName)

        await this.signAndSend(tx, handler)
    }

    async claimBudget(projectName: string, handler: Handler<void>) {
        const outcome = await this.contract.query.claimBudget(
            this.originAccount.account.address,
            this.options,
            projectName
        )

        getResult<void>(outcome)

        const tx = this.contract.tx.claimBudget(this.options, projectName)

        await this.signAndSend(tx, handler)
    }
}

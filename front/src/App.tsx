import React, {createContext, useContext, useEffect, useState} from 'react';
import {AppLayout, Container, Header, Select, Spinner,} from "@cloudscape-design/components";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import MainPage from "./components/MainPage";
import ProjectView from "./components/ProjectView";
import NoPage from "./components/NoPage";
import {ApiPromise, WsProvider} from "@polkadot/api";
import {InjectedAccountWithMeta} from "@polkadot/extension-inject/types";
import {web3Accounts, web3Enable} from "@polkadot/extension-dapp";
import {ContractPromise} from "@polkadot/api-contract";
import metadata from "./resources/metadata.json"
import {WeightV2} from "@polkadot/types/interfaces";
import {OptionDefinition} from "@cloudscape-design/components/internal/components/option/interfaces";
import {API} from "./api/Methods";

const ApiContext = createContext<API|null>(null)
const AccountsContext = createContext<InjectedAccountWithMeta[]>([])

export const useApi = () => {
    return useContext(ApiContext)!
}

export const useAccounts = () => {
    return useContext(AccountsContext)!
}

const getOptions = (api: ApiPromise) => {
    const refTime = 8013742080
    const proofSize = 262144
    const gasLimit = api.registry.createType('WeightV2', {
        refTime,
        proofSize,
    }) as WeightV2
    const storageDepositLimit = null
    return {
        gasLimit,
        storageDepositLimit,
    }
}

const App = (props: {contractAddress: string}) => {

    const [apiPromise, setApiPromise] = useState<ApiPromise | null>(null)
    const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([])
    const [originAddress, setOriginAddress] = useState<string | null>(null)
    const [selectedOption, setSelectedOption] = useState<OptionDefinition | null>(null)

    useEffect(() => {
        const wsProvider = new WsProvider('wss://ws.test.azero.dev')
        ApiPromise.create({provider: wsProvider}).then(setApiPromise)
        web3Enable('Crowdfunding').then(extensions => {
            if (extensions.length === 0) {
                return [];
            }
            return web3Accounts()
        }).then(setAccounts)
    }, [])

    if (!apiPromise) {
        return (
            <AppLayout
                toolsHide={true}
                navigationHide={true}
                contentHeader={
                    <Header
                        variant="h1"
                    >
                        Crowdfunding platform
                    </Header>
                }
                content={
                    <Spinner/>
                }
            />
        )
    }

    if (!originAddress) {
        return (
            <AppLayout
                toolsHide={true}
                navigationHide={true}
                contentHeader={
                    <Header
                        variant="h1"
                    >
                        Crowdfunding platform
                    </Header>
                }
                content={
                    <Container header={<Header>Choose account:</Header>}>
                    <Select selectedOption={selectedOption}
                            onChange={({detail}) => {
                                setSelectedOption(detail.selectedOption)
                                setOriginAddress(detail.selectedOption.value!)
                            }
                            }
                            loadingText={"select"}
                            options={accounts.map(x => {
                                return {label: x.meta.name!, value: x.address}
                            })}
                            selectedAriaLabel="Selected"/>
                    </Container>
                }
            />

        )
    }

    const contract = new ContractPromise(apiPromise, metadata, props.contractAddress);

    const api = new API(contract, originAddress, getOptions(apiPromise))

    return (
        <ApiContext.Provider value={api}>
            <AccountsContext.Provider value={accounts}>
                <BrowserRouter>
                    <Routes>
                        <Route path="/">
                            <Route index element={<MainPage/>}/>
                            <Route path={"projects/:projectName"} element={<ProjectView/>}/>
                            <Route path="*" element={<NoPage/>}/>
                        </Route>
                    </Routes>
                </BrowserRouter>
            </AccountsContext.Provider>
        </ApiContext.Provider>
    )
}

export default App;
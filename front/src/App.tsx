import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {
    AppLayout, Button,
    Container,
    Flashbar,
    FlashbarProps,
    Header,
    Input,
    Select,
    SpaceBetween,
    Spinner,
} from "@cloudscape-design/components";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import MainPage from "./components/MainPage";
import ProjectView from "./components/ProjectView";
import NoPage from "./components/NoPage";
import {ApiPromise, WsProvider} from "@polkadot/api";
import {InjectedAccountWithMeta} from "@polkadot/extension-inject/types";
import {web3Accounts, web3Enable} from "@polkadot/extension-dapp";
import {WeightV2} from "@polkadot/types/interfaces";
import {OptionDefinition} from "@cloudscape-design/components/internal/components/option/interfaces";
import {API} from "./api/Methods";
import {formatCurrency} from "./utils/Utils";

const ApiContext = createContext<API|null>(null)
const AccountsContext = createContext<InjectedAccountWithMeta[]>([])
const OriginAddressContext = createContext<string|null>(null)
const AccountContext = createContext<React.ReactNode | null>(null)
const ForceUpdateContext = createContext<{dependency: any, forceUpdate: () => void}|null>(null)

export const useApi = () => {
    return useContext(ApiContext)!
}

export const useOriginAddress = () => {
    return useContext(OriginAddressContext)!
}

export const useAccountSelector = () => {
    return useContext(AccountContext)!
}

export const useAccounts = () => {
    return useContext(AccountsContext)!
}

export function useForceUpdate(){
    return useContext(ForceUpdateContext)!
}

export const useFlashbar = () => {
    const [items, setItems] = useState<FlashbarProps.MessageDefinition[]>([])
    const counter = useRef(0)

    const addItem = (content: React.ReactNode) => {
        setItems(items => {
            const id = counter.current.toString()
            counter.current++
            return items.concat({id: id, header: "Error", type: "error", content: content, dismissible: true, onDismiss: event => {
                setItems(items => items.filter(item => item.id !== id))
                }})
        })
    }

    const flashbar = (
        <Flashbar items={items}/>
    )

    return {flashbar, addError: addItem}
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

const App = () => {

    const [apiPromise, setApiPromise] = useState<ApiPromise | null>(null)
    const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([])
    const [selectedOption, setSelectedOption] = useState<OptionDefinition | null>(null)
    const [accountBalance, setAccountBalance] = useState<number>(0)
    const {flashbar, addError} = useFlashbar()
    const [value, setValue] = useState(0)

    const originAddress = selectedOption?.value

    useEffect(() => {
        const wsProvider = new WsProvider('wss://ws.test.azero.dev')
        ApiPromise.create({provider: wsProvider}).then(setApiPromise).catch(addError)
        web3Enable('Crowdfunding').then(extensions => {
            if (extensions.length === 0) {
                return [];
            }
            return web3Accounts()
        }).then(a => {
            setAccounts(a)
            if (a.length > 0)
                setSelectedOption({label: a[0].meta.name!, value: a[0].address})
        }).catch(addError)
    }, [])

    const api = useMemo(() =>
            apiPromise && originAddress? new API(apiPromise, originAddress, getOptions(apiPromise)): null,
        [apiPromise, originAddress]
    )

    useEffect(() => {
        if (api)
            api.getAccountBalance().then(setAccountBalance)
    }, [api, originAddress, value])

    if (!api) {
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
                    <SpaceBetween size={"s"}>
                        {flashbar}
                        <Container><Spinner/></Container>
                    </SpaceBetween>
                }
            />
        )
    }



    const accountSelector = (
        <SpaceBetween direction={"horizontal"} size={"s"}>

            <Button variant={"icon"} iconName={"refresh"} onClick={() => setValue(value => value+1)}/>
        <Select selectedOption={selectedOption}
                onChange={({detail}) => {
                    setSelectedOption(detail.selectedOption)
                }
                }
                loadingText={"select"}
                options={accounts.map(x => {
                    return {label: x.meta.name!, value: x.address}
                })}
                selectedAriaLabel="Selected"/>
            <Input disabled value={formatCurrency(accountBalance)}/>
        </SpaceBetween>
    )

    return (
        <ApiContext.Provider value={api}>
            <AccountsContext.Provider value={accounts}>
                <OriginAddressContext.Provider value={originAddress!}>
                    <AccountContext.Provider value={accountSelector}>
                        <ForceUpdateContext.Provider value={{dependency: value, forceUpdate: () => setValue(value => value+1)}}>
                        <BrowserRouter>
                            <Routes>
                                <Route path="/">
                                    <Route index element={<MainPage/>}/>
                                    <Route path={"projects/:projectName"} element={<ProjectView/>}/>
                                    <Route path="*" element={<NoPage/>}/>
                                </Route>
                            </Routes>
                        </BrowserRouter>
                        </ForceUpdateContext.Provider>
                    </AccountContext.Provider>
                </OriginAddressContext.Provider>
            </AccountsContext.Provider>
        </ApiContext.Provider>
    )
}

export default App;
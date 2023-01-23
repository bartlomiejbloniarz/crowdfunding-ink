import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import {
    AppLayout,
    Button,
    Container,
    Flashbar,
    FlashbarProps,
    Header,
    Input,
    Select,
    SpaceBetween,
    Spinner,
} from "@cloudscape-design/components"
import { HashRouter, Route, Routes } from "react-router-dom"
import MainPage from "./components/MainPage"
import ProjectView from "./components/ProjectView"
import NoPage from "./components/NoPage"
import { ApiPromise, Keyring, WsProvider } from "@polkadot/api"
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types"
import { web3Accounts, web3Enable } from "@polkadot/extension-dapp"
import { WeightV2 } from "@polkadot/types/interfaces"
import { OptionDefinition } from "@cloudscape-design/components/internal/components/option/interfaces"
import { API } from "./api/Methods"
import { formatCurrency } from "./utils/Utils"
import { StaticInfo } from "./api/Types"

const ApiContext = createContext<API | null>(null)
const AccountsContext = createContext<Account[]>([])
const OriginAddressContext = createContext<string | null>(null)
const AccountContext = createContext<React.ReactNode | null>(null)
const ForceUpdateContext = createContext<{
    dependency: any
    forceUpdate: () => void
} | null>(null)
const StaticInfoContext = createContext<StaticInfo>({
    ownerAddress: "",
    fee: 0,
    votingLength: 0,
})

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

export function useForceUpdate() {
    return useContext(ForceUpdateContext)!
}

export const useStaticInfo = () => {
    return useContext(StaticInfoContext)
}

export const useFlashbar = () => {
    const [items, setItems] = useState<FlashbarProps.MessageDefinition[]>([])
    const counter = useRef(0)

    const addItem =
        (header?: React.ReactNode, type?: FlashbarProps.Type) =>
        (content: object | string) => {
            return setItems((items) => {
                const id = counter.current.toString()
                counter.current++
                return items.concat({
                    id: id,
                    header: header,
                    type: type,
                    content: content.toString(),
                    dismissible: true,
                    onDismiss: (event) => {
                        setItems((items) =>
                            items.filter((item) => item.id !== id)
                        )
                    },
                })
            })
        }

    const flashbar = <Flashbar items={items} />

    return {
        flashbar,
        addError: addItem("Error", "error"),
        addInfo: addItem("Info:", "info"),
    }
}

const getOptions = (api: ApiPromise) => {
    const refTime = 8013742080
    const proofSize = 262144
    const gasLimit = api.registry.createType("WeightV2", {
        refTime,
        proofSize,
    }) as WeightV2
    const storageDepositLimit = null
    return {
        gasLimit,
        storageDepositLimit,
    }
}

export type Account =
    | { type: "injected"; account: InjectedAccountWithMeta }
    | {
          type: "internal"
          account: {
              address: string
              meta: {
                  name?: string
              }
          }
      }

const App = () => {
    const [apiPromise, setApiPromise] = useState<ApiPromise | null>(null)
    const [accounts, setAccounts] = useState<Account[]>([])
    const [selectedOption, setSelectedOption] =
        useState<OptionDefinition | null>(null)
    const [accountBalance, setAccountBalance] = useState<number>(0)
    const { flashbar, addError } = useFlashbar()
    const [value, setValue] = useState(0)
    const [staticInfo, setStaticInfo] = useState<StaticInfo>({
        ownerAddress: "",
        fee: 0,
        votingLength: 0,
    })

    const originAddress = selectedOption?.value
    const keyring = useRef(new Keyring({ type: "sr25519" }))

    useEffect(() => {
        const wsProvider = new WsProvider("wss://ws.test.azero.dev")
        ApiPromise.create({ provider: wsProvider })
            .then(setApiPromise)
            .catch(addError)
            .then(() => {
                web3Enable("Crowdfunding")
                    .then((extensions) => {
                        if (extensions.length === 0) {
                            return []
                        }
                        return web3Accounts()
                    })
                    .then((a) => {
                        let ab: Account[]
                        if (a.length === 0) {
                            ab = [
                                {
                                    type: "internal",
                                    account: {
                                        address: keyring.current.addFromUri(
                                            "wage author educate oil frame there room pave dad mechanic theory debris"
                                        ).address,
                                        meta: {
                                            name: "Alice",
                                        },
                                    },
                                },
                                {
                                    type: "internal",
                                    account: {
                                        address: keyring.current.addFromUri(
                                            "atom castle crucial vivid baby junior inner lawn father night follow year"
                                        ).address,
                                        meta: {
                                            name: "Bob",
                                        },
                                    },
                                },
                                {
                                    type: "internal",
                                    account: {
                                        address: keyring.current.addFromUri(
                                            "trial advice enter lumber wrap ordinary fame tumble together coach item addict"
                                        ).address,
                                        meta: {
                                            name: "Charlie",
                                        },
                                    },
                                },
                            ]
                        } else {
                            ab = a.map<Account>((account) => {
                                return { type: "injected", account: account }
                            })
                        }

                        setAccounts(ab)
                        if (ab.length > 0)
                            setSelectedOption({
                                label: ab[0].account.meta.name!,
                                value: ab[0].account.address,
                            })
                    })
                    .catch(console.log)
            })
    }, [])

    const api = useMemo(
        () =>
            apiPromise && originAddress
                ? new API(
                      apiPromise,
                      accounts.find(
                          (a) => a.account.address === originAddress
                      )!,
                      getOptions(apiPromise),
                      keyring.current
                  )
                : null,
        [apiPromise, originAddress]
    )

    useEffect(() => {
        if (api) api.getStaticInfo().then(setStaticInfo).catch()
    }, [api])

    useEffect(() => {
        if (api) api.getAccountBalance().then(setAccountBalance).catch()
    }, [api, originAddress, value])

    if (!api) {
        return (
            <AppLayout
                toolsHide={true}
                navigationHide={true}
                contentHeader={
                    <Header variant="h1">Crowdfunding platform</Header>
                }
                content={
                    <SpaceBetween size={"s"}>
                        {flashbar}
                        <Container>
                            <Spinner />
                        </Container>
                    </SpaceBetween>
                }
            />
        )
    }

    const accountSelector = (
        <SpaceBetween direction={"horizontal"} size={"s"}>
            <Button
                variant={"icon"}
                iconName={"refresh"}
                onClick={() => setValue((value) => value + 1)}
            />
            <Select
                selectedOption={selectedOption}
                onChange={({ detail }) => {
                    setSelectedOption(detail.selectedOption)
                }}
                loadingText={"select"}
                options={accounts.map((x) => {
                    return {
                        label: x.account.meta.name!,
                        value: x.account.address,
                    }
                })}
                selectedAriaLabel="Selected"
            />
            <Input disabled value={formatCurrency(accountBalance)} />
        </SpaceBetween>
    )

    return (
        <ApiContext.Provider value={api}>
            <AccountsContext.Provider value={accounts}>
                <OriginAddressContext.Provider value={originAddress!}>
                    <AccountContext.Provider value={accountSelector}>
                        <ForceUpdateContext.Provider
                            value={{
                                dependency: value,
                                forceUpdate: () =>
                                    setValue((value) => value + 1),
                            }}
                        >
                            <StaticInfoContext.Provider value={staticInfo}>
                                <HashRouter>
                                    <Routes>
                                        <Route path="/">
                                            <Route
                                                index
                                                element={<MainPage />}
                                            />
                                            <Route
                                                path={"projects/:projectName"}
                                                element={<ProjectView />}
                                            />
                                            <Route
                                                path="*"
                                                element={<NoPage />}
                                            />
                                        </Route>
                                    </Routes>
                                </HashRouter>
                            </StaticInfoContext.Provider>
                        </ForceUpdateContext.Provider>
                    </AccountContext.Provider>
                </OriginAddressContext.Provider>
            </AccountsContext.Provider>
        </ApiContext.Provider>
    )
}

export default App

import React, { useEffect, useState } from "react"
import {
    AppLayout,
    BarChart,
    Box,
    Button,
    ButtonDropdown,
    ColumnLayout,
    Container,
    FormField,
    Header,
    Icon,
    Input,
    ProgressBar,
    SpaceBetween,
    TextContent,
} from "@cloudscape-design/components"
import { useParams } from "react-router-dom"
import { ProjectInfo, ProjectVotes } from "../api/Types"
import {
    useAccounts,
    useAccountSelector,
    useApi,
    useFlashbar,
    useForceUpdate,
    useOriginAddress,
    useStaticInfo,
} from "../App"
import { formatCurrency } from "../utils/Utils"

const ProjectView = () => {
    const { projectName } = useParams()
    const [projectInfo, setProjectInfo] = useState<ProjectInfo>()
    const [raised, setRaised] = useState(0)
    const [contribution, setContribution] = useState(0)
    const [input, setInput] = useState("")
    const [votes, setVotes] = useState<ProjectVotes>({
        ovrVotedYes: 1,
        ovrVotedNo: 0,
    })
    const [refunded, setRefunded] = useState(false)
    const [claimed, setClaimed] = useState(false)
    const [vote, setVote] = useState<"Yes" | "No" | null>(null)

    const api = useApi()
    const originAddress = useOriginAddress()
    const accountSelector = useAccountSelector()
    const { flashbar, addError, addInfo } = useFlashbar()
    const accounts = useAccounts()

    const { dependency, forceUpdate } = useForceUpdate()

    const isAuthor = projectInfo?.author === originAddress

    const staticInfo = useStaticInfo()

    useEffect(() => {
        api.getProjectInfo(projectName!).then(setProjectInfo).catch(addError)
        api.getCollectedBudget(projectName!).then(setRaised).catch(addError)
        api.getDonatedAmount(projectName!, originAddress)
            .then(setContribution)
            .catch(addError)
        api.getVotingState(projectName!)
            .then(setVotes)
            .catch((e) => addError(`GetVotingState: ${e}`))
        api.getDonorRefunded(projectName!).then(setRefunded).catch(addError)
        api.getAuthorClaimed(projectName!).then(setClaimed).catch(addError)
        api.getVote(projectName!)
            .then((x) => (x ? setVote("Yes") : setVote("No")))
            .catch(() => setVote(null))
        // api.getCollectedBudgetSub(projectName!, {handleOk: setRaised, handleErr: addError}).catch(addError)
        // api.getDonatedAmountSub(projectName!, originAddress, {handleOk: setContribution, handleErr: addError}).catch(addError)
    }, [dependency, api, projectName, originAddress])

    const account = accounts.find(
        (account) => account.account.address === projectInfo?.author
    )

    const content = projectInfo ? (
        <SpaceBetween size={"l"}>
            <ColumnLayout columns={2} variant="text-grid">
                <SpaceBetween size="l">
                    <div>
                        <Box variant="awsui-key-label">Description</Box>
                        <div>{projectInfo.description}</div>
                    </div>
                    <div>
                        <Box variant="awsui-key-label">Creation time</Box>
                        <div>{projectInfo.createTime.toLocaleString()}</div>
                    </div>
                    <div>
                        <Box variant="awsui-key-label">Deadline</Box>
                        <div>{projectInfo.deadline.toLocaleString()}</div>
                    </div>
                    <div>
                        <Box variant="awsui-key-label">Voting deadline</Box>
                        <div>
                            {new Date(
                                projectInfo.deadline.valueOf() +
                                    staticInfo.votingLength
                            ).toLocaleString()}
                        </div>
                    </div>
                    <div>
                        <Box variant="awsui-key-label">Author</Box>
                        <div>{`${projectInfo.author}${
                            account ? ` (${account.account.meta.name})` : ""
                        }`}</div>
                    </div>
                    {claimed ? (
                        <div>
                            <Box variant="awsui-key-label">Status</Box>
                            <div>Author claimed</div>
                        </div>
                    ) : (
                        <></>
                    )}
                    {refunded ? (
                        <div>
                            <Box variant="awsui-key-label">Status</Box>
                            <div>You refunded</div>
                        </div>
                    ) : (
                        <></>
                    )}
                    {vote ? (
                        <div>
                            <Box variant="awsui-key-label">Your vote</Box>
                            <div>{vote}</div>
                        </div>
                    ) : (
                        <></>
                    )}
                </SpaceBetween>

                <SpaceBetween size="xxl">
                    <div>
                        <Box variant="awsui-key-label">Goal</Box>
                        <div>{formatCurrency(projectInfo.goal)}</div>
                    </div>
                    <div>
                        <Box variant="awsui-key-label">Raised</Box>
                        <div>{formatCurrency(raised)}</div>
                    </div>
                    <div>
                        <Box variant="awsui-key-label">My contribution</Box>
                        <div>{formatCurrency(contribution)}</div>
                    </div>
                    <div>
                        {raised < projectInfo.goal ? (
                            <ProgressBar
                                value={(raised / projectInfo.goal) * 100}
                            />
                        ) : (
                            <center>
                                <strong>The goal has been reached!</strong>
                            </center>
                        )}
                    </div>
                    {raised > 0 ? (
                        <BarChart
                            series={[
                                {
                                    title: "Yes",
                                    type: "bar",
                                    color: "#018977",
                                    valueFormatter: (e) =>
                                        `${((100 * e) / raised).toFixed(0)}%`,
                                    data: [
                                        { x: "Votes", y: votes.ovrVotedYes },
                                    ],
                                },
                                {
                                    title: "No",
                                    type: "bar",
                                    color: "#e07f9d",
                                    valueFormatter: (e) =>
                                        `${((100 * e) / raised).toFixed(0)}%`,
                                    data: [{ x: "Votes", y: votes.ovrVotedNo }],
                                },
                                {
                                    title: "Hasn't voted yet",
                                    type: "bar",
                                    color: "#486DE8",
                                    valueFormatter: (e) =>
                                        `${((100 * e) / raised).toFixed(0)}%`,
                                    data: [
                                        {
                                            x: "Votes",
                                            y:
                                                raised -
                                                votes.ovrVotedNo -
                                                votes.ovrVotedYes,
                                        },
                                    ],
                                },
                            ]}
                            xDomain={["Votes"]}
                            yDomain={[0, raised]}
                            height={10}
                            horizontalBars
                            hideFilter
                            loadingText="Loading chart"
                            recoveryText="Retry"
                            stackedBars
                            xScaleType="categorical"
                            xTitle="Voting"
                            empty={
                                <Box textAlign="center" color="inherit">
                                    <b>No data available</b>
                                    <Box variant="p" color="inherit">
                                        There is no data available
                                    </Box>
                                </Box>
                            }
                            noMatch={
                                <Box textAlign="center" color="inherit">
                                    <b>No matching data</b>
                                    <Box variant="p" color="inherit">
                                        There is no matching data to display
                                    </Box>
                                    <Button>Clear filter</Button>
                                </Box>
                            }
                        />
                    ) : (
                        <></>
                    )}

                    <FormField label={"Donate"}>
                        <SpaceBetween direction={"horizontal"} size={"s"}>
                            <Input
                                onChange={(event) =>
                                    setInput(event.detail.value)
                                }
                                inputMode={"numeric"}
                                placeholder={"Amount"}
                                value={input}
                            />
                            <ButtonDropdown
                                disabled={input === ""}
                                onItemClick={(event) => {
                                    const value =
                                        Number(input) *
                                        10 ** Number(event.detail.id)
                                    if (isNaN(value)) addError("Not a number")
                                    else {
                                        setInput("")
                                        api.makeDonation(projectName!, value, {
                                            handleOk: forceUpdate,
                                            handleErr: addError,
                                            handleInfo: addInfo,
                                        }).catch(addError)
                                    }
                                }}
                                items={[
                                    { text: "TZERO", id: "12" },
                                    { text: "mTZERO", id: "9" },
                                    { text: "µTZERO", id: "6" },
                                    { text: "nTZERO", id: "3" },
                                    { text: "pTZERO", id: "0" },
                                ]}
                            >
                                Donate
                            </ButtonDropdown>
                        </SpaceBetween>
                    </FormField>
                </SpaceBetween>
            </ColumnLayout>
        </SpaceBetween>
    ) : (
        <></>
    )

    return (
        <AppLayout
            key={""}
            toolsHide={true}
            navigationHide={true}
            contentHeader={
                <Header
                    variant={"h1"}
                    actions={
                        <SpaceBetween direction={"horizontal"} size={"m"}>
                            {accountSelector}
                        </SpaceBetween>
                    }
                >
                    Project information
                </Header>
            }
            content={
                <SpaceBetween size={"s"}>
                    {flashbar}
                    <Container
                        header={
                            <Header
                                actions={
                                    <SpaceBetween
                                        direction={"horizontal"}
                                        size={"s"}
                                    >
                                        <ButtonDropdown
                                            onItemClick={(event) =>
                                                api
                                                    .makeVote(
                                                        projectName!,
                                                        event.detail.id === "1",
                                                        {
                                                            handleOk:
                                                                forceUpdate,
                                                            handleErr: addError,
                                                            handleInfo: addInfo,
                                                        }
                                                    )
                                                    .catch(addError)
                                            }
                                            items={[
                                                { text: "Yes", id: "1" },
                                                { text: "No", id: "0" },
                                            ]}
                                        >
                                            Vote
                                        </ButtonDropdown>
                                        <Button
                                            onClick={() =>
                                                api
                                                    .refundDonation(
                                                        projectName!,
                                                        {
                                                            handleOk:
                                                                forceUpdate,
                                                            handleErr: addError,
                                                            handleInfo: addInfo,
                                                        }
                                                    )
                                                    .catch(addError)
                                            }
                                        >
                                            Refund
                                        </Button>
                                        <Button
                                            variant="primary"
                                            onClick={() =>
                                                api
                                                    .claimBudget(projectName!, {
                                                        handleOk: forceUpdate,
                                                        handleErr: addError,
                                                        handleInfo: addInfo,
                                                    })
                                                    .catch(addError)
                                            }
                                        >
                                            Claim
                                        </Button>
                                    </SpaceBetween>
                                }
                                variant={"h1"}
                                info={
                                    projectInfo?.author === originAddress ? (
                                        <Icon
                                            variant={"subtle"}
                                            name={"user-profile"}
                                        />
                                    ) : (
                                        <></>
                                    )
                                }
                            >
                                {projectName}
                            </Header>
                        }
                    >
                        {content}
                    </Container>
                    <TextContent>
                        ContractOwner: {staticInfo.ownerAddress}
                    </TextContent>
                    <TextContent>Fee: {staticInfo.fee}%</TextContent>
                </SpaceBetween>
            }
        />
    )
}

export default ProjectView

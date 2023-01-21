import React, {useEffect, useState} from 'react';
import {
    AppLayout,
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
    SpaceBetween
} from "@cloudscape-design/components";
import {useParams} from "react-router-dom";
import {ProjectInfo} from "../api/Types";
import {useAccounts, useAccountSelector, useApi, useFlashbar, useForceUpdate, useOriginAddress} from "../App";
import {formatCurrency} from "../utils/Utils";

const ProjectView = () => {

    const {projectName} = useParams()
    const [projectInfo, setProjectInfo] = useState<ProjectInfo>()
    const [raised, setRaised] = useState(0)
    const [contribution, setContribution] = useState(0)
    const [input, setInput] = useState("")

    const api = useApi()
    const originAddress = useOriginAddress()
    const accountSelector = useAccountSelector()
    const {flashbar, addError} = useFlashbar()
    const accounts = useAccounts()

    const {dependency, forceUpdate} = useForceUpdate()

    const isAuthor = projectInfo?.author === originAddress

    useEffect(() => {
        api.getProjectInfo(projectName!).then(setProjectInfo).catch(addError)
        api.getCollectedBudget(projectName!).then(setRaised).catch(addError)
        api.getDonatedAmount(projectName!, originAddress).then(setContribution).catch(addError)
        // api.getCollectedBudgetSub(projectName!, {handleOk: setRaised, handleErr: addError}).catch(addError)
        // api.getDonatedAmountSub(projectName!, originAddress, {handleOk: setContribution, handleErr: addError}).catch(addError)
    }, [dependency, api, projectName, originAddress])

    const account = accounts.find(account => account.address === projectInfo?.author)

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
                        <Box variant="awsui-key-label">Author</Box>
                        <div>{`${projectInfo.author}${account ? ` (${account.meta.name})` : ""}`}</div>
                    </div>
                </SpaceBetween>

                <SpaceBetween size="l">
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
                        {
                            raised < projectInfo.goal ?
                                <ProgressBar value={raised / projectInfo.goal * 100}/>
                                :
                                <center><strong>The goal has been reached!</strong></center>
                        }
                    </div>
                </SpaceBetween>
            </ColumnLayout>
            <Box float={"right"}>

                <FormField label={"Donate"}>
                    <SpaceBetween direction={"horizontal"} size={"s"}>
                        <Input onChange={event => setInput(event.detail.value)} inputMode={"numeric"}
                               placeholder={"Amount"} value={input}/>
                        <ButtonDropdown onItemClick={event => {
                            const value = Number(input) * 10 ** Number(event.detail.id)
                            if (isNaN(value))
                                addError("Not a number")
                            else {
                                setInput("")
                                api.makeDonation(
                                    projectName!,
                                    value,
                                    {
                                        handleOk: forceUpdate,
                                        handleErr: addError
                                    }).catch(addError)
                            }
                        }}
                                        items={[
                                            {text: "TZERO", id: "12"},
                                            {text: "mTZERO", id: "9"},
                                            {text: "µTZERO", id: "6"},
                                            {text: "nTZERO", id: "3"},
                                            {text: "pTZERO", id: "0"},
                                        ]}
                        >
                            Donate
                        </ButtonDropdown>
                    </SpaceBetween>
                </FormField>

            </Box>
        </SpaceBetween>
    ) : <></>

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
                                    <SpaceBetween direction={"horizontal"} size={"s"}>
                                        <Button onClick={() => api.refundDonation(projectName!, {
                                            handleOk: () => console.log("OK"),
                                            handleErr: addError
                                        }).catch(addError)}>
                                            Refund
                                        </Button>
                                        <Button variant="primary" onClick={() => api.claimBudget(projectName!, {
                                            handleOk: () => console.log("OK"),
                                            handleErr: addError
                                        }).catch(addError)}>
                                            Claim
                                        </Button>
                                    </SpaceBetween>
                                }
                                variant={"h1"}
                                info={projectInfo?.author === originAddress ?
                                    <Icon variant={"subtle"} name={"user-profile"}/> : <></>}
                            >
                                {projectName}
                            </Header>
                        }>

                        {content}
                    </Container>
                </SpaceBetween>
            }
        />
    )
}

export default ProjectView
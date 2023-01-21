import React, {useEffect, useState} from 'react';
import {
    AppLayout,
    Box,
    ColumnLayout,
    Container,
    Header,
    Icon,
    ProgressBar,
    SpaceBetween
} from "@cloudscape-design/components";
import {useParams} from "react-router-dom";
import {ProjectInfo} from "../api/Types";
import {useApi, useOriginAddress} from "../App";

const ProjectView = () => {

    const {projectName} = useParams()
    const [projectInfo, setProjectInfo] = useState<ProjectInfo>()
    const [raised, setRaised] = useState(0)

    const api = useApi()
    const originAddress = useOriginAddress()

    useEffect(() => {
        api.getProjectInfo(projectName!).then(setProjectInfo)
        api.getCollectedBudget(projectName!).then(setRaised)
    }, [projectName])

    const content = projectInfo ? (
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
            </SpaceBetween>

            <SpaceBetween size="l">
                <div>
                    <Box variant="awsui-key-label">Goal</Box>
                    <div>{projectInfo.goal}</div>
                </div>
                <div>
                    <Box variant="awsui-key-label">Raised</Box>
                    <div>{raised}</div>
                </div>
                <div>
                    <ProgressBar value={raised/projectInfo.goal*100}/>
                </div>
            </SpaceBetween>
        </ColumnLayout>
    ) : <></>

    return (
        <AppLayout
            toolsHide={true}
            navigationHide={true}
            contentHeader={
                <Header
                    variant={"h1"}
                    info={projectInfo?.author === originAddress ? <Icon variant={"subtle"} name={"user-profile"}/>: <></>}
                >
                    {projectName}
                </Header>
            }
            content={
            <Container>
                {content}
            </Container>
            }
        />
    )
}

export default ProjectView
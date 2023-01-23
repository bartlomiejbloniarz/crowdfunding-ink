import React from "react"
import {
    AppLayout,
    Header,
    SpaceBetween,
    TextContent,
} from "@cloudscape-design/components"
import CardsView from "./CardsView"
import { useAccountSelector, useStaticInfo } from "../App"

function MainPage() {
    const accountSelector = useAccountSelector()
    const staticInfo = useStaticInfo()

    return (
        <AppLayout
            toolsHide={true}
            navigationHide={true}
            contentHeader={
                <Header
                    actions={
                        <SpaceBetween direction={"horizontal"} size={"m"}>
                            {accountSelector}
                        </SpaceBetween>
                    }
                    variant="h1"
                >
                    Crowdfunding platform
                </Header>
            }
            content={
                <SpaceBetween size={"xs"}>
                    <CardsView />
                    <TextContent>
                        ContractOwner: {staticInfo.ownerAddress}
                    </TextContent>
                    <TextContent>Fee: {staticInfo.fee}%</TextContent>
                </SpaceBetween>
            }
        />
    )
}

export default MainPage

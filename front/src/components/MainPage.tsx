import React from "react";
import { AppLayout, Header, SpaceBetween } from "@cloudscape-design/components";
import CardsView from "./CardsView";
import { useAccountSelector } from "../App";

function MainPage() {
    const accountSelector = useAccountSelector();

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
            content={<CardsView />}
        />
    );
}

export default MainPage;

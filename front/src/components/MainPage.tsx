import React from 'react';
import {AppLayout, Header,} from "@cloudscape-design/components";
import CardsView from "./CardsView";

function MainPage() {

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
                <CardsView/>
            }
        />
    );
}

export default MainPage;

import React from 'react';
import {AppLayout, Header} from "@cloudscape-design/components";

const NoPage = () => {


    return (
        <AppLayout
            toolsHide={true}
            navigationHide={true}
            contentHeader={
                <Header
                    variant={"h1"}
                >
                    404 Page not found
                </Header>
            }
        />
    )
}

export default NoPage
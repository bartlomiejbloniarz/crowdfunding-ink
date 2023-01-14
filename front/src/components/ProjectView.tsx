import React from 'react';
import {AppLayout, Header, TextContent} from "@cloudscape-design/components";
import {useParams} from "react-router-dom";

const ProjectView = () => {

    const {id} = useParams()

    return (
        <AppLayout
            toolsHide={true}
            navigationHide={true}
            contentHeader={
                <Header
                    variant={"h1"}
                >
                    Page not implemented yet
                </Header>
            }
            content={
                <TextContent>
                    {`Project id: ${id}`}
                </TextContent>
            }
        />
    )
}

export default ProjectView
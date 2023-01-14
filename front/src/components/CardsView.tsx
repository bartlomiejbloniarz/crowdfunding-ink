import React from 'react';
import {
    Box,
    Button,
    Cards,
    Header,
    ProgressBar,
    SpaceBetween,
    TextFilter
} from "@cloudscape-design/components";

const items = [
    {
        name: "Project 1",
        description: "Raising money for ...",
        raised: 0,
        goal: 100
    },
    {
        name: "Project 2",
        description: "Raising money for ...",
        raised: 99,
        goal: 100
    },
    {
        name: "Project 3",
        description: "Raising money for ...",
        raised: 25,
        goal: 100
    },
    {
        name: "Project 4",
        description: "Raising money for ...",
        raised: 150,
        goal: 1000
    },
]

const CardsView = () => {
    const [
        filteringText,
        setFilteringText
    ] = React.useState("");

    return (
        <Cards
            cardDefinition={{
                header: e => e.name,
                sections: [
                    {
                        id: "description",
                        header: "Description",
                        content: e => e.description
                    },
                    {
                        id: "raised",
                        header: "Raised",
                        content: e => e.raised
                    },
                    {
                        id: "goal",
                        header: "Goal",
                        content: e => e.goal
                    },
                    {
                        id: "progress",
                        content: e => <ProgressBar value={e.raised/e.goal*100}/>
                    }
                ]
            }}
            cardsPerRow={[
                {cards: 1},
                {minWidth: 500, cards: 3}
            ]}
            items={items.filter(x => x.name.includes(filteringText))}
            loadingText="Loading resources"
            empty={
                <Box textAlign="center" color="inherit">
                    <b>No resources</b>
                    <Box
                        padding={{bottom: "s"}}
                        variant="p"
                        color="inherit"
                    >
                        No resources to display.
                    </Box>
                    <Button>Create resource</Button>
                </Box>
            }
            filter={
                <TextFilter filteringText={filteringText} filteringPlaceholder="Find resources" onChange={({detail}) =>
                    setFilteringText(detail.filteringText)
                }/>
            }
            header={
                <Header
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button variant="primary">
                                Create project
                            </Button>
                        </SpaceBetween>
                    }>
                    Projects
                </Header>
            }
        />
    )
}

export default CardsView
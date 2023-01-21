import React, {useEffect, useState} from 'react';
import {Box, Button, Cards, Header, ProgressBar, SpaceBetween, TextFilter} from "@cloudscape-design/components";
import Link from "../utils/Link";
import {useApi} from "../App";
import CreateForm from "./CreateForm";
import {formatCurrency} from "../utils/Utils";

interface ItemType{
    name: string,
    description: string,
    raised: number,
    goal: number
}


const CardsView = () => {
    const [filteringText, setFilteringText] = useState("");
    const [projects, setProjects] = useState(["BB fund", "BB fund 2", "BB fund 3", "BB fund 4", "BB fund 5", "BB fund 6"])
    const [items, setItems] = useState<ItemType[]>([])
    const [isFormVisible, setIsFormVisible] = useState(false)

    const api = useApi()

    useEffect(() => {
        const getProjectsInfo = async () => {
            const res: ItemType[] = []

            for (const index in projects) {
                const project = projects[index]
                const info = await api.getProjectInfo(project)
                const raised = await api.getCollectedBudget(project)

                res.push(
                    {
                        description: info.description,
                        goal: info.goal,
                        name: project,
                        raised: raised
                    }
                )
            }

            return res
        }

        getProjectsInfo().then(setItems).catch(console.log)
    }, [api, projects])

    return (
        <>
        <CreateForm visible={isFormVisible} dismiss={() => setIsFormVisible(false)}/>
        <Cards
            cardDefinition={{
                header: e => <Link fontSize={"heading-m"} href={`/projects/${e.name}`} >{e.name}</Link>,
                sections: [
                    {
                        id: "description",
                        header: "Description",
                        content: e => e.description
                    },
                    {
                        id: "raised",
                        header: "Raised",
                        content: e => formatCurrency(e.raised)
                    },
                    {
                        id: "goal",
                        header: "Goal",
                        content: e => formatCurrency(e.goal)
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
                        <SpaceBetween direction="horizontal" size="m">
                            <Button variant="primary" onClick={() => setIsFormVisible(true)}>
                                Create project
                            </Button>
                        </SpaceBetween>
                    }>
                    Projects
                </Header>
            }
        />
        </>
    )
}

export default CardsView
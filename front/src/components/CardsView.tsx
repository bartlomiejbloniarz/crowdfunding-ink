import React, {useEffect, useState} from 'react';
import {Box, Button, Cards, Header, ProgressBar, Select, SpaceBetween, TextFilter} from "@cloudscape-design/components";
import Link from "../utils/Link";
import {useAccounts, useAccountSelect, useApi} from "../App";
import CreateForm from "./CreateForm";

interface ItemType{
    name: string,
    description: string,
    raised: number,
    goal: number
}


const CardsView = () => {
    const [filteringText, setFilteringText] = useState("");
    const [projects, setProjects] = useState(["BB fund", "BB fund 2", "BB fund 3", "BB fund 4"])
    const [items, setItems] = useState<ItemType[]>([])
    const [isFormVisible, setIsFormVisible] = useState(false)
    const {selectedAccount, setSelectedAccount} = useAccountSelect()

    const api = useApi()
    const accounts = useAccounts()

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
    }, [projects])

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
                            <Select selectedOption={selectedAccount}
                                                    onChange={({detail}) => {
                                                        setSelectedAccount(detail.selectedOption)
                                                    }
                                                    }
                                                    loadingText={"select"}
                                                    options={accounts.map(x => {
                                                        return {label: x.meta.name!, value: x.address}
                                                    })}
                                                    selectedAriaLabel="Selected"/>
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
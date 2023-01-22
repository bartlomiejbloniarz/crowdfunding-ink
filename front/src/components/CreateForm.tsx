import * as React from "react"
import Modal from "@cloudscape-design/components/modal"
import {
    Box,
    Button,
    DatePicker,
    Form,
    FormField,
    Input,
    Select,
    SpaceBetween,
    Textarea,
    TimeInput,
} from "@cloudscape-design/components"
import { useApi, useFlashbar } from "../App"
import { useState } from "react"
import { OptionDefinition } from "@cloudscape-design/components/internal/components/option/interfaces"

const CreateForm = (props: { visible: boolean; dismiss: () => void }) => {
    const [name, setName] = React.useState("")
    const [goal, setGoal] = React.useState("")
    const [description, setDescription] = React.useState("")
    const [date, setDate] = React.useState("")
    const [time, setTime] = React.useState("")
    const [selectedOption, setSelectedOption] = useState<OptionDefinition>({
        label: "pTZERO",
        value: "0",
    })

    const api = useApi()

    const { flashbar, addError } = useFlashbar()

    const submit = async () => {
        const value = Number(goal) * 10 ** Number(selectedOption.value)
        if (isNaN(value)) addError("Not a number")
        else
            api.createProject(name, description, date + " " + time, value)
                .then(props.dismiss)
                .catch(addError)
    }

    return (
        <Modal
            visible={props.visible}
            onDismiss={props.dismiss}
            closeAriaLabel="Close modal"
            footer={
                <Box float="right">
                    <SpaceBetween direction="horizontal" size="xs">
                        <Button variant="link" onClick={props.dismiss}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={submit}>
                            Create
                        </Button>
                    </SpaceBetween>
                </Box>
            }
            header="Modal title"
        >
            {flashbar}
            <Form>
                <SpaceBetween key={"1"} size={"xs"}>
                    <FormField label="Name">
                        <Input
                            value={name}
                            onChange={(event) => setName(event.detail.value)}
                        />
                    </FormField>
                    <FormField label="Description">
                        <Textarea
                            value={description}
                            onChange={(event) =>
                                setDescription(event.detail.value)
                            }
                        />
                    </FormField>
                    <FormField
                        label="Deadline"
                        constraintText="Use YYYY/MM/DD format."
                    >
                        <SpaceBetween direction={"horizontal"} size={"s"}>
                            <DatePicker
                                onChange={({ detail }) => setDate(detail.value)}
                                value={date}
                                openCalendarAriaLabel={(selectedDate) =>
                                    "Choose date" +
                                    (selectedDate
                                        ? `, selected date is ${selectedDate}`
                                        : "")
                                }
                                nextMonthAriaLabel="Next month"
                                placeholder="YYYY/MM/DD"
                                previousMonthAriaLabel="Previous month"
                                todayAriaLabel="Today"
                            />
                            <TimeInput
                                onChange={({ detail }) => setTime(detail.value)}
                                value={time}
                                format="hh:mm"
                                placeholder="hh:mm"
                            />
                        </SpaceBetween>
                    </FormField>
                    <FormField label="Goal">
                        <SpaceBetween direction={"horizontal"} size={"s"}>
                            <Input
                                value={goal}
                                onChange={(event) =>
                                    setGoal(event.detail.value)
                                }
                            />
                            <Select
                                selectedOption={selectedOption}
                                onChange={({ detail }) => {
                                    setSelectedOption(detail.selectedOption)
                                }}
                                options={[
                                    { label: "TZERO", value: "12" },
                                    { label: "mTZERO", value: "9" },
                                    { label: "µTZERO", value: "6" },
                                    { label: "nTZERO", value: "3" },
                                    { label: "pTZERO", value: "0" },
                                ]}
                            />
                        </SpaceBetween>
                    </FormField>
                </SpaceBetween>
            </Form>
        </Modal>
    )
}

export default CreateForm

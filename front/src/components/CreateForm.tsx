import * as React from "react";
import Modal from "@cloudscape-design/components/modal";
import {Box, Button, DatePicker, Form, FormField, Input, SpaceBetween, TimeInput} from "@cloudscape-design/components";
import {useApi} from "../App";

const CreateForm = (props: {visible: boolean, dismiss: () => void}) => {
    const [name, setName] = React.useState("");
    const [goal, setGoal] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [date, setDate] = React.useState("");
    const [time, setTime] = React.useState("")

    const api = useApi()

    const submit = async () => {
        api.createProject(name, description, date+" "+time, goal).then(props.dismiss).catch(console.log)
    }

    return (
        <Modal
            visible={props.visible}
            onDismiss={props.dismiss}
            closeAriaLabel="Close modal"
            footer={
                <Box float="right">
                    <SpaceBetween direction="horizontal" size="xs">
                        <Button variant="link" onClick={props.dismiss}>Cancel</Button>
                        <Button variant="primary" onClick={submit}>Ok</Button>
                    </SpaceBetween>
                </Box>
            }
            header="Modal title"
        >
            <Form>
                <SpaceBetween key={"1"} size={"xs"}>
                    <FormField
                        label="Name"
                    >
                        <Input
                            value={name}
                            onChange={event =>
                                setName(event.detail.value)
                            }
                        />
                    </FormField>
                    <FormField
                        label="Description"
                    >
                        <Input
                            value={description}
                            onChange={event =>
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
                                onChange={({detail}) => setDate(detail.value)}
                                value={date}
                                openCalendarAriaLabel={selectedDate =>
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
                                onChange={({detail}) => setTime(detail.value)}
                                value={time}
                                format="hh:mm"
                                placeholder="hh:mm"
                            />
                        </SpaceBetween>
                    </FormField>
                    <FormField
                        label="Goal"
                    >
                        <Input
                            value={goal}
                            onChange={event =>
                                setGoal(event.detail.value)
                            }
                        />
                    </FormField>
                </SpaceBetween>
            </Form>
        </Modal>
    );
}

export default CreateForm
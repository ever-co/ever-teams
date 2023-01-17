import React, { FC, useEffect, useState } from "react"
import { View, StyleSheet, TextInput, Text, TouchableOpacity, Dimensions } from "react-native"
import { ActivityIndicator } from "react-native-paper";
import { GLOBAL_STYLE as GS } from "../../assets/ts/styles";
import { useStores } from "../models";
import ComboBox from "../screens/Authenticated/TimerScreen/components/ComboBox";
import EstimateTime from "../screens/Authenticated/TimerScreen/components/EstimateTime";
import TaskStatusDropdown from "../screens/Authenticated/TimerScreen/components/TaskStatusDropdown";
import { ITeamTask } from "../services/interfaces/ITask";
import { Feather } from '@expo/vector-icons';
import { observer } from "mobx-react-lite";
import TaskSize from "./TaskSize";
import TaskPriorities from "./TaskPriorities";
import TaskLabel from "./TaskLabel";
import { typography } from "../theme";
import { useTeamTasks } from "../services/hooks/features/useTeamTasks";
import { translate } from "../i18n";
import { useAppTheme } from "../app";
import TaskStatus from "../screens/Authenticated/ProfileScreen/components/TaskStatus";

const { width, height } = Dimensions.get("window");


const ManageTaskCard = observer(() => {
    const {
        TaskStore: { teamTasks, activeTask },
    } = useStores();

    const { colors } = useAppTheme()
    const { createNewTask, setActiveTeamTask } = useTeamTasks();

    const [showCombo, setShowCombo] = useState(false)
    const [taskInputText, setTaskInputText] = useState<string>("")
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showCheckIcon, setShowCheckIcon] = useState<boolean>(false)


    const onCreateNewTask = async () => {
        setShowCheckIcon(false)
        setIsLoading(true)
        await createNewTask(taskInputText)
        setIsLoading(false)
        setShowCombo(false)
    }


    const handleChangeText = (value: string) => {
        setTaskInputText(value)
        if (value.trim().length > 0) {
            setShowCombo(true)
            setShowCheckIcon(false)
        } else {
            setShowCombo(false)
        }

        if (value.trim().length >= 3) {
            setShowCheckIcon(true)
        }
    }

    const handleActiveTask = (value: ITeamTask) => {
        setActiveTeamTask(value);
        setShowCheckIcon(false)
        setTaskInputText(value.title)
        setShowCombo(false)
    }

    useEffect(() => {
        setTaskInputText(activeTask && activeTask.title)
    }, [])

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.wrapInput,
                    {
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: colors.background,
                        borderColor: colors.border
                    },
                ]}
            >
                <TextInput
                    selectionColor={colors.primary}
                    placeholderTextColor={colors.tertiary}
                    style={[styles.textInput, { backgroundColor: colors.background, color: colors.primary }]}
                    placeholder={translate("myWorkScreen.taskFieldPlaceholder")}
                    value={taskInputText}
                    autoCorrect={false}
                    onBlur={() => setShowCombo(false)}
                    onFocus={() => setShowCombo(true)}
                    onPressOut={() => setShowCombo(false)}
                    onChangeText={(newText) => handleChangeText(newText)}
                />
                {showCheckIcon && (
                    <TouchableOpacity onPress={() => onCreateNewTask()}>
                        <Feather name="check" size={24} color="green" />
                    </TouchableOpacity>
                )}
                {isLoading ? <ActivityIndicator color="#1B005D" style={styles.loading} /> : null}
            </View>

            {showCombo ? <ComboBox onCreateNewTask={onCreateNewTask} handleActiveTask={handleActiveTask} /> :
                <View>
                    <View
                        style={{
                            width: "100%",
                            flexDirection: "row",
                            marginVertical: 20,
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: "center" }}>
                            <Text style={{ textAlign: 'center', fontSize: 12, color: colors.tertiary }}>{translate("myWorkScreen.estimateLabel")}: </Text>
                            <EstimateTime currentTask={activeTask} />
                        </View>
                        <TaskSize />
                    </View>
                    <View style={{ flexDirection: "row", width: "100%", justifyContent: "space-between", zIndex: 1000 }}>

                        <View style={{ width: 136, height: 32 }}>
                            <TaskStatus
                                containerStyle={{ ...styles.statusContainer, backgroundColor: "#F2F2F2" }}
                                dropdownContainerStyle={{
                                    top: 34,
                                    width: "100%"
                                }}
                                task={activeTask}
                            />
                        </View>
                        <TaskPriorities />
                    </View>
                    <View style={{ width: "100%", marginVertical: 20, zIndex: 999 }}>
                        <TaskLabel containerStyle={{ width: "100%" }} />
                    </View>
                </View>
            }
        </View>
    )
})
export default ManageTaskCard;

const styles = StyleSheet.create({
    container: {

    },
    mainContainer: {
        paddingTop: 30,
        backgroundColor: "#fff",
        borderRadius: 25,
        padding: 20,
        ...GS.noBorder,
        borderWidth: 1,
        elevation: 5,
        shadowColor: "#1B005D0D",
        shadowOffset: { width: 10, height: 10.5 },
        shadowOpacity: 1,
        shadowRadius: 15,
    },
    estimate: {
        color: "#9490A0",
        fontWeight: "600",
        fontSize: 12,
        marginBottom: 10,
        alignSelf: "flex-end",
    },
    working: {
        color: "#9490A0",
        fontWeight: "600",
        marginBottom: 10,
    },
    horizontal: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 20,
    },
    textInput: {
        color: "rgba(40, 32, 72, 0.4)",
        width: "90%",
        height: 43,
        paddingVertical: 13,
        paddingHorizontal: 16,
        backgroundColor: "#fff",
        borderRadius: 10,
        fontSize: 12,
        fontFamily: typography.fonts.PlusJakartaSans.semiBold
    },
    textInputOne: {
        height: 30,
    },
    horizontalInput: {
        flexDirection: "row",
        alignItems: "flex-end",
    },
    dashed: {
        borderBottomColor: "#fff",
        borderBottomWidth: 10,
    },
    wrapInput: {
        width: "100%",
        height: 45,
        backgroundColor: "#fff",
        borderColor: "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 2
    },
    loading: {
        position: 'absolute',
        right: 10,
        top: 15
    },
    statusContainer: {
        paddingHorizontal: 9,
        alignItems: "center",
        width: 136,
        height: 32,
        borderColor: "transparent",
    }

})
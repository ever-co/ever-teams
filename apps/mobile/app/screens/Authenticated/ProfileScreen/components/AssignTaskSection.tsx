import React, { FC, useState } from "react"
import { View, Text, ViewStyle, Modal, StyleSheet, TextInput, Animated, Dimensions, TouchableOpacity } from "react-native"


// COMPONENTS

// STYLES
import { CONSTANT_SIZE, GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { spacing, typography } from "../../../../theme"

import { ActivityIndicator } from "react-native-paper";
import TaskLabel from "../../../../components/TaskLabel";
import TaskPriorities from "../../../../components/TaskPriorities";
import TaskStatusDropdown from "../../TimerScreen/components/TaskStatusDropdown";
import TaskSize from "../../../../components/TaskSize";
import EstimateTime from "../../TimerScreen/components/EstimateTime";
import { useStores } from "../../../../models";
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks";
import { translate } from "../../../../i18n";
import { useAppTheme } from "../../../../app";
import useProfileScreenLogic from "../logics/useProfileScreenLogic";

export interface Props {
    visible: boolean
    memberId: string,
    onDismiss: () => unknown
}
const { width, height } = Dimensions.get("window");
const ModalPopUp = ({ visible, children }) => {
    const [showModal, setShowModal] = React.useState(visible)
    const scaleValue = React.useRef(new Animated.Value(0)).current

    React.useEffect(() => {
        toggleModal()
    }, [visible])
    const toggleModal = () => {
        if (visible) {
            setShowModal(true)
            Animated.spring(scaleValue, {
                toValue: 1,
                useNativeDriver: true,
            }).start()
        } else {
            setTimeout(() => setShowModal(false), 200)
            Animated.timing(scaleValue, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start()
        }
    }
    return (
        <Modal animationType="fade" transparent visible={showModal}>
            <View style={$modalBackGround}>
                <Animated.View style={[{ transform: [{ scale: scaleValue }] }]}>
                    {children}
                </Animated.View>
            </View>
        </Modal>
    )
}

const AssingTaskFormModal: FC<Props> = function InviteUserModal({ visible, onDismiss, memberId }) {
    const {
        authenticationStore: { user },
        TaskStore: { fetchingTasks },
    } = useStores();

    const { createAndAssign } = useProfileScreenLogic({userId:memberId, activeTabIndex:1});

    const isAuthUser = user?.id === memberId;

    const [taskInputText, setTaskInputText] = useState<string>("")
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showCheckIcon, setShowCheckIcon] = useState<boolean>(false)

const {colors}=useAppTheme();

    const onCreateNewTask = async () => {
        setShowCheckIcon(false)
        setIsLoading(true)
        await createAndAssign(taskInputText);
        setIsLoading(false)
        setTaskInputText("")
        onDismiss();
    }


    const handleChangeText = (value: string) => {
        setTaskInputText(value)
        if (value.trim().length > 0) {
            setShowCheckIcon(false)
        }
        if (value.trim().length >= 3) {
            setShowCheckIcon(true)
        }
    }


    return (
        <ModalPopUp visible={visible}>
            <View style={[styles.mainContainer,{backgroundColor:colors.background}]}>
                <View style={{ width: "100%", marginBottom: 20 }}>
                    <Text style={[styles.mainTitle,{color:colors.primary}]}>{isAuthUser ? translate("tasksScreen.createTaskButton") : translate("tasksScreen.assignTaskButton")}</Text>
                </View>
                <View style={{ width: "100%" }}>
                    <View style={{}}>
                        <View
                            style={[
                                styles.wrapInput,
                                {
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    backgroundColor:colors.background,
                                    borderColor:colors.border
                                },
                            ]}
                        >
                            <TextInput
                                selectionColor={colors.primary}
                                placeholderTextColor={colors.tertiary}
                                style={[styles.textInput,{color:colors.primary, backgroundColor:colors.background}]}
                                defaultValue={""}
                                autoCorrect={false}
                                autoCapitalize={"none"}
                                placeholder={translate("myWorkScreen.taskFieldPlaceholder")}
                                value={taskInputText}
                                onChangeText={(newText) => handleChangeText(newText)}
                            />
                            {isLoading ? <ActivityIndicator color="#1B005D" style={styles.loading} /> : null}
                        </View>

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
                                    <Text style={{ textAlign: 'center', fontSize: 12, color: "#7E7991" }}>{translate("myWorkScreen.estimateLabel")}: </Text>
                                    <EstimateTime currentTask={undefined} />
                                </View>
                                <TaskSize />
                            </View>
                            <View style={{ flexDirection: "row", width: "100%", justifyContent: "space-between", zIndex: 1000 }}>

                                <View style={{ width: 136, height: 32 }}>
                                    <TaskStatusDropdown task={undefined} />
                                </View>
                                <TaskPriorities />
                            </View>
                            <View style={{ width: "100%", marginVertical: 20, zIndex: 999 }}>
                                <TaskLabel />
                            </View>
                        </View>
                    </View>
                    <View style={styles.wrapButtons}>
                        <TouchableOpacity onPress={() => onDismiss()} style={[styles.button, { backgroundColor: "#E6E6E9" }]}>
                            <Text style={[styles.buttonText, { color: "#1A1C1E" }]}>{translate("common.cancel")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, { backgroundColor: "#3826A6", opacity: isLoading ? 0.6 : 1 }]} onPress={() => onCreateNewTask()}>
                            <Text style={styles.buttonText}>{isAuthUser ? translate("tasksScreen.createButton") : translate("tasksScreen.assignButton")}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </ModalPopUp>
    )
}

export default AssingTaskFormModal

const $container: ViewStyle = {
    ...GS.flex1,
    paddingTop: spacing.extraLarge + spacing.large,
    paddingHorizontal: spacing.large,
}
const $modalBackGround: ViewStyle = {
    flex: 1,
    backgroundColor: "#000000AA",

    justifyContent: "flex-end"

}

const $modalContainer: ViewStyle = {
    width: "100%",
    height: height,
    backgroundColor: "white",
    paddingHorizontal: 30,
    paddingVertical: 30,
    borderRadius: 30,
    elevation: 20,
    justifyContent: 'center'
}

const styles = StyleSheet.create({
    mainContainer: {
        width: "100%",
        alignItems: "center",
        height: height / 2,
        shadowColor: "#1B005D0D",
        shadowOffset: { width: 10, height: 10 },
        shadowRadius: 10,
        backgroundColor: "#fff",
        borderTopRightRadius: 24,
        borderTopLeftRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 30,
        borderColor: "#1B005D0D",
        borderWidth: 2,
    },
    theTextField: {
        borderWidth: 0,
        width: "100%",
    },
    blueBottom: {
        borderBottomWidth: 2,
        borderColor: "#1B005D",
        width: "100%",
        marginBottom: 25,
    },
    wrapButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 10
    },
    button: {
        width: width / 2.5,
        height: height / 16,
        borderRadius: 11,
        padding: 10,
        justifyContent: "center",
        alignItems: "center"
    },
    mainTitle: {
        fontFamily: typography.primary.semiBold,
        fontSize: 24,
    },
    buttonText: {
        fontFamily: typography.primary.semiBold,
        fontSize: 18,
        color: "#FFF"
    },
    crossIcon: {
        position: "absolute",
        right: 10,
        top: 10
    },
    loading: {
        position: 'absolute',
        right: 10,
        top: 11
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

    wrapInput: {
        width: "100%",
        height: 45,
        backgroundColor: "#fff",
        borderColor: "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 2
    }
})

import React, { FC } from "react";
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, TextStyle, ScrollView, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AntDesign, Feather, FontAwesome } from "@expo/vector-icons"

import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { ITaskLabel } from "../../../../services/interfaces/ITask";
import { observer } from "mobx-react-lite";
import { useAppTheme } from "../../../../app";
import { typography } from "../../../../theme";
import { useStores } from "../../../../models";
import { BadgedTaskLabel, getBackground } from "../../../../components/LabelIcon";


interface TaskLabelFilterProps {
    containerStyle?: ViewStyle;
    statusTextSyle?: TextStyle;
    dropdownContainerStyle?: ViewStyle;
    showLabelPopup: boolean;
    setShowLabelPopup: (value: boolean) => unknown
}

const { width, height } = Dimensions.get("window")


const TaskLabelFilter: FC<TaskLabelFilterProps> = observer(({ containerStyle, statusTextSyle, dropdownContainerStyle, setShowLabelPopup, showLabelPopup }) => {
    const { TaskStore: { filter } } = useStores();
    const { colors, dark } = useAppTheme();
    const labels = filter.labels;

    if (dark) {
        return (
            <>
                <TouchableOpacity onPress={() => setShowLabelPopup(!showLabelPopup)}>
                    <LinearGradient
                        colors={["#E6BF93", "#D87555"]}
                        end={{ y: 0.5, x: 1 }}
                        start={{ y: 1, x: 0 }}
                        style={{ ...styles.container, ...containerStyle, backgroundColor: "#F2F2F2" }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Text style={{ marginRight: 10 }}>Label</Text>
                            {labels.length === 0 ? null : <FontAwesome name="circle" size={24} color="#3826A6" />}
                        </View>
                        <AntDesign name="down" size={14} color={colors.primary} />
                    </LinearGradient>
                </TouchableOpacity>
                {showLabelPopup &&
                    <TaskLabelFilterDropDown
                        dropdownContainer={dropdownContainerStyle}
                    />}
            </>
        )
    }


    return (
        <>
            <TouchableOpacity onPress={() => setShowLabelPopup(!showLabelPopup)} >
                <View style={{ ...styles.container, ...containerStyle }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={{ marginRight: 10 }}>Label</Text>
                        {labels.length === 0 ? null : <FontAwesome name="circle" size={24} color="#3826A6" />}
                    </View>
                    <AntDesign name="down" size={14} color={colors.primary} />
                </View>
            </TouchableOpacity>
            {showLabelPopup &&
                <TaskLabelFilterDropDown
                    dropdownContainer={dropdownContainerStyle}
                />}
        </>
    )
})


interface DropDownProps {
    dropdownContainer?: ViewStyle;
    onChangeStatus?: (status: string) => unknown
}


const TaskLabelFilterDropDown: FC<DropDownProps> = observer(({ dropdownContainer, onChangeStatus }) => {
    const { colors, dark } = useAppTheme();
    const labels: ITaskLabel[] = ["UI/UX", "Mobile", "Web", "Tablet"]

    return (
        <View style={[styles.dropdownContainer, dropdownContainer, { backgroundColor: colors.background, shadowColor: dark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)" }]}>
            <View style={styles.secondContainer}>
                <Text style={[styles.dropdownTitle, { color: colors.primary }]}>Labels</Text>
                <ScrollView bounces={false} style={{ paddingHorizontal: 16, height: height / 2.55 }}>
                    {labels.map((item, idx) => (
                        <DropDownItem label={item} key={idx} />
                    ))}
                </ScrollView>
            </View>
        </View>
    )
})

const DropDownItem = observer(({ label }: { label: ITaskLabel }) => {
    const { TaskStore: { filter, setFilter } } = useStores();
    const labels = filter.labels
    const exist = labels.find((s) => s === label);

    const onSelectedLabel = () => {
        if (exist) {
            const newStatuses = labels.filter((s) => s !== label)
            setFilter({
                ...filter,
                labels: newStatuses
            })
        } else {
            setFilter({
                ...filter,
                labels: [...labels, label]
            })
        }
    }

    return (
        <TouchableOpacity style={styles.itemContainer} onPress={() => onSelectedLabel()}>
            <View style={[styles.dropdownItem, { backgroundColor: getBackground({ label: label }) }]}>
                <BadgedTaskLabel size={14} label={label} showColor={false} />
            </View>
            {exist ? <AntDesign name="checkcircle" size={24} color="#27AE60" /> :
                <Feather name="circle" size={24} color="rgba(40, 32, 72, 0.43)" />}
        </TouchableOpacity>
    )
})

const styles = StyleSheet.create({
    container: {
        minWidth: 100,
        borderColor: "rgba(0,0,0,0.16)",
        borderWidth: 1,
        minHeight: 30,
        alignItems: "center",
        paddingHorizontal: 8,
        justifyContent: "space-between",
        flexDirection: "row",
        borderRadius: 10
    },
    dropdownContainer: {
        position: "absolute",
        top: 47,
        minWidth: width - 18,
        borderRadius: 20,
        minHeight: height / 2.3,
        left: -(height / 67),
        zIndex: 100,
        ...GS.noBorder,
        borderWidth: 1,
        elevation: 10,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 10,
    },
    itemContainer: {
        width: "100%",
        flexDirection: "row",
        borderColor: "rgba(0,0,0,0.2)",
        borderWidth: 1,
        marginVertical: 5,
        justifyContent: "space-between",
        borderRadius: 10,
        alignItems: "center",
        paddingLeft: 6,
        paddingRight: 18,
        height: 56
    },
    secondContainer: {
        marginVertical: 16,
    },
    dropdownItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        width: "60%",
        height: 44,
        borderRadius: 10,
        elevation: 10,
        shadowColor: "rgba(0,0,0,0.1)",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 1,
    },
    dropdownTitle: {
        fontSize: 14,
        marginBottom: 5,
        marginLeft: 16,
        fontFamily: typography.primary.semiBold
    }
})

export default TaskLabelFilter;
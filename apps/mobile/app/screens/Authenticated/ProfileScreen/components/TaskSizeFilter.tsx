import React, { FC } from "react";
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, TextStyle, ScrollView, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AntDesign, Feather, FontAwesome } from "@expo/vector-icons"
import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { observer } from "mobx-react-lite";
import { useAppTheme } from "../../../../app";
import { typography } from "../../../../theme";
import { useStores } from "../../../../models";
import { BadgedTaskSize, getBackground } from "../../../../components/SizeIcon";
import { ITaskSize } from "../../../../services/interfaces/ITask";


interface TaskSizeFilterProps {
    containerStyle?: ViewStyle;
    statusTextSyle?: TextStyle;
    dropdownContainerStyle?: ViewStyle;
    showSizePopup: boolean;
    setShowSizePopup: (value: boolean) => unknown
}

const { width, height } = Dimensions.get("window")

const TaskSizeFilter: FC<TaskSizeFilterProps> = observer(({ containerStyle, statusTextSyle, dropdownContainerStyle, setShowSizePopup, showSizePopup }) => {

    const { TaskStore: { filter } } = useStores();
    const { colors, dark } = useAppTheme();

    const sizes = filter.sizes;

    if (dark) {
        return (
            <>
                <TouchableOpacity onPress={() => setShowSizePopup(!showSizePopup)}>
                    <LinearGradient
                        colors={["#E6BF93", "#D87555"]}
                        end={{ y: 0.5, x: 1 }}
                        start={{ y: 1, x: 0 }}
                        style={{ ...styles.container, ...containerStyle, backgroundColor: "#F2F2F2" }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Text style={{ marginRight: 10 }}>Sizes</Text>
                            {sizes.length === 0 ? null : <FontAwesome name="circle" size={24} color="#3826A6" />}
                        </View>
                        <AntDesign name="down" size={14} color={colors.primary} />
                    </LinearGradient>
                </TouchableOpacity>
                {showSizePopup &&
                    <TaskSizeFilterDropDown
                        dropdownContainer={dropdownContainerStyle}
                    />}
            </>
        )
    }


    return (
        <>
            <TouchableOpacity onPress={() => setShowSizePopup(!showSizePopup)} >
                <View style={{ ...styles.container, ...containerStyle }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={{ marginRight: 10 }}>Sizes</Text>
                        {sizes.length === 0 ? null : <FontAwesome name="circle" size={24} color="#3826A6" />}
                    </View>
                    <AntDesign name="down" size={14} color={colors.primary} />
                </View>
            </TouchableOpacity>
            {showSizePopup &&
                <TaskSizeFilterDropDown
                    dropdownContainer={dropdownContainerStyle}
                />}
        </>
    )
})

interface DropDownProps {
    dropdownContainer?: ViewStyle;
}

const TaskSizeFilterDropDown: FC<DropDownProps> = observer(({ dropdownContainer }) => {
    const { colors, dark } = useAppTheme();
    const sizes: ITaskSize[] = ["Tiny", "Small", "Medium", "Large", "Extra Large"]

    return (
        <View style={[styles.dropdownContainer, dropdownContainer, { backgroundColor: colors.background, shadowColor: dark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)" }]}>
            <View style={styles.secondContainer}>
                <Text style={[styles.dropdownTitle, { color: colors.primary }]}>Sizes</Text>
                <ScrollView bounces={false} style={{ paddingHorizontal: 16, height: height / 2.55 }}>
                    {sizes.map((item, idx) => (
                        <DropDownItem size={item} key={idx} />
                    ))}
                </ScrollView>
            </View>
        </View>
    )
})

const DropDownItem = observer(({ size }: { size: ITaskSize }) => {
    const { TaskStore: { filter, setFilter } } = useStores();
    const sizes = filter.sizes
    const exist = sizes.find((s) => s === size);

    const onSelectedStatus = () => {
        if (exist) {
            const newStatuses = sizes.filter((s) => s !== size)
            setFilter({
                ...filter,
                sizes: newStatuses
            })
        } else {
            setFilter({
                ...filter,
                sizes: [...sizes, size]
            })
        }
    }

    return (
        <TouchableOpacity style={styles.itemContainer} onPress={() => onSelectedStatus()}>
            <View style={[styles.dropdownItem, { backgroundColor: getBackground({ size: size }) }]}>
                <BadgedTaskSize fontSize={14} size={size} showColor={false} />
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

export default TaskSizeFilter;
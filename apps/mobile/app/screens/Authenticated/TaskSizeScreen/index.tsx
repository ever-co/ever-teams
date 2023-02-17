import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ViewStyle, TouchableOpacity, StyleSheet, ScrollView, TextInput, Dimensions } from "react-native"
import { useAppTheme } from "../../../app";
import { AntDesign, Ionicons } from "@expo/vector-icons"
import { Screen } from "../../../components";
import { AuthenticatedDrawerScreenProps } from "../../../navigators/AuthenticatedNavigator";
import { translate } from "../../../i18n";
import BottomSheet from 'reanimated-bottom-sheet';
import { typography } from "../../../theme";
import { ActivityIndicator } from "react-native-paper";
import Animated from "react-native-reanimated";
import { ITaskStatusItem } from "../../../services/interfaces/ITaskStatus";
import TaskSizeForm from "./components/TaskSizeForm";
import SizeItem from "./components/SizeItem";
import { useTaskSizes } from "../../../services/hooks/features/useTaskSizes";

export const TaskSizeScreen: FC<AuthenticatedDrawerScreenProps<"TaskSizeScreen">> = function AuthenticatedDrawerScreen(_props) {
    const { colors, dark } = useAppTheme();
    const { navigation } = _props;
    const { isLoading, sizes, deleteSize, updateSize, createSize } = useTaskSizes();
    const [editMode, setEditMode] = useState(false)
    const [itemToEdit, setItemToEdit] = useState<ITaskStatusItem>(null)
    // ref
    const sheetRef = React.useRef(null);

    // variables
    const snapPoints = useMemo(() => ['25%', '50%'], []);
    const fall = new Animated.Value(1)
    const openForEdit = (item: ITaskStatusItem) => {
        setEditMode(true);
        setItemToEdit(item)
        sheetRef.current.snapTo(0)
    }


    return (
        <Screen preset="scroll" ScrollViewProps={{ bounces: false }} contentContainerStyle={[$container, { backgroundColor: colors.background2 }]} safeAreaEdges={["top"]}>
            <Animated.View style={{ opacity: Animated.add(0.1, Animated.multiply(fall, 1.0)) }}>
                <View style={[$headerContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.container, { backgroundColor: colors.background }]}>
                        <TouchableOpacity onPress={() => navigation.navigate("Setting")}>
                            <AntDesign name="arrowleft" size={24} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: colors.primary }]}>{translate("settingScreen.sizeScreen.mainTitle")}</Text>
                    </View>
                </View>
                <ScrollView style={{ width: "100%", padding: 20, maxHeight: "80%" }} bounces={false}>
                    <View>
                        <Text style={styles.title2}>{translate("settingScreen.sizeScreen.listSizes")}</Text>
                    </View>
                    <View style={{ minHeight: 200, justifyContent: "center", alignItems: "center" }}>
                        {isLoading ?
                            <ActivityIndicator size={"small"} color={"#3826A6"} /> : null}
                        {!isLoading && sizes?.total === 0 ?
                            <Text style={{ ...styles.noStatusTxt, color: colors.primary }}>
                                {translate("settingScreen.sizeScreen.noActiveSizes")}
                            </Text> : null}
                        {sizes?.items?.map((item, index) => (
                            <View key={index} style={{ marginBottom: sizes?.items.length === index + 1 ? 40 : 0, width: "100%" }}>
                                <SizeItem
                                    openForEdit={() => openForEdit(item)}
                                    onDeleteSize={() => deleteSize(item.id)}
                                    size={item} />
                            </View>
                        ))}
                    </View>
                </ScrollView>
                <TouchableOpacity style={{ ...styles.createButton, borderColor: dark ? "#6755C9" : "#3826A6" }} onPress={() => {
                    setEditMode(false)
                    sheetRef.current.snapTo(0)
                }}>
                    <Ionicons name="add" size={24} color={dark ? "#6755C9" : "#3826A6"} />
                    <Text style={{ ...styles.btnText, color: dark ? "#6755C9" : "#3826A6" }}>{translate("settingScreen.sizeScreen.createSizeButton")}</Text>
                </TouchableOpacity>
            </Animated.View>
            <BottomSheet
                ref={sheetRef}
                snapPoints={[452, 0]}
                borderRadius={24}
                initialSnap={1}
                callbackNode={fall}
                enabledGestureInteraction={true}
                renderContent={() => (
                    <TaskSizeForm
                        item={itemToEdit}
                        onDismiss={() => {
                            setEditMode(false)
                            sheetRef.current.snapTo(1)
                        }}
                        onUpdateSize={updateSize}
                        onCreateSize={createSize}
                        isEdit={editMode} />
                )}
            />
        </Screen>
    )
}



const $container: ViewStyle = {
    flex: 1,
}
const $headerContainer: ViewStyle = {
    padding: 20,
    paddingVertical: 16,
    shadowColor: "rgba(0, 0, 0, 0.6)",
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 1.00,
    elevation: 1,
    zIndex: 10
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
    },
    title: {
        fontFamily: typography.primary.semiBold,
        fontSize: 16,
        alignSelf: "center",
        width: "80%",
        textAlign: "center"
    },
    title2: {
        fontSize: 16,
        fontFamily: typography.primary.semiBold,
        color: "#7E7991",
        marginBottom: 8
    },
    noStatusTxt: {
        fontSize: 16,
        fontFamily: typography.primary.semiBold,
        color: "#7E7991",
    },
    createButton: {
        width: "90%",
        padding: 16,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
        borderWidth: 2,
        borderRadius: 12,
        marginTop: 24,
        borderColor: "#3826A6"
    },
    btnText: {
        fontSize: 18,
        fontFamily: typography.primary.semiBold,
        fontStyle: "normal",
        color: "#3826A6"
    }
})

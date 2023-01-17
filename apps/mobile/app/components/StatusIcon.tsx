import React, { useEffect } from "react"
import { Feather, Entypo, FontAwesome, MaterialCommunityIcons, AntDesign } from "@expo/vector-icons"
import { View, Text, Image } from "react-native";
import { ITaskStatus, } from "../services/interfaces/ITask";
import { typography } from "../theme";
import { useAppTheme } from "../app";
import { observer } from "mobx-react-lite";

export const statusIcons: { [x in ITaskStatus]: React.ReactElement } = {
    Todo: <FontAwesome name="dot-circle-o" size={18} color="#3D9A6D" background="#28D58133" />,
    "In Progress": <MaterialCommunityIcons name="timer-sand-empty" size={18} color="#735EA8" background="#E8EBF8" />,
    "In Review": <Feather name="search" size={18} color="#8B7FAA" background="#F3D8B0" />,
    "For Testing": <AntDesign name="checkcircleo" size={18} color="#E1AB2D" background="#CE930B1A" />,
    Completed: <AntDesign name="checkcircleo" size={18} color="#3D9A6D" background="#CFF3E3" />,
    Closed: <AntDesign name="closecircle" size={18} color="#8F97A1" background="#F2F4F6" />,
    Unassigned: <Entypo size={18} name="circle" color="#5f5f5f" />,
};

export function StatusIcon({ status }: { status: ITaskStatus }) {
    return <>{statusIcons[status] || ""}</>;
}

export function getBackground({ status }: { status: ITaskStatus }) {
    const node = statusIcons[status];
    return node.props.background;
};

export const BadgedTaskStatus = observer(({ status, showColor }: { status: ITaskStatus, showColor: boolean }) => {
    const node = statusIcons[status];
    const { colors, dark } = useAppTheme();

    return (
        <View
            style={{
                flexDirection: 'row'
            }}
        >
            {node}<Text style={{ color: showColor ? "#282048" : "gray", left: 5, top: 2, fontSize: 10, fontFamily: typography.fonts.PlusJakartaSans.semiBold }}>{status}</Text>
        </View>
    );
})

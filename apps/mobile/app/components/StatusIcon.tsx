import React, { useEffect } from "react"
import { Feather, Entypo, FontAwesome, MaterialCommunityIcons, AntDesign } from "@expo/vector-icons"
import { View, Text, Image } from "react-native";
import { ITaskStatus, } from "../services/interfaces/ITask";
import { typography } from "../theme";
import { useAppTheme } from "../app";
import { observer } from "mobx-react-lite";

export const statusIcons: { [x in ITaskStatus]: React.ReactElement } = {
    Todo: <FontAwesome name="dot-circle-o" size={18} color="#292D32" background="#D6E4F9" />,
    "In Progress": <MaterialCommunityIcons name="timer-sand-empty" size={18} color="#292D32" background="#E8EBF8" />,
    "In Review": <Feather name="search" size={18} color="#292D32" background="#F3D8B0" />,
    "For Testing": <AntDesign name="checkcircleo" size={18} color="#292D32" background="#F5B8B8" />,
    Completed: <AntDesign name="checkcircleo" size={18} color="#292D32" background="#CFF3E3" />,
    Closed: <AntDesign name="closecircle" size={18} color="#292D32" background="#F2F4F6" />,
    Unassigned: <Entypo size={18} name="circle" color="#292D32" background="#F2F2F2" />,
    Blocked: <AntDesign name="closecircleo" size={18} color="#292D32" background="#D6E4F9" />,
    Open: <AntDesign name="login" size={18} color="#292D32" background="#D6E4F9" />,
    Backlog: <AntDesign name="circledown" size={18} color="#292D32" background="#D6E4F9" />,
    Ready: <AntDesign name="clockcircleo" size={18} color="#292D32" background="#F5F1CB" />
};

export function StatusIcon({ status }: { status: ITaskStatus }) {
    return <>{statusIcons[status] || ""}</>;
}

export function getBackground({ status }: { status: ITaskStatus }) {
    const node = statusIcons[status];
    if (node) {
        return node.props.background;
    }
    return "#F2F2F2"
};

export const BadgedTaskStatus = observer(({ status, showColor, size }: { status: ITaskStatus, showColor: boolean, size: number }) => {
    const node = statusIcons[status];
    const { colors, dark } = useAppTheme();

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: "center",
            }}
        >
            {node}<Text style={{ color: "#292D32", left: 5, fontSize: size, fontFamily: typography.fonts.PlusJakartaSans.semiBold }}>{status}</Text>
        </View>
    );
})

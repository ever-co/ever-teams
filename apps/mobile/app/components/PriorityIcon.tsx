import React, { useEffect } from "react"
import { Octicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons"
import { View, Text, Image } from "react-native";
import { ITaskPriority } from "../services/interfaces/ITask";
import { typography } from "../theme";
import { useAppTheme } from "../app";
import { observer } from "mobx-react-lite";

export const priorityIcons: { [x in ITaskPriority]: React.ReactElement } = {
    Low: <Octicons name="device-mobile" size={18} color="#292D32" background="#F3D8B0" />,
    Urgent: <MaterialCommunityIcons name="web" size={18} color="#292D32" background="#E8EBF8" />,
    Medium: <MaterialCommunityIcons name="monitor-cellphone-star" size={18} color="#292D32" background="#7D7AB8" />,
    High: <MaterialIcons name="tablet-mac" size={18} color="#292D32" background="#F5B8B8" />,
};

export function PriorityIcon({ priority }: { priority: ITaskPriority }) {
    return <>{priorityIcons[priority] || ""}</>;
}

export function getBackground({ priority }: { priority: ITaskPriority }) {
    const node = priorityIcons[priority];
    if (node) {
        return node.props.background;
    }
    return "#F2F2F2"
};

export const BadgedTaskPriority = observer(({ priority, showColor, size }: { priority: ITaskPriority, showColor: boolean, size: number }) => {
    const node = priorityIcons[priority];
    const { colors, dark } = useAppTheme();

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: "center",
                backgroundColor: node.props.background
            }}
        >
            {node}<Text style={{ color: "#292D32", left: 5, fontSize: size, fontFamily: typography.fonts.PlusJakartaSans.semiBold }}>{priority}</Text>
        </View>
    );
})

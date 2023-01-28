import React, { useEffect } from "react"
import { Octicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons"
import { View, Text, Image } from "react-native";
import { ITaskLabel } from "../services/interfaces/ITask";
import { typography } from "../theme";
import { useAppTheme } from "../app";
import { observer } from "mobx-react-lite";

export const labelIcons: { [x in ITaskLabel]: React.ReactElement } = {
    Mobile: <Octicons name="device-mobile" size={18} color="#292D32" background="#F3D8B0" />,
    Web: <MaterialCommunityIcons name="web" size={18} color="#292D32" background="#E8EBF8" />,
    "UI/UX": <MaterialCommunityIcons name="monitor-cellphone-star" size={18} color="#292D32" background="#7D7AB8" />,
    Tablet: <MaterialIcons name="tablet-mac" size={18} color="#292D32" background="#F5B8B8" />,
};

export function LabelIcon({ status }: { status: ITaskLabel }) {
    return <>{labelIcons[status] || ""}</>;
}

export function getBackground({ label }: { label: ITaskLabel }) {
    const node = labelIcons[label];
    if (node) {
        return node.props.background;
    }
    return "#F2F2F2"
};

export const BadgedTaskLabel = observer(({ label, showColor, size }: { label: ITaskLabel, showColor: boolean, size: number }) => {
    const node = labelIcons[label];
    const { colors, dark } = useAppTheme();

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: "center",
            }}
        >
            {node}<Text style={{ color: "#292D32", left: 5, fontSize: size, fontFamily: typography.fonts.PlusJakartaSans.semiBold }}>{label}</Text>
        </View>
    );
})

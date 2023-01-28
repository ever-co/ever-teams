import React, { useEffect } from "react"
import { Octicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons"
import { View, Text, Image } from "react-native";
import { ITaskSize } from "../services/interfaces/ITask";
import { typography } from "../theme";
import { useAppTheme } from "../app";
import { observer } from "mobx-react-lite";

export const sizeIcons: { [x in ITaskSize]: React.ReactElement } = {
    Tiny: <Octicons name="device-mobile" size={18} color="#292D32" background="#F3D8B0" />,
    Small: <MaterialCommunityIcons name="web" size={18} color="#292D32" background="#E8EBF8" />,
    Medium: <MaterialCommunityIcons name="monitor-cellphone-star" size={18} color="#292D32" background="#7D7AB8" />,
    Large: <MaterialIcons name="tablet-mac" size={18} color="#292D32" background="#F5B8B8" />,
    "Extra Large": <MaterialIcons name="tablet-mac" size={18} color="#292D32" background="#ECE8FB" />,
};

export function SizeIcon({ size }: { size: ITaskSize }) {
    return <>{sizeIcons[size] || ""}</>;
}

export function getBackground({ size }: { size: ITaskSize }) {
    const node = sizeIcons[size];
    if (node) {
        return node.props.background;
    }
    return "#F2F2F2"
};

export const BadgedTaskSize = observer(({ size, showColor, fontSize }: { size: ITaskSize, showColor: boolean, fontSize: number }) => {
    const node = sizeIcons[size];
    const { colors, dark } = useAppTheme();

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: "center",
                backgroundColor: node.props.background
            }}
        >
            {node}<Text style={{ color: "#292D32", left: 5, fontSize: fontSize, fontFamily: typography.fonts.PlusJakartaSans.semiBold }}>{size}</Text>
        </View>
    );
})

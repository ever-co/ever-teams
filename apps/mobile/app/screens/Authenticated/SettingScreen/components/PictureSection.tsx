import React, { FC } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native"
import { imgTitle } from "../../../../helpers/img-title";
import { useStores } from "../../../../models"
import { colors, typography } from "../../../../theme";

interface Props {
    imageUrl: string;
    buttonLabel: string;
    onDelete: () => unknown
    onChange: () => unknown
}
const PictureSection: FC<Props> = ({ imageUrl, buttonLabel, onChange, onDelete }) => {
    const { teamStore: { activeTeam } } = useStores();
    return (
        <View style={styles.container}>
            {imageUrl.trim().length > 3 ?
                <Image style={styles.pictureContainer} source={{ uri: imageUrl }} />
                :
                <View style={styles.teamImage}>
                    <Text style={styles.prefix}>{imgTitle(activeTeam.name)}</Text>
                </View>
            }
            <TouchableOpacity style={styles.changeAvatarBtn} onPress={() => onChange()}>
                <Text style={styles.changeAvatarTxt}>{buttonLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteContainer} onPress={() => onDelete()}>
                <Image style={{ width: 20, height: 20 }} source={require("../../../../../assets/icons/new/trash.png")} />
            </TouchableOpacity>
        </View>
    )
}

export default PictureSection;

const styles = StyleSheet.create({
    container: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingVertical: 20
    },
    pictureContainer: {
        width: 70,
        height: 70,
        borderRadius: 40
    },
    changeAvatarBtn: {
        height: 42,
        width: 168,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#3826A6",
        borderRadius: 7,
        paddingVertical: 11,
    },
    changeAvatarTxt: {
        fontSize: 14,
        color: colors.primary,
        fontFamily: typography.primary.semiBold
    },
    deleteContainer: {
        borderRadius: 7,
        backgroundColor: "#E6E6E9",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 11,
        paddingHorizontal: 16
    },
    teamImage: {
        width: 70,
        height: 70,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 35,
        backgroundColor: "#C1E0EA",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1.5,
        },
        shadowOpacity: 0.18,
        shadowRadius: 1.00,
        elevation: 2,
    },
    prefix: {
        fontSize: 24,
        fontFamily: typography.fonts.PlusJakartaSans.semiBold,
        fontWeight: "600"
    }
})
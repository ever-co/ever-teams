import React, { FC } from 'react'
import { View, Image, StyleSheet } from 'react-native'

interface Props {
    imageUrl: string,
    size?: number
}
const ProfileImage: FC<Props> = ({ imageUrl, size }) => {
    return (
        <View style={styles.container}>
            <View>
                <Image
                    source={{ uri: imageUrl }}
                    style={[styles.profileImage, size ? { width: size, height: size } : {}]}
                    resizeMode="contain"
                />
                <View style={[styles.onlineIcon, size ? { marginRight: 10, bottom: 3 } : {}]} />
            </View>
        </View>
    )
}
export default ProfileImage;

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        height: "10%",
    },
    profileImage: {
        borderRadius: 200,
        width: 56,
        height: 56,
        borderWidth: 3,
        borderColor: "#86DAA9"
    },
    onlineIcon: {
        backgroundColor: "#27AE60",
        width: 15,
        height: 15,
        borderRadius: 10,
        position: "absolute",
        right: 0,
        marginRight: 4,
        bottom: 0,
        borderWidth: 3,
        borderColor: "#fff",
    },
})
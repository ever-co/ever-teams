import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Image, FlatList, TouchableHighlight, Platform } from "react-native";
import { useAppTheme } from "../../../../app";
import { Feather, Ionicons, AntDesign } from '@expo/vector-icons';
import { translate } from "../../../../i18n";
import { IUser } from "../../../../services/interfaces/IUserData";
import { typography } from "../../../../theme";
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from "expo-image-picker"
import { BlurView } from "expo-blur";
import axios from "axios";

interface IValidation {
    firstname: boolean;
    lastName: boolean;
}
const ChangeUserAvatar = (
    {
        onDismiss,
        user,
        onUpdateFullName,
        onExtend }
        :
        {
            onDismiss: () => unknown,
            user?: IUser;
            onUpdateFullName?: (userBody: IUser) => unknown
            onExtend: () => unknown
        }
) => {
    const { colors, dark } = useAppTheme();
    const [isExtended, setIsExtending] = useState(false)
    const [isFetching, setIsFetching] = useState(true);
    const [isLoading, setIsLoading] = useState(false)
    const [recentPictures, setRecentPictures] = useState<MediaLibrary.Asset[]>([])
    const [selectedImage, setSelectedImage] = useState<MediaLibrary.Asset>(null)
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

    const updateAvatar = useCallback(async () => {

        if (Platform.OS === 'ios') {
            const info = await MediaLibrary.getAssetInfoAsync(selectedImage.id)
            const uri_local = info.localUri;
            setSelectedImage({
                ...selectedImage,
                uri: uri_local
            })
            console.log("test image: ", info)
        }


        const formData = new FormData()
        // const uri = Platform.OS === 'android' ? selectedImage.uri : selectedImage.uri.replace('ph://', '');
        const type = selectedImage.mediaType;
        const name = selectedImage.filename;
        const image = {
            uri: selectedImage.uri,
            type,
            name,
        }
        const blob = new Blob([selectedImage.uri])
        formData.append('file', selectedImage.uri);
        formData.append('folder', 'gauzy_team_user_profile');
        formData.append('context', `photo=${selectedImage.filename}`);
        formData.append('upload_preset', 'ml_default');
        setIsLoading(true)
        console.log(formData)

        // axios
        //     .post('https://api.cloudinary.com/v1_1/dv6ezkfxg/upload', formData)
        //     .then(async (res: any) => {
        //         const imageUrl = res.data.secure_url;
        //         // await updateAvatar({ imageUrl, id: user.id });
        //         console.log("Upload response" + JSON.stringify(res))
        //         setIsLoading(false)
        //     })
        //     .catch((e) => {
        //         setIsLoading(false)
        //         console.log(e);
        //     });

    }, [selectedImage]);

    const pickImageFromGalery = () => {
        // MediaLibrary.getAlbumsAsync()
        ImagePicker.launchImageLibraryAsync()
            .then((t) => console.log(t))
    }

    useEffect(() => {
        if (!permissionResponse?.granted) {
            requestPermission()
            return
        }

        MediaLibrary.getAssetsAsync({
            mediaType: "photo",
            sortBy: "creationTime"
        }).then((t) => {
            setRecentPictures(t.assets)
            setIsFetching(false)
        })
    }, [permissionResponse, isExtended])

    useEffect(() => {
        setIsExtending(false)
        setSelectedImage(null)
    }, [onDismiss])
    const image = dark ? require("../../../../../assets/images/new/image-dark.png") : require("../../../../../assets/images/new/image-light.png");
    return (
        <>
            {!isExtended ?
                <View style={{ backgroundColor: dark ? "#1E2025" : "#F6F6F7", ...styles.avatarContainer1 }}>
                    <TouchableOpacity
                        onPress={() => {
                            onExtend()
                            setIsExtending(true)
                        }}
                        style={styles.wrapCirclePic}>
                        <View style={[styles.circlePic, { backgroundColor: dark ? "#303540" : "#fff" }]}>
                            <AntDesign name="clockcircleo" size={24} color={colors.primary} />
                        </View>
                        <Text style={styles.selectText}>{translate("settingScreen.changeAvatar.recentPictures")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.wrapCirclePic} onPress={() => pickImageFromGalery()}>
                        <View style={[styles.circlePic, { backgroundColor: dark ? "#303540" : "#fff" }]}>
                            <Image source={image} />
                        </View>
                        <Text style={styles.selectText}>{translate("settingScreen.changeAvatar.selectFromGalery")}</Text>
                    </TouchableOpacity>
                    <View style={styles.wrapCirclePic}>
                        <View style={[styles.circlePic, { backgroundColor: dark ? "#303540" : "#fff" }]}>
                            <Ionicons name="md-document-outline" size={24} color={colors.primary} />
                        </View>
                        <Text style={styles.selectText}>{translate("settingScreen.changeAvatar.selectFromFiles")}</Text>
                    </View>
                </View>
                :
                <View style={{
                    height: 611,
                    backgroundColor: dark ? "#1E2025" : "#fff",
                    padding: 20,
                }}>
                    <View style={{ flex: 5, justifyContent: "center", alignItems: "center" }}>
                        {isFetching ? <ActivityIndicator size={"large"} color={colors.primary} /> :
                            <View style={{ flex: 1 }}>
                                <Text style={{ marginBottom: 16, fontSize: 24, fontFamily: typography.primary.semiBold, color: colors.primary }}>{translate("settingScreen.changeAvatar.recentFiles")}</Text>
                                <FlatList
                                    data={recentPictures.slice(0, 4)}
                                    bounces={false}
                                    numColumns={2}
                                    showsVerticalScrollIndicator={false}
                                    keyExtractor={(item, index) => item.id}
                                    columnWrapperStyle={{ justifyContent: 'space-between' }}
                                    renderItem={({ item, index }) => (
                                        <TouchableHighlight style={{ width: "48%", marginBottom: 14 }} onPress={() => setSelectedImage(item)}>
                                            <>
                                                {selectedImage?.id === item.id ? <BlurView intensity={15} tint="dark" style={{ position: "absolute", width: "100%", height: "100%", zIndex: 1000 }} /> : null}
                                                <Image source={{ uri: item.uri }} style={styles.image} />
                                                {selectedImage?.id === item.id && <Ionicons style={{ position: "absolute", alignSelf: "center", marginTop: 50, zIndex: 1001 }} name="checkmark-sharp" size={84} color="#fff" />}
                                            </>
                                        </TouchableHighlight>
                                    )}
                                />
                            </View>
                        }
                    </View>

                    <View style={styles.wrapButtons}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                            setIsExtending(false)
                            onDismiss()
                        }}>
                            <Text style={styles.cancelTxt}>{translate("common.cancel")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                ...styles.createBtn,
                                backgroundColor: dark ? "#6755C9" : "#3826A6",
                            }}
                            onPress={() => updateAvatar()}>
                            {isLoading ?
                                <ActivityIndicator style={{ position: "absolute", left: 10 }} size={"small"} color={"#fff"} /> : null}
                            <Text style={styles.createTxt}>{translate("settingScreen.changeAvatar.continueButton")}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            }
        </>
    )
}

const styles = StyleSheet.create({
    styleInput: {
        width: "100%",
        height: 57,
        borderRadius: 12,
        borderColor: "#DCE4E8",
        borderWidth: 1,
        fontSize: 16,
        fontFamily: typography.primary.medium,
        paddingHorizontal: 18,
        alignItems: "center",
        marginTop: 16
    },
    formTitle: {
        fontSize: 24,
        fontFamily: typography.primary.semiBold,
        color: "#1A1C1E"
    },
    wrapButtons: {
        flexDirection: "row",
        width: "100%",
        justifyContent: "space-between",
        marginTop: 40,
        flex: 1
    },
    cancelBtn: {
        width: "48%",
        height: 57,
        backgroundColor: "#E6E6E9",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center"
    },
    cancelTxt: {
        fontSize: 18,
        fontFamily: typography.primary.semiBold,
        color: "#1A1C1E",
    },
    createBtn: {
        width: "48%",
        height: 57,
        flexDirection: "row",
        backgroundColor: "#3826A6",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center"
    },
    createTxt: {
        fontSize: 18,
        fontFamily: typography.primary.semiBold,
        color: "#FFF",
    },
    circlePic: {
        width: 70,
        height: 70,
        borderRadius: 100,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        elevation: 2,
        shadowColor: "rgba(0,0,0,0.13)",
        shadowOffset: { width: 1, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.04)"
    },
    image: {
        flex: 0.2,
        height: 188,
    },
    wrapCirclePic: {
        width: "25%",
        alignItems: "center"
    },
    selectText: {
        fontSize: 12,
        fontFamily: typography.primary.medium,
        color: "#B1AEBC",
        textAlign: "center",
        marginTop: 16
    },
    avatarContainer1: {
        height: 174,
        padding: 25,
        flexDirection: "row",
        justifyContent: "space-between"
    }
})

export default ChangeUserAvatar;
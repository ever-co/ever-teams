import React, { FC, useEffect, useState } from "react"
import { Modal, View, ViewStyle, StyleSheet, Dimensions, Animated, TouchableOpacity, Image, ScrollView } from "react-native"
import { spacing } from "../../../../theme/spacing"
import { CONSTANT_SIZE, GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { typography } from "../../../../theme/typography"
import { colors } from "../../../../theme/colors"
import i18n from "i18n-js"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Updates from 'expo-updates';


// COMPONENTS
import { Text } from "../../../../components"
import { observer } from "mobx-react-lite"
import { translate } from "../../../../i18n"
import { useStores } from "../../../../models"


export interface Props {
    visible: boolean;
    currentLanguage: string;
    onDismiss: () => unknown;
}

export type ILocale = "English (United States)" | "Korean" | "French" | "Arabic" | "Bulgarian" | "Hebrew" | "Russian" | "Spanish";
export type ILocaleCode = "en" | "ko" | "fr" | "ar" | "bg" | "he" | "ru" | "es"

export interface ISupportedLanguage {
    locale: string;
    localeCode: ILocaleCode
}

export const supportedLanguages: ISupportedLanguage[] = [
    {
        locale: translate("settingScreen.languages.arabic"),
        localeCode: "ar"
    },
    {
        locale: translate("settingScreen.languages.bulgarian"),
        localeCode: "bg",
    },
    {
        locale: translate("settingScreen.languages.english"),
        localeCode: "en"
    },
    {
        locale: translate("settingScreen.languages.french"),
        localeCode: "fr",
    },
    {
        locale: translate("settingScreen.languages.hebrew"),
        localeCode: "he"
    },
    {
        locale: translate("settingScreen.languages.korean"),
        localeCode: "ko",
    },
    {
        locale: translate("settingScreen.languages.russian"),
        localeCode: "ru"
    },
    {
        locale: translate("settingScreen.languages.spanish"),
        localeCode: "es",
    }
]

const { width, height } = Dimensions.get("window")
const ModalPopUp = ({ visible, children }) => {
    const [showModal, setShowModal] = React.useState(visible)
    const scaleValue = React.useRef(new Animated.Value(0)).current

    React.useEffect(() => {
        toggleModal()
    }, [visible])
    const toggleModal = () => {
        if (visible) {
            setShowModal(true)
            Animated.spring(scaleValue, {
                toValue: 1,
                useNativeDriver: true,
            }).start()
        } else {
            setTimeout(() => setShowModal(false), 200)
            Animated.timing(scaleValue, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start()
        }
    }

    return (
        <Modal animationType="fade" transparent visible={showModal}>
            <View style={$modalBackGround}>
                <Animated.View style={[{ transform: [{ scale: scaleValue }] }]}>
                    {children}
                </Animated.View>
            </View>
        </Modal>
    )
}

const LanguageModal: FC<Props> = observer(function Language({ visible, onDismiss, currentLanguage }) {
    const { authenticationStore: { setPreferredLanguage } } = useStores();
    const [lang, setLang] = useState<ISupportedLanguage>(supportedLanguages[2]);
    const [isOpened, setIsOpened] = useState(false)


    const changeLanguage = (locale: ISupportedLanguage) => {
        AsyncStorage.setItem("Language", locale.localeCode);
        i18n.locale = locale.localeCode
        setPreferredLanguage(locale)
        Updates.reloadAsync()
    }

    const setLanguageLabel = async () => {
        const localCode = await AsyncStorage.getItem("Language");
        if (!localCode) {
            const language = supportedLanguages.find((l) => l.localeCode === "en");
            setLang(language)
        } else {
            const language = supportedLanguages.find((l) => l.localeCode === localCode);
            setLang(language)
        }
    }

    useEffect(() => {
        setLanguageLabel();
    }, [])
    return (
        <ModalPopUp visible={visible}>
            <View style={styles.mainContainer}>
                <Text style={styles.mainTitle}>{translate("settingScreen.modalChangeLanguageTitle")}</Text>

                <TouchableOpacity style={styles.field} onPress={() => setIsOpened(!isOpened)}>
                    <Text style={styles.text}>{lang.locale}</Text>
                    <Image source={require("../../../../../assets/icons/caretDown.png")} />
                </TouchableOpacity>
                {isOpened &&
                    <View style={styles.dropdown}>
                        <ScrollView>
                            {
                                supportedLanguages.map((lang) => (
                                    <TouchableOpacity style={styles.dropdownItem} key={lang.localeCode} onPress={() => {
                                        setLang(lang)
                                        setIsOpened(false)
                                    }}>
                                        <Text style={styles.text}>{lang.locale}</Text>
                                    </TouchableOpacity>
                                ))
                            }
                        </ScrollView>
                    </View>
                }
 
                <View style={styles.wrapButtons}>
                    <TouchableOpacity onPress={() => onDismiss()} style={[styles.button, { backgroundColor: "#E6E6E9" }]}>
                        <Text style={[styles.buttonText, { color: "#1A1C1E" }]}>{translate("common.cancel")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, { backgroundColor: "#3826A6", opacity: 1 }]} onPress={() => changeLanguage(lang)}>
                        <Text style={styles.buttonText}>{translate("common.save")}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ModalPopUp>
    )
})

export default LanguageModal;

const $container: ViewStyle = {
    ...GS.flex1,
    paddingTop: spacing.extraLarge + spacing.large,
    paddingHorizontal: spacing.large,
}
const $modalBackGround: ViewStyle = {
    flex: 1,
    backgroundColor: "#000000AA",

    justifyContent: "flex-end"

}

const $modalContainer: ViewStyle = {
    width: "100%",
    height: height,
    backgroundColor: "white",
    paddingHorizontal: 30,
    paddingVertical: 30,
    borderRadius: 30,
    elevation: 20,
    justifyContent: 'center'
}

const styles = StyleSheet.create({
    mainContainer: {
        width: "100%",
        alignItems: "center",
        height: 276,
        shadowColor: "#1B005D0D",
        shadowOffset: { width: 10, height: 10 },
        shadowRadius: 10,
        backgroundColor: "#fff",
        borderTopRightRadius: 24,
        borderTopLeftRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 30,
        borderColor: "#1B005D0D",
        borderWidth: 2,
    },
    blueBottom: {
        borderBottomWidth: 2,
        borderColor: "#1B005D",
        width: "100%",
        marginBottom: 25,
    },
    wrapButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 10,
        width: "100%",
        zIndex:10
    },
    button: {
        width: width / 2.5,
        height: height / 16,
        borderRadius: 11,
        padding: 10,
        justifyContent: "center",
        alignItems: "center"
    },
    mainTitle: {
        fontFamily: typography.primary.semiBold,
        fontSize: 24,
        color: colors.primary,
        textAlign: "left",
        width: "100%"
    },
    buttonText: {
        fontFamily: typography.primary.semiBold,
        fontSize: 18,
        color: "#FFF"
    },
    loading: {
        position: 'absolute',
        right: 10,
        top: 11
    },
    dropdown: {
        position: "absolute",
        width: "100%",
        zIndex: 1000,
        backgroundColor: colors.background,
        padding: 10,
        borderRadius: 18,
        top: 135,
        maxHeight: 80,
        overflow: "hidden",
        elevation: 100,
        ...GS.shadow
    },
    dropdownItem: {
        marginVertical: 5
    },
    field: {
        width: "100%",
        height: 57,
        borderWidth: 1,
        borderColor: "#DCE4E8",
        borderRadius: 12,
        marginTop: 16,
        marginBottom: 40,
        alignItems: "center",
        justifyContent: "space-between",
        flexDirection: "row",
        paddingHorizontal: 18
    },
    text: {
        fontFamily: typography.primary.medium,
        fontSize: 16,
        color: colors.primary
    }
})

import React, { FC, useEffect, useState } from "react"
import { View, ViewStyle, Modal, Image, StyleSheet, TextInput, Animated, Dimensions, TouchableOpacity } from "react-native"
import { Text } from "react-native-paper"
// COMPONENTS
// STYLES
import { CONSTANT_SIZE, GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors, spacing, typography } from "../../../../theme"
import { useTeamInvitations } from "../../../../services/hooks/useTeamInvitation";
import { showMessage } from "react-native-flash-message";
import { EMAIL_REGEX } from "../../../../helpers/regex";
import { translate } from "../../../../i18n";
import { useAppTheme } from "../../../../app";
import useTeamScreenLogic from "../logics/useTeamScreenLogic"

export interface Props {
  visible: boolean
  onDismiss: () => unknown
}
const { width, height } = Dimensions.get("window");

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
    <Modal transparent visible={showModal}>
      <View style={$modalBackGround}>
        <Animated.View style={[{ transform: [{ scale: scaleValue }] }]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  )
}

const InviteUserModal: FC<Props> = function InviteUserModal({ visible, onDismiss }) {
  const { inviterMember, loading } = useTeamInvitations();
  const {
    memberEmail,
    memberName,
    setErrors,
    setMemberEmail,
    setMemberName,
    handleEmailInput,
    handleNameInput,
    errors
  } = useTeamScreenLogic();
  const { colors } = useAppTheme();



  const handleSubmit = () => {

    inviterMember({ email: memberEmail, name: memberName })
    onDismiss()
  }

  useEffect(() => {
    setErrors({
      emailError: null,
      nameError: null
    })
    setMemberName("")
    setMemberEmail("")
  }, [onDismiss])

  return (
    <ModalPopUp visible={visible}>
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <View style={{ width: "100%", marginBottom: 20 }}>
          <Text style={[styles.mainTitle, { color: colors.primary }]}>{translate("teamScreen.inviteModalTitle")}</Text>
          <Text style={styles.hint}>{translate("teamScreen.inviteModalHint")}</Text>
        </View>
        <View style={{ width: "100%" }}>
          <View>
            <TextInput
              placeholderTextColor={colors.tertiary} style={[styles.textInput,
              { borderColor: colors.border, color: colors.primary }]}
              autoCapitalize={"none"}
              autoCorrect={false}
              placeholder={translate("teamScreen.inviteEmailFieldPlaceholder")}
              onChangeText={(text) => handleEmailInput(text)}
            />
            <Text style={[styles.hint, { color: "red" }]}>{errors.emailError}</Text>
          </View>
          <View>
            <TextInput placeholderTextColor={colors.tertiary}
              autoCapitalize={"none"}
              autoCorrect={false}
              style={[styles.textInput, { marginTop: 16, borderColor: colors.border, color: colors.primary }]}
              placeholder={translate("teamScreen.inviteNameFieldPlaceholder")}
              onChangeText={(text) => handleNameInput(text)}
            />
            <Text style={[styles.hint, { color: "red" }]}>{errors.nameError}</Text>
          </View>
          <View style={styles.wrapButtons}>
            <TouchableOpacity onPress={() => onDismiss()} style={[styles.button, { backgroundColor: "#E6E6E9" }]}>
              <Text style={[styles.buttonText, { color: "#1A1C1E" }]}>{translate("common.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: "#3826A6"}]} onPress={() => handleSubmit()}>
              <Text style={styles.buttonText}>{translate("teamScreen.sendButton")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* <ActivityIndicator color={colors.primary} style={styles.loading} /> */}
    </ModalPopUp>
  )
}

export default InviteUserModal

const $container: ViewStyle = {
  ...GS.flex1,
  paddingTop: spacing.extraLarge + spacing.large,
  paddingHorizontal: spacing.large,
}
const $modalBackGround: ViewStyle = {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.5)",
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
    height: height / 2.2,
    shadowColor: "#1B005D0D",
    shadowOffset: { width: 10, height: 10 },
    shadowRadius: 10,
    borderTopRightRadius: 24,
    borderTopLeftRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderColor: "#1B005D0D",
    borderWidth: 2,
  },
  theTextField: {
    borderWidth: 0,
    width: "100%",
  },
  wrapButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10
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
    color: colors.primary
  },
  buttonText: {
    fontFamily: typography.primary.semiBold,
    fontSize: 18,
    color: "#FFF"
  },
  crossIcon: {
    position: "absolute",
    right: 10,
    top: 10
  },
  loading: {
    position: "absolute",
    bottom: "12%",
    left: "15%"
  },
  textInput: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    color: colors.primary,
    height: 45,
    paddingHorizontal: 13,
    borderColor: "rgba(0, 0, 0, 0.1)"
  },
  hint: {
    color: "#7E7991",
    fontSize: 12,
    fontFamily: typography.primary.semiBold
  },

})

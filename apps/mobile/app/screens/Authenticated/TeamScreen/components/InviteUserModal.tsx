import React, { FC, useState } from "react"
import { View, ViewStyle, Modal, Image, StyleSheet, TextInput, Animated, Dimensions, TouchableOpacity } from "react-native"
import { Entypo } from '@expo/vector-icons';

// COMPONENTS
import { Button, Screen, Text, TextField } from "../../../../components"
// STYLES
import { CONSTANT_SIZE, GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors, spacing, typography } from "../../../../theme"
import { IInviteRequest } from "../../../../services/interfaces/IInvite";
import { on } from "process";
import { useTeamInvitations } from "../../../../services/hooks/useTeamInvitation";
import { ActivityIndicator } from "react-native-paper";
import { showMessage } from "react-native-flash-message";
import { EMAIL_REGEX } from "../../../../helpers/regex";

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
  const [memberName, setMemberName] = useState("")
  const [memberEmail, setMemberEmail] = useState("");
  const [errors, setErrors] = useState({
    emailError: null,
    nameError: null
  })

  const handleEmailInput = (email: string) => {
    if (email.trim().length == 0 || !email.match(EMAIL_REGEX)) {
      setErrors({ ...errors, emailError: "Email is not valid" })
      return
    } else {
      setErrors({ ...errors, emailError: "" })
      setMemberEmail(email)
    }
  }

  const handleNameInput = (name: string) => {
    if (name.trim().length < 3) {
      setErrors({ ...errors, nameError: "Name is not valid" })
      return
    } else {
      setErrors({ ...errors, nameError: "" })
      setMemberName(name)
    }
  }

  const handleSubmit = () => {

    if (memberEmail.trim().length == 0 || !memberEmail.match(EMAIL_REGEX)) {
      setErrors({ ...errors, emailError: "Email is not valid" })

      showMessage({ message: "Email is not valid", type: "warning" })
      return
    } else {
      setErrors({ ...errors, emailError: "" })
    }

    if (memberName.trim().length < 3) {
      showMessage({ message: "Name is not valid", type: "warning" })
      setErrors({ ...errors, nameError: "Name is not valid" })
      return
    } else {
      setErrors({ ...errors, nameError: null })
    }

    inviterMember({ email: memberEmail, name: memberName })
    onDismiss()
  }


  return (
    <ModalPopUp visible={visible}>
      {/* <Screen contentContainerStyle={$container} safeAreaEdges={["top"]}> */}
      <View style={styles.mainContainer}>
        <View style={{ width: "100%", marginBottom: 20 }}>
          <Text style={styles.mainTitle}>{"Invite member to your team"}</Text>
          <Text style={styles.hint}>Send a invitation to a team member by email</Text>
        </View>
        <View style={{ width: "100%" }}>
          <View>
            <TextInput placeholderTextColor={"rgba(40, 32, 72, 0.4)"} style={styles.textInput} placeholder="Input email address" onChangeText={(text) => handleEmailInput(text)} />
            <Text style={[styles.hint, { color: "red" }]}>{errors.emailError}</Text>
          </View>
          <View>
            <TextInput placeholderTextColor={"rgba(40, 32, 72, 0.4)"} style={[styles.textInput, { marginTop: 16 }]} placeholder="Input team member name" onChangeText={(text) => handleNameInput(text)} />
            <Text style={[styles.hint, { color: "red" }]}>{errors.nameError}</Text>
          </View>
          <View style={styles.wrapButtons}>
            <TouchableOpacity onPress={() => onDismiss()} style={styles.cancelButton}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createButton} onPress={() => handleSubmit()}>
              <Text style={styles.buttonText}>{"Send"}</Text>
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
    backgroundColor: "#fff",
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
    marginVertical: 40
  },
  cancelButton: {
    width: 155,
    height: 57,
    backgroundColor: "#E6E6E9",
    borderRadius: 11,
    padding: 16,
    justifyContent: "center",
    alignItems: "center"
  },
  createButton: {
    width: 155,
    height: 57,
    backgroundColor: "#3826A6",
    borderRadius: 11,
    padding: 16,
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
    paddingVertical: 16,
    paddingHorizontal: 13,
    borderColor: "rgba(0, 0, 0, 0.1)"
  },
  hint: {
    color: "#7E7991",
    fontSize: 12,
    fontFamily: typography.primary.semiBold
  },

})

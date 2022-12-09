import React, { FC, useState } from "react"
import { View, ViewStyle, Modal, Image, StyleSheet, TextInput, Animated } from "react-native"
import { Entypo } from '@expo/vector-icons';

// COMPONENTS
import { Button, Screen, Text, TextField } from "../../../../components"
// STYLES
import { CONSTANT_SIZE, GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors, spacing } from "../../../../theme"
import { IInviteRequest } from "../../../../services/interfaces/IInvite";
import { on } from "process";
import { useTeamInvitations } from "../../../../services/hooks/useTeamInvitation";
import { ActivityIndicator } from "react-native-paper";
import { showMessage } from "react-native-flash-message";

export interface Props {
  visible: boolean
  onDismiss: () => unknown
}

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

  const handleSubmit = () => {
    const EMAIL_REGEX = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (memberEmail.trim().length == 0 || !memberEmail.match(EMAIL_REGEX)) {
      setErrors({ ...errors, emailError: "Email is not valid" })
      console.log("")
      showMessage({message:"Email is not valid", type:"warning"})
      return
    } else {
      setErrors({ ...errors, emailError: null })
    }

    if (memberName.trim().length < 3) {
      showMessage({message:"Name is not valid", type:"warning"})
     
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
        <Image source={require("../../../../../assets/images/lock-cloud.png")} />
        <Text preset="heading" style={{ fontSize: CONSTANT_SIZE.FONT_SIZE_MD, color: "#1B005D" }}>
          Invite member to your team
        </Text>

        <Text style={{ color: "#ACB3BB", fontSize: 10, marginBottom: 10 }}>
          Send an invitation to a team member by email
        </Text>

        <View style={styles.blueBottom}>
          <TextInput onChangeText={(text) => setMemberEmail(text)} placeholder="example@domain.com" />
        </View>

        <View style={styles.greyBottom}>
          <TextInput onChangeText={(text) => setMemberName(text)} placeholder="Team Member's Name" />
        </View>

        <Button
          text="Send Invite"
          preset="filled"
          textStyle={{ color: colors.palette.neutral100, fontWeight: "bold" }}
          onPress={() => handleSubmit()}
          style={{
            backgroundColor: colors.primary,
            opacity: loading ? 0.5 : 1,
            width: "100%",
          }}
        ></Button>
        <Entypo name="cross" size={24} color="#1B005D" style={styles.crossIcon} onPress={() => onDismiss()} />
      </View>
      <ActivityIndicator color={colors.primary} style={styles.loading} />
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
  justifyContent: "center",
  alignItems: "center",
}
const $modalContainer: ViewStyle = {
  width: "95%",
  height: 350,
  backgroundColor: "white",
  paddingHorizontal: 30,
  paddingVertical: 30,
  borderRadius: 30,
  elevation: 20,
  justifyContent: 'center'
}

const styles = StyleSheet.create({
  mainContainer: {
    alignItems: "center",
    shadowColor: "#1B005D0D",
    shadowOffset: { width: 10, height: 10 },
    shadowRadius: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    borderColor: "#1B005D0D",
    borderWidth: 2,
  },
  theTextField: {
    borderWidth: 0,
    width: "100%",
  },
  blueBottom: {
    borderBottomWidth: 2,
    borderColor: "#1B005D",
    width: "100%",
    marginBottom: 25,
  },
  greyBottom: {
    borderBottomWidth: 2,
    borderColor: "#ACB3BB",
    width: "100%",
    marginBottom: 25,
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
  }
})

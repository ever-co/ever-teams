import React, { FC, useState } from "react"
import {
  View,
  ViewStyle,
  Modal,
  Image,
  ScrollView,
  Animated,
  ImageStyle,
  TextStyle,
  TouchableOpacity,
} from "react-native"

// COMPONENTS
import { Button, Screen, Text, TextField } from "../../../../components"
// STYLES
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors, spacing, typography } from "../../../../theme"
import { TextInput } from "react-native-gesture-handler"

export interface Props {
  visible: boolean
  onCreateTeam:(value:string)=>unknown
  onDismiss: () => unknown
}

const welcomeLogo = require("../../../../../assets/images/gauzy-teams-blue-2.png")

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
        <Animated.View style={[$modalContainer, { transform: [{ scale: scaleValue }] }]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  )
}

const CreateTeamModal: FC<Props> = function CreateTeamModal({ visible, onDismiss, onCreateTeam }) {

  const [teamText, setTeamText]=useState("");

  const handleSubmit=()=>{
    onCreateTeam(teamText)
    setTeamText("")
    onDismiss();
  }

  return (
    <ModalPopUp visible={visible}>
      <View>
        <View style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Image style={$welcomeLogo} source={welcomeLogo} resizeMode="contain" />
          <Text
            testID="login-heading"
            tx="loginScreen.welcome"
            preset="heading"
            style={$smalltext}
          />
        </View>
        <View>
          <Text
            testID="login-heading"
            tx="loginScreen.enterDetails"
            preset="heading"
            style={[$text, { marginTop: spacing.large }]}
          />
          <View>
            <TextInput value={teamText} onChangeText={(text)=>setTeamText(text)}  style={[$inputStyle, $inputText]} placeholder="Please enter your team name" />
          </View>
          <View
            style={{
              ...GS.mb2,
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-around",
              marginTop: 50,
            }}
          >
            <TouchableOpacity onPress={() => onDismiss()} style={{ flex: 1 }}>
              <Image source={require("../../../../../assets/icons/back.png")} />
            </TouchableOpacity>

            <Button
              preset="reversed"
              style={{ ...GS.mb2, backgroundColor: colors.primary, flex: 1 }}
              textStyle={{ fontWeight: "700" }}
              onPress={() => handleSubmit()}
            >
              Create Team
            </Button>
          </View>
        </View>
      </View>
    </ModalPopUp>
  )
}

export default CreateTeamModal

const $container: ViewStyle = {
  ...GS.flex1,
  paddingTop: spacing.extraLarge + spacing.large,
  paddingHorizontal: spacing.large,
}
const $modalStyle: ViewStyle = {}
const $modalBackGround: ViewStyle = {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "center",
  alignItems: "center",
}
const $modalContainer: ViewStyle = {
  width: "95%",
  height:350,
  backgroundColor: "white",
  paddingHorizontal: 30,
  paddingVertical: 30,
  borderRadius: 30,
  elevation: 20,
  justifyContent:'center'
}

const $welcomeLogo: ImageStyle = {
  width: "70%",
}
const $text: TextStyle = {
  marginBottom: spacing.small,
  fontSize: 20,
  color: colors.text,
  fontFamily: typography.secondary.normal,
  fontWeight: "700",
}

const $smalltext: TextStyle = {
  marginBottom: spacing.small,
  position: "absolute",
  top: 40,
  fontSize: 16,
  color: colors.text,
  fontFamily: typography.secondary.normal,
  fontWeight: "300",
}

const $inputStyle: ViewStyle = {
  borderColor: colors.primary,
  borderBottomWidth: 1,
  marginTop: 15,
  paddingTop: 10,
  width: "100%",
}

const $inputText: TextStyle={
  fontWeight:'500',
  fontSize:17
}

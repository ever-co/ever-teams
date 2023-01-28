import React, { FC, useState } from "react"
import {
  View,
  ViewStyle,
  Modal,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native"

// COMPONENTS
import { Text } from "."
// STYLES
import { GLOBAL_STYLE as GS } from "../../assets/ts/styles"
import { typography } from "../theme"
import { TextInput } from "react-native-gesture-handler"
import { translate } from "../i18n"
import { useAppTheme } from "../app"

export interface Props {
  visible: boolean
  onCreateTeam: (value: string) => unknown
  onDismiss: () => unknown
}

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
  const { colors } = useAppTheme();
  const [teamText, setTeamText] = useState("");

  const handleSubmit = () => {
    onCreateTeam(teamText)
    setTeamText("")
    onDismiss();
  }

  return (
    <ModalPopUp visible={visible}>
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <View style={{ ...GS.w100 }}>
          <Text style={[styles.mainTitle, { color: colors.primary }]}>{"Enter new team name"}</Text>
          <View>
            <TextInput
              placeholderTextColor={colors.tertiary}
              autoCapitalize={"none"}
              autoCorrect={false}
              value={teamText}
              style={[styles.textInput, { borderColor: colors.border, color: colors.primary }]}
              placeholder={"Please enter your team name"}
              onChangeText={(text) => setTeamText(text)}
            />
            <Text style={[styles.hint, { color: "red" }]}>{""}</Text>
          </View>
          <View style={styles.wrapButtons}>
            <TouchableOpacity onPress={() => onDismiss()} style={[styles.button, { backgroundColor: "#E6E6E9" }]}>
              <Text style={[styles.buttonText, { color: "#1A1C1E" }]}>{translate("common.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: "#3826A6" }]} onPress={() => handleSubmit()}>
              <Text style={styles.buttonText}>{translate("teamScreen.sendButton")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ModalPopUp >
  )
}

export default CreateTeamModal


const $modalBackGround: ViewStyle = {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "flex-end"

}
const $modalContainer: ViewStyle = {
  height: height,
  backgroundColor: "rgba(0,0,0,0.6)",
  justifyContent: "flex-end"
}

const styles = StyleSheet.create({
  mainContainer: {
    width: "100%",
    alignItems: "center",
    height: height / 3,
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
    marginTop: 30
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
    marginBottom: 20
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
    height: 53,
    fontSize: 16,
    fontWeight:"600",
    paddingHorizontal: 13,
    borderColor: "rgba(0, 0, 0, 0.1)"
  },
  hint: {
    color: "#7E7991",
    fontSize: 12,
    fontFamily: typography.primary.semiBold
  }
})

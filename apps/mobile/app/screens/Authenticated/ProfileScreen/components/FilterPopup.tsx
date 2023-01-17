import React, { FC, useState } from "react"
import { View, Text, ViewStyle, Modal, StyleSheet, TextInput, Animated, Dimensions, TouchableOpacity } from "react-native"


// COMPONENTS

// STYLES
import { CONSTANT_SIZE, GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { spacing, typography } from "../../../../theme"
import { translate } from "../../../../i18n";
import { useAppTheme } from "../../../../app";
import TaskStatus from "./TaskStatus";
import TaskPriorities from "../../../../components/TaskPriorities";
import TaskLabel from "../../../../components/TaskLabel";
import TaskSize from "../../../../components/TaskSize";

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
    <Modal animationType="fade" transparent visible={showModal}>
      <View style={$modalBackGround}>
        <Animated.View style={[{ transform: [{ scale: scaleValue }] }]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  )
}

const FilterPopup: FC<Props> = function FilterPopup({ visible, onDismiss }) {

  const { colors } = useAppTheme();

  return (
    <ModalPopUp visible={visible}>
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <View style={{ width: "100%" }}>
          <Text style={{ ...styles.mainTitle, color: colors.primary }}>Filter</Text>
        </View>

        <View style={styles.wrapForm}>
          <View style={{ width: "100%", alignItems: "center", flexDirection: "row", justifyContent: "space-between", zIndex: 999 }}>
            <TaskStatus
              containerStyle={styles.statusContainer}
              dropdownContainerStyle={{
                width: width / 2.5,
                top: 57
              }}
            />

            <TaskPriorities
              containerStyle={styles.statusContainer}
            />
          </View>

          <View style={{ width: "100%", alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
            <TaskLabel
              containerStyle={styles.statusContainer}
            />

            <TaskSize
              containerStyle={styles.statusContainer}
            />
          </View>
        </View>


        <View style={styles.wrapButtons}>
          <TouchableOpacity onPress={() => onDismiss()} style={[styles.button, { backgroundColor: "#E6E6E9" }]}>
            <Text style={[styles.buttonText, { color: "#1A1C1E" }]}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: "#3826A6" }]} onPress={() => { }}>
            <Text style={styles.buttonText}>Apply</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ModalPopUp>
  )
}

export default FilterPopup

const $modalBackGround: ViewStyle = {
  flex: 1,
  backgroundColor: "#000000AA",
  justifyContent: "flex-end"
}


const styles = StyleSheet.create({
  mainContainer: {
    width: "100%",
    alignItems: "center",
    shadowColor: "#1B005D0D",
    shadowOffset: { width: 10, height: 10 },
    shadowRadius: 10,
    borderTopRightRadius: 24,
    borderTopLeftRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: "yellow",
    borderColor: "#1B005D0D",
    borderWidth: 2,
  },
  wrapButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
    width: "100%",
    zIndex:999
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
  },
  buttonText: {
    fontFamily: typography.primary.semiBold,
    fontSize: 18,
    color: "#FFF"
  },
  wrapForm: {
    width: "100%",
    marginTop: 16
  },
  statusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: 156,
    height: 57
  }
})

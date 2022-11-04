import React from "react"
import { Text, View, StyleSheet, Image, TouchableOpacity } from "react-native"

const TaskStatusDropdown = () => {
  const [isOpened, setIsOpened] = React.useState(false)
  const [status, setStatus] = React.useState(null)

  const OnItemPressed = (status: string) => {
    setIsOpened(false)
    setStatus(status)
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setIsOpened(!isOpened)}
        style={{ flexDirection: "row", justifyContent: "space-between" }}
      >
        <Text style={[styles.dropdownItemTxt, { fontSize: 16 }]}>
          {status === null ? "Status" : status}
        </Text>
        <Image source={require("../../../../../assets/icons/caretDown.png")} />
      </TouchableOpacity>

      {isOpened ? (
        <View style={styles.dropdownContainer}>
          <TouchableOpacity style={styles.dropdownItem} onPress={() => OnItemPressed("No Status")}>
            <Image
              style={styles.iconStyle}
              source={require("../../../../../assets/icons/no-status.png")}
            />
            <Text style={[styles.dropdownItemTxt, { color: "gray" }]}>No Status</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => OnItemPressed("In progress")}
          >
            <Image
              style={styles.iconStyle}
              source={require("../../../../../assets/icons/in-progress.png")}
            />
            <Text style={styles.dropdownItemTxt}>In progress</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem} onPress={() => OnItemPressed("In review")}>
            <Image
              style={styles.iconStyle}
              source={require("../../../../../assets/icons/in-review.png")}
            />
            <Text style={styles.dropdownItemTxt}>In review</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem} onPress={() => OnItemPressed("Completed")}>
            <Image
              style={styles.iconStyle}
              source={require("../../../../../assets/icons/complete-task.png")}
            />
            <Text style={[styles.dropdownItemTxt, { color: "green" }]}>Completed</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )
}

export default TaskStatusDropdown

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#EEEFF5",
    marginVertical: 30,
    padding: 8,
    borderRadius: 5,
    width: "50%",
    zIndex: 1,
  },
  dropdownContainer: {
    backgroundColor: "#FFF",
    position: "absolute",
    shadowColor: "gray",
    paddingHorizontal: 5,
    top: 41,
    width: "110%",
    borderRadius: 5,
    zIndex: 10,
    elevation: 9,
  },
  dropdownItem: {
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownItemTxt: {
    color: "#1B005D",
  },
  iconStyle: {
    width: 12,
    height: 12,
    marginRight: 5,
  },
})

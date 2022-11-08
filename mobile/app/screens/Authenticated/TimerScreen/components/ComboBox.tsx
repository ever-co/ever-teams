import React from "react"
import { View, StyleSheet } from "react-native"
import IndividualTask from "./IndividualTask"
import TaskDisplayBox from "./TaskDisplayBox"

const ComboBox = () => {
  return (
    <View style={styles.mainContainer}>
      <View style={{ flexDirection: "row", marginBottom: 10 }}>
        <TaskDisplayBox text="32 Open" openTask />
        <TaskDisplayBox text="25 Closed" openTask={false} />
      </View>
      <IndividualTask
        text="API Integration"
        status="Completed"
        image1={require("../../../../../assets/images/person1.png")}
        image2={require("../../../../../assets/images/Konstantin.png")}
      />
      <IndividualTask text="Design Profile Screen" status="Unassigned" />
      <IndividualTask
        text="Improve Main Page Design"
        status="In progress"
        image1={require("../../../../../assets/images/person2.png")}
        image2={require("../../../../../assets/images/person1.png")}
      />
      <IndividualTask
        text="Deploy App"
        status="In Review"
        image1={require("../../../../../assets/images/Konstantin.png")}
        image2={require("../../../../../assets/images/person2.png")}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    borderColor: "#1B005D0D",
    borderWidth: 1,
    marginHorizontal: 5,
    shadowColor: "#1B005D",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 5,
    position: "absolute",
    top: "35%",
    left: 5,
    width: "100%",
  },
})

export default ComboBox

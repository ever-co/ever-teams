import React from "react"
import { View, StyleSheet, TouchableOpacity, Text, Image } from "react-native"
import DropDownSection from "./DropDownSection"

const DropDown = () => {
  const [expanded, setExpanded] = React.useState(true)
  const handlePress = () => setExpanded(!expanded)

  return (
    <View style={styles.mainContainer}>
      <TouchableOpacity style={styles.mainDropDown} activeOpacity={0.7}>
        <Image source={require("../../../../../assets/images/mask.png")}></Image>
        <Text style={{ color: "#1B005D" }}> Super Team (5)</Text>
        <Image source={require("../../../../../assets/icons/caretDown.png")}></Image>
      </TouchableOpacity>

      <DropDownSection />

      {/* <List.Accordion
        style={styles.list}
        title="Uncontrolled Accordion"
        left={(props) => <List.Icon {...props} icon="folder" />}
      >
        <List.Item title="First item" />
        <List.Item title="Second item" />
      </List.Accordion> */}
      {/* <List.Section title="Accordions">
        <List.Accordion
          title="Uncontrolled Accordion"
          left={(props) => <List.Icon {...props} icon="folder" />}
        >
          <List.Item title="First item" />
          <List.Item title="Second item" />
        </List.Accordion>
      </List.Section> */}
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  mainDropDown: {
    flexDirection: "row",
    width: "80%",
    backgroundColor: "#E8EBF8",
    justifyContent: "space-around",
    borderRadius: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
})

export default DropDown

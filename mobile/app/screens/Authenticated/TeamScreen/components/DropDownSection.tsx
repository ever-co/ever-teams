import React from "react"
import { View, Text, StyleSheet, Image } from "react-native"
import Icon from "react-native-vector-icons/Ionicons"

const data = [
  {
    img: require("../../../../../assets/icons/community.png"),
    word: "All",
  },
  {
    img: require("../../../../../assets/images/cr-logo.png"),
    word: "Ever® Saas (10)",
  },
  {
    img: require("../../../../../assets/images/mask.png"),
    word: "Super Team (5)",
  },
  {
    img: require("../../../../../assets/images/cr-logo.png"),
    word: "Ever® Gauzy™ (7)",
  },
  {
    img: require("../../../../../assets/images/cr-logo.png"),
    word: "Ever Traduora Platform (25)",
  },
  {
    img: require("../../../../../assets/images/cr-logo.png"),
    word: "Massaza Technologies (6)",
  },
]

const DropDownSection = () => {
  return (
    <View style={styles.mainContainer}>
      <View style={styles.indDropDown}>
        <Image source={require("../../../../../assets/images/mask.png")} />
        <Text style={{ color: "#1B005D", paddingLeft: "5%" }}>All</Text>
      </View>
      <View style={styles.indDropDown}>
        <Image source={require("../../../../../assets/images/mask.png")} />
        <Text style={{ color: "#1B005D", paddingLeft: "5%" }}>Ever® Saas (10)</Text>
      </View>
      <View style={styles.indDropDown}>
        <Image source={require("../../../../../assets/images/mask.png")} />
        <Text style={{ color: "#1B005D", paddingLeft: "5%" }}>Super Team (5)</Text>
      </View>
      <View style={styles.indDropDown}>
        <Image source={require("../../../../../assets/images/mask.png")} />
        <Text style={{ color: "#1B005D", paddingLeft: "5%" }}>Ever® Gauzy™ (7)</Text>
      </View>
      <View style={styles.indDropDown}>
        <Image source={require("../../../../../assets/images/mask.png")} />
        <Text style={{ color: "#1B005D", paddingLeft: "5%" }}>Ever Traduora Platform (25)</Text>
      </View>
      <View style={styles.indDropDown}>
        <Image source={require("../../../../../assets/images/mask.png")} />
        <Text style={{ color: "#1B005D", paddingLeft: "5%" }}>Massaza Technologies (6)</Text>
      </View>
      <View style={styles.buttonStyle}>
        <Icon name="ios-book" color="#4F8EF7" />
        <Text style={{ color: "#1B005D", fontSize: 18, fontWeight: "bold" }}>Create new team</Text>
      </View>

      {/* {data.map((datum, i) => (
        <DropItem key={i} {...datum} />
      ))} */}
    </View>
  )
}

type IDropItem = {
  img: any
  word: string
}

const DropItem = ({ img, word }: IDropItem) => {
  return (
    <View>
      <Image source={img}></Image> <Text>{word}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    elevation: 10000,
    position: "absolute",
    top: 50,
    zIndex: 10,
    backgroundColor: "#fff",
    width: "80%",
    height: "500%",
    borderRadius: 10,
    justifyContent: "space-around",
  },
  indDropDown: {
    flexDirection: "row",
    paddingLeft: "10%",
  },
  buttonStyle: {
    flexDirection: "row",
    backgroundColor: "#D7E1EB",
    borderRadius: 10,
    width: "80%",
    marginLeft: "10%",
    paddingTop: 5,
    paddingBottom: 5,
    justifyContent: "space-around",
    alignItems: "center",
  },
})

export default DropDownSection

import React from "react"
import { Image, Text, View, ImageStyle, StyleSheet } from "react-native"
import { ProgressBar } from "react-native-paper"

import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors, spacing } from "../../../../theme"

const NewListCardItem = () => {
  return (
    <View style={styles.mainContainer}>
      <View style={styles.firstContainer}>
        <Image
          source={require("../../../../../assets/images/Ruslan.png")}
          style={$userProfile}
        ></Image>
        <Text style={styles.name}>Ruslan Konviser</Text>
        <View style={styles.estimate}>
          <Text style={{ color: "#fff" }}>Estimate Now</Text>
          <Text style={styles.notEstimate}>Not Estimated</Text>
        </View>
        {/* <Text style={{ color: "#ACB3BB", fontSize: 12, fontWeight: 400 }}>Not Estimated</Text> */}

        <Image source={require("../../../../../assets/icons/more-vertical.png")}></Image>
      </View>
      <Text style={styles.otherText}>
        Lorem Ipsum is simply dummy text of the printing and typesetting industry.
      </Text>
      <ProgressBar progress={0.1} color="#28D581" style={{}} />
      <View style={{ borderBottomWidth: 2, borderBottomColor: "#E8EBF8" }}></View>
      <View style={styles.times}>
        <View>
          <Text style={styles.timeHeading}>Current time</Text>
          <Text style={styles.timeNumber}>02:25:15</Text>
        </View>
        <View>
          <Text style={styles.timeHeading}>Total time</Text>
          <Text style={styles.timeNumber}>07:22</Text>
        </View>
      </View>
    </View>
  )
}

const $userProfile: ImageStyle = {
  ...GS.roundedFull,
  backgroundColor: colors.background,
  width: spacing.huge - spacing.tiny,
  height: spacing.huge - spacing.tiny,
}

const styles = StyleSheet.create({
  mainContainer: {
    borderColor: "#1B005D",
    borderWidth: 0.5,
    borderRadius: 20,
    height: 180,
    justifyContent: "space-around",
    padding: 10,
  },
  firstContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    color: "#1B005D",
    fontSize: 13,
    fontWeight: "bold",
  },
  estimate: {
    backgroundColor: "#1B005D",
    padding: 5,
    borderRadius: 5,
  },
  times: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 10,
    paddingRight: 10,
  },
  timeNumber: {
    color: "#1B005D",
    fontSize: 18,
    fontWeight: "bold",
  },
  timeHeading: {
    color: "#ACB3BB",
    fontSize: 18,
  },
  otherText: {
    fontSize: 12,
    color: "#ACB3BB",
  },
  notEstimate: {
    color: "#ACB3BB",
    fontSize: 12,
    fontWeight: 400,
  },
})
export default NewListCardItem

import React from "react"
import { Image, Text, View, ImageStyle, StyleSheet } from "react-native"
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors, spacing } from "../../../../theme"

type INewCardItem = {
  name: string
  text: string
  currentTime: string
  totalTime: string
  estimate: boolean
}

const NewListCardItem = ({ name, text, currentTime, totalTime, estimate }: INewCardItem) => {
  return (
    <View style={styles.mainContainer}>
      <View style={styles.firstContainer}>
        <Image source={require("../../../../../assets/images/Ruslan.png")} style={$userProfile} />
        <Text style={styles.name}>{name}</Text>
        {estimate ? (
          <View style={styles.estimate}>
            <Text style={{ color: "#FFF" }}>Estimate Now</Text>
          </View>
        ) : (
          <Text style={styles.notEstimate}>Not Estimated</Text>
        )}

        <Image source={require("../../../../../assets/icons/more-vertical.png")} />
      </View>

      <Text style={styles.otherText}>{text}</Text>
      <View style={{ borderBottomWidth: 2, borderBottomColor: "#E8EBF8" }} />
      <View style={styles.times}>
        <View>
          <Text style={styles.timeHeading}>Current time</Text>
          <Text style={styles.timeNumber}>{currentTime}</Text>
        </View>
        <View>
          <Text style={styles.timeHeading}>Total time</Text>
          <Text style={styles.timeNumber}>{totalTime}</Text>
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
    marginBottom: 10,
  },
  times: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 10,
    paddingRight: 10,
  },
  otherText: {
    fontSize: 12,
    color: "#ACB3BB",
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
  notEstimate: {
    color: "#ACB3BB",
    fontSize: 12,
    fontWeight: "400",
  },
})

export default NewListCardItem

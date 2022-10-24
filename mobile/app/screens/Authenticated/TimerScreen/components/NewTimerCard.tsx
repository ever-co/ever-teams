import React from "react"
import { Text, TextInput, View, Image, StyleSheet } from "react-native"
import { ProgressBar } from "react-native-paper"

const NewTimerCard = () => {
  return (
    <View style={styles.mainContainer}>
      <Text style={styles.timer}>Timer</Text>
      <Text style={styles.estimate}>What you working on?</Text>
      <TextInput style={styles.textInput}></TextInput>
      <Text style={styles.estimate}>Estimate</Text>
      <View style={styles.horizontalInput}>
        <TextInput style={styles.textInputOne} placeholder="Hours"></TextInput>
        <TextInput style={styles.textInputOne} placeholder="Minutes"></TextInput>
      </View>
      <View style={styles.horizontal}>
        <View style={{ width: "70%", marginRight: 10, justifyContent: "space-around" }}>
          <Text style={{ fontWeight: "bold", fontSize: 35, color: "#1B005D" }}>01:10:36:20</Text>
          <ProgressBar progress={0.7} color="#28D581" />
        </View>
        <Image source={require("../../../../../assets/images/play.png")}></Image>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    marginTop: 20,
    shadowColor: "#1B005D0D",
    shadowOffset: { width: 10, height: 10 },
    shadowRadius: 10,
    backgroundColor: "#dadacb",
    borderRadius: 15,
    padding: 10,
  },
  timer: {
    color: "#1B005D",
    fontWeight: "bold",
    fontSize: 25,
    marginBottom: 15,
  },
  estimate: {
    color: "#9490A0",
    fontWeight: "600",
    marginBottom: 10,
  },
  horizontal: {
    flexDirection: "row",
    justifyContent: "center",
  },
  textInput: {
    backgroundColor: "#EEEFF5",
    height: 50,
    width: "100%",
    borderRadius: 10,
    marginBottom: 20,
  },
  textInputOne: {
    backgroundColor: "#EEEFF5",
    width: "45%",
    height: 30,
    borderRadius: 10,
  },
  horizontalInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 40,
  },
})

export default NewTimerCard

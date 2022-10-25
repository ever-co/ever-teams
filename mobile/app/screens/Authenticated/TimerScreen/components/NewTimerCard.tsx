import React from "react"
import { Text, TextInput, View, Image, StyleSheet } from "react-native"
import { ProgressBar } from "react-native-paper"

const NewTimerCard = () => {
  return (
    <View style={styles.mainContainer}>
      <Text style={styles.timer}>Timer</Text>
      <Text style={styles.working}>What you working on?</Text>
      <TextInput style={styles.textInput}></TextInput>

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={styles.estimate}>Estimate: </Text>
        <View style={styles.horizontalInput}>
          <View>
            <TextInput style={styles.textInputOne} placeholder="Hours"></TextInput>
            <View style={{ flexDirection: "row" }}>
              <View style={styles.line}></View>
              <View style={styles.line}></View>
              <View style={styles.line}></View>
              <View style={styles.line}></View>
              <View style={styles.line}></View>
              <View style={styles.line}></View>
              <View style={styles.line}></View>
              <View style={styles.line}></View>
            </View>
          </View>
          <Text> / </Text>
          <View>
            <TextInput style={styles.textInputOne} placeholder="Minutes"></TextInput>
            <View style={{ flexDirection: "row" }}>
              <View style={styles.line}></View>
              <View style={styles.line}></View>
              <View style={styles.line}></View>
              <View style={styles.line}></View>
              <View style={styles.line}></View>
              <View style={styles.line}></View>
              <View style={styles.line}></View>
              <View style={styles.line}></View>
            </View>
          </View>
        </View>
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
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 10,
    borderColor: "#1B005D0D",
    borderWidth: 2,
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
    alignSelf: "flex-end",
  },
  working: {
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
    height: 30,
  },
  horizontalInput: {
    flexDirection: "row",
    height: 40,
  },
  dashed: {
    borderBottomColor: "#fff",
    borderBottomWidth: 10,
  },
  line: {
    backgroundColor: "#1B1B1E",
    height: 2,
    width: 8,
    marginLeft: 3,
  },
})

export default NewTimerCard

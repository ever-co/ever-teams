import React from "react"
import { Text, TextInput, View, Image, StyleSheet } from "react-native"
import { ProgressBar } from "react-native-paper"
import { colors } from "../../../../theme"
import TaskStatusDropdown from "./TaskStatusDropdown"

import { Feather } from "@expo/vector-icons"

const NewTimerCard = () => {
  return (
    <View style={styles.mainContainer}>
      <Text style={styles.timer}>Timer</Text>
      <Text style={styles.working}>What you working on?</Text>
      <View
        style={[
          styles.wrapInput,
          {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 10,
          },
        ]}
      >
        <TextInput
          selectionColor={colors.primary}
          style={styles.textInput}
          defaultValue="Open Platform for..."
        />
        <Feather name="check" size={24} color="green" />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "flex-start", alignItems: "center" }}>
        <View style={{ paddingTop: 25 }}>
          <Text style={styles.estimate}>Estimate: </Text>
        </View>

        <View style={styles.horizontalInput}>
          <TextInput
            selectionColor={colors.primary}
            style={[styles.estimateInput, { right: 5 }]}
            placeholder="Hours"
          />
          <View style={styles.separator} />
          <TextInput
            selectionColor={colors.primary}
            style={styles.estimateInput}
            placeholder="Minutes"
          />
          <View>
            <Feather name="check" size={24} color="green" />
          </View>
        </View>
      </View>

      <View>
        <TaskStatusDropdown />
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
  estimateInput: {
    borderColor: colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: 10,
    borderStyle: "dashed",
    width: "35%",
  },
  working: {
    color: "#9490A0",
    fontWeight: "600",
    marginBottom: 10,
  },
  horizontal: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  textInput: {
    color: colors.primary,
  },
  textInputOne: {
    height: 30,
  },
  horizontalInput: {
    flexDirection: "row",
  },
  dashed: {
    borderBottomColor: "#fff",
    borderBottomWidth: 10,
  },
  separator: {
    backgroundColor: colors.border,
    width: 2,
    marginHorizontal: 5,
    transform: [{ rotate: "20deg" }],
  },
  wrapInput: {
    backgroundColor: "#EEEFF5",
    height: 50,
    width: "100%",
    borderRadius: 10,
    marginBottom: 20,
  },
})

export default NewTimerCard

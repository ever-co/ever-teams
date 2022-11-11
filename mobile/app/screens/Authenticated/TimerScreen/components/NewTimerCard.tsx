import React, { useState } from "react"
import { Text, TextInput, View, Image, StyleSheet, TouchableOpacity } from "react-native"
import { ProgressBar } from "react-native-paper"
import { colors } from "../../../../theme"
import TaskStatusDropdown from "./TaskStatusDropdown"

import { Feather } from "@expo/vector-icons"
import ComboBox from "./ComboBox"
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"

const NewTimerCard = () => {
  const [showCombo, setShowCombo] = useState(false)
  const [text1, setText1] = useState("")
  const [text2, setText2] = useState("")

  return (
    <View style={styles.mainContainer}>
      <Text style={styles.working}>What you working on?</Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setShowCombo(!showCombo)}
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
      </TouchableOpacity>
      {showCombo && <ComboBox />}

      <View
        style={{
          flexDirection: "row",
          marginBottom: 40,
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "flex-start", alignItems: "center" }}>
          <View style={{ paddingTop: 25, marginRight: 5 }}>
            <Text style={styles.estimate}>Estimate: </Text>
          </View>
          <View style={styles.horizontalInput}>
            <TextInput
              selectionColor={colors.primary}
              style={[styles.estimateInput, { right: 5 }]}
              placeholder="00"
              onChangeText={(newText) => setText1(newText)}
              defaultValue={text1}
            />
            <View style={styles.separator} />
            <TextInput
              selectionColor={colors.primary}
              style={styles.estimateInput}
              placeholder="00"
              onChangeText={(newText) => setText2(newText)}
              defaultValue={text2}
            />
            <View style={{ justifyContent: "flex-end" }}>
              {text1 === "" && text2 === "" ? null : (
                <Feather name="check" size={15} color="green" />
              )}
            </View>
          </View>
        </View>
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
    paddingTop: 30,
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 20,
    ...GS.noBorder,
    borderWidth: 1,
    elevation: 5,
    shadowColor: "#1B005D0D",
    shadowOffset: { width: 10, height: 10.5 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  estimate: {
    color: "#9490A0",
    fontWeight: "600",
    fontSize: 10,
    marginBottom: 10,
    alignSelf: "flex-end",
  },
  estimateInput: {
    borderColor: colors.border,
    borderBottomWidth: 2,
    paddingHorizontal: 10,
    borderStyle: "dashed",
    width: 35,
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
    height: 30,
  },
  wrapInput: {
    backgroundColor: "#EEEFF5",
    height: 50,
    width: "100%",
    borderRadius: 10,
    marginBottom: 6,
  },
})

export default NewTimerCard

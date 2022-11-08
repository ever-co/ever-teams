import React from "react"
import { View, StyleSheet, Text } from "react-native"

const DeletePopUp = () => {
  return (
    <View style={styles.container}>
      <Text style={{ fontWeight: "bold", color: "#1B005D", fontSize: 8 }}>Confirm</Text>
      <Text style={{ color: "#1B005D", fontSize: 8 }}>Cancel</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 100000000000,
    backgroundColor: "#fff",
    width: 40,
    height: 30,
    borderRadius: 5,
    shadowColor: "#1B005D",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 5,
    top: 18,
    left: 28,
  },
})

export default DeletePopUp

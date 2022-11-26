import React from "react"
import { StyleSheet, Text, TouchableOpacity } from "react-native"

type IDeletePopUp = {
  removeUser: any
  setShowDel: any
}

const DeletePopUp = ({ removeUser, setShowDel }: IDeletePopUp) => {
  return (
    <TouchableOpacity activeOpacity={0.7} style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          removeUser()
          setShowDel(false)
        }}
      >
        <Text style={{ fontWeight: "bold", color: "#1B005D", fontSize: 8 }}>Confirm</Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          setShowDel(false)
        }}
      >
        <Text style={{ color: "#1B005D", fontSize: 8 }}>Cancel</Text>
      </TouchableOpacity>
    </TouchableOpacity>
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

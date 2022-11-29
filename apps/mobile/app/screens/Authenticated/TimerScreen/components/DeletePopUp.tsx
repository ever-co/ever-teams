import React from "react"
import { StyleSheet, Text, TouchableOpacity } from "react-native"

type IDeletePopUp = {
  onCloseTask: any
  setShowDel: any
}

const DeletePopUp = ({ onCloseTask, setShowDel }: IDeletePopUp) => {
  return (
    <TouchableOpacity activeOpacity={0.7} style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          onCloseTask()
          setShowDel(false)
        }}
      >
        <Text style={{ fontWeight: "bold", color: "#1B005D", fontSize: 10 }}>Confirm</Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.7}
        style={{marginTop:5}}
        onPress={() => {
          setShowDel(false)
        }}
      >
        <Text style={{ color: "#1B005D", fontSize: 10 }}>Cancel</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 100000000000,
    backgroundColor: "#fff",
    width: 50,
    borderRadius: 5,
    shadowColor: "#1B005D",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 5,
    top: 14,
    right: 9,
  },
})

export default DeletePopUp

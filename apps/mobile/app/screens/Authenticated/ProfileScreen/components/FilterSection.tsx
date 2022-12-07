import React, { FC } from "react"
import { View, StyleSheet, Image, TouchableOpacity } from "react-native"
import { colors } from "../../../../theme"
import DropDown from "../../TeamScreen/components/DropDown"

// COMPONENTS
import { Text } from "../../../../components"


const FilterSection = () => {
  const [isOpened, setIsOpened] = React.useState(false)
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.wrapText} onPress={() => setIsOpened(!isOpened)}>
        <Text style={{}}>Worked</Text>
        <Image source={require("../../../../../assets/icons/caretDown.png")} />
      </TouchableOpacity>
      {isOpened ? (
        <View style={styles.downContainer}>
          <TouchableOpacity style={styles.dropdownItem}>
            <Text style={{ color: colors.primary, fontSize:12 }}>Worked</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem}>
            <Text style={{ color: "gray", fontSize:12 }}>Assigned</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem}>
            <Text style={{ color: "gray", fontSize:12 }}>Unassigned</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )
}

export default FilterSection

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#E8EBF8",
    alignItems:'center',
    justifyContent:"center",
    paddingVertical: 10,
    paddingHorizontal:5,
    width: "100%",
    borderRadius: 5,
    marginTop:10,
    minWidth:110,
    zIndex:1000
  },
  wrapText: {
    flexDirection: "row",
    justifyContent: "space-between",
    width:100
  },
  downContainer: {
    backgroundColor: "#fff",
    position: "absolute",
    width: "100%",
    top:42,
    elevation: 100,
    borderRadius: 5,
    zIndex:999
  },
  dropdownItem: {
    paddingVertical: 3,
    paddingHorizontal: 5,
    fontSize:12,
  },
})

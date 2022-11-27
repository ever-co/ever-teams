import React, { FC } from "react"
import { View, StyleSheet, Image, TouchableOpacity } from "react-native"
import { colors } from "../../../../theme"
import DropDown from "../../TeamScreen/components/DropDown"
import { teamItem } from "../../TeamScreen/components/DropDownSection"

// COMPONENTS
import { Text } from "../../../../components"

interface Props {
  teams: teamItem[]
}

const FilterSection = () => {
  const [isOpened, setIsOpened] = React.useState(false)
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.wrapText} onPress={() => setIsOpened(!isOpened)}>
        <Text>Worked</Text>
        <Image source={require("../../../../../assets/icons/caretDown.png")} />
      </TouchableOpacity>
      {isOpened ? (
        <View style={styles.downContainer}>
          <TouchableOpacity style={styles.dropdownItem}>
            <Text style={{ color: colors.primary }}>Worked</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem}>
            <Text style={{ color: "gray" }}>Assigned</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem}>
            <Text style={{ color: "gray" }}>Unassigned</Text>
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
    padding: 8,
    width: "90%",
    borderRadius: 5,
    zIndex:1000
  },
  wrapText: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  downContainer: {
    backgroundColor: "#fff",
    position: "absolute",
    width: "110%",
    marginTop: 42,
    elevation: 100,
    borderRadius: 5,
    zIndex:999
  },
  dropdownItem: {
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
})

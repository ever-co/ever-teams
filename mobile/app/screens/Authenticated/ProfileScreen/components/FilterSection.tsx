import React, { FC } from "react"
import { Text, View, StyleSheet, Image, TouchableOpacity } from "react-native"
import { colors } from "../../../../theme"
import DropDown from "../../TeamScreen/components/DropDown"
import { teamItem } from "../../TeamScreen/components/DropDownSection"

interface Props {
  teams: teamItem[]
}

const FilterSection = () => {
  const [isOpened, setIsOpened] = React.useState(false)
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.wrapText} onPress={() => setIsOpened(!isOpened)}>
        <Text>Worked Tasks</Text>
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
    backgroundColor: colors.palette.neutral200,
    padding: 8,
    width: "90%",
    borderRadius: 5,
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
  },
  dropdownItem: {
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
})

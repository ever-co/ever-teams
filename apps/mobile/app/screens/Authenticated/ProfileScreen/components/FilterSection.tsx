import React, { FC, useState } from "react"
import { View, StyleSheet, Image, TouchableOpacity } from "react-native"
import { colors, typography } from "../../../../theme"
import DropDown from "../../../../components/TeamDropdown/DropDown"

// COMPONENTS
import { Text } from "../../../../components"
import { ITaskStatus } from "../../../../services/interfaces/ITask"
import { BadgedTaskStatus } from "../../../../components/StatusIcon"

interface Props {
  selectStatus: (status: ITaskStatus) => unknown
}

const FilterSection: FC<Props> = ({ selectStatus }) => {
  const [isOpened, setIsOpened] = React.useState(false)
  const [selectedStatus, setSelectedStatus] = useState<ITaskStatus>()
  const status: ITaskStatus[] = ["Todo", "In Progress", "In Review", "For Testing", "Completed", "Closed", "Unassigned"]

  const handleStatus = (status: ITaskStatus) => {
    setIsOpened(false);
    setSelectedStatus(status);
    selectStatus(status)
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.wrapText} onPress={() => setIsOpened(!isOpened)}>
        {selectedStatus ?
          <BadgedTaskStatus showColor={true} status={selectedStatus} />
          :
          <Text style={{color:"#B1AEBC", fontFamily:typography.secondary, fontSize:14}}>Task Status</Text>
        }
        <Image source={require("../../../../../assets/icons/caretDown.png")} />
      </TouchableOpacity>
      {isOpened ? (
        <View style={styles.downContainer}>
          {status.map((status, idx) => (
            <TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => handleStatus(status)}>
              <BadgedTaskStatus showColor={true} status={status} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  )
}

export default FilterSection

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    alignItems: 'center',
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    width: "50%",
    borderRadius: 10,
    borderColor: "rgba(0, 0, 0, 0.13)",
    borderWidth: 1,
    minWidth: 110,
    zIndex: 1000
  },
  wrapText: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%"
  },
  downContainer: {
    backgroundColor: "#fff",
    position: "absolute",
    width: "100%",
    minWidth: 170,
    top: 45,
    elevation: 100,
    borderRadius: 5,
    zIndex: 999
  },
  dropdownItem: {
    paddingVertical: 3,
    paddingHorizontal: 5,
    fontSize: 12,
  },
})

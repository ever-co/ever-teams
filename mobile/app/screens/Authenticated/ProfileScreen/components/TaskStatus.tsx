import React, { useState } from "react";
import { TouchableOpacity, View, Image } from "react-native";
import { Icon, Text } from "../../../../components";
import { colors, spacing } from "../../../../theme"
import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"

const TaskStatus = () => {
    const [showTaskStatus, setShowTaskStatus] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("No status")
    const status = ["No status",
      "To do",
      "Blocker",
      "In progress",
      "In Review",
      "Closed"]
    return (
      <>
        <View style={{ width: 150 }}>
          <TouchableOpacity onPress={() => setShowTaskStatus(!showTaskStatus)} style={{ flexDirection: 'row', backgroundColor: colors.palette.neutral200, padding: 5, width: 150, justifyContent: 'space-between', borderRadius: 5 }}>
            <Text>{selectedStatus}</Text>
            <Image source={require("../../../../../assets/icons/caretDown.png")} />
          </TouchableOpacity>
        </View>
  
        <View
          style={{
            ...GS.positionAbsolute,
            ...GS.p2,
            ...GS.shadow,
            ...GS.r0,
            ...GS.roundedSm,
            marginTop: -(spacing.massive + 25),
            marginRight: spacing.small,
            backgroundColor: colors.background,
            minWidth: spacing.massive * 2.5,
            ...(!showTaskStatus ? { display: "none" } : {}),
          }}
        >
          <View style={{}}>
            {status.map((item, idx) => (
              <TouchableOpacity key={idx} onPress={() => {
                setSelectedStatus(item);
                setShowTaskStatus(false)
              }}>
                <Text>{item}</Text>
              </TouchableOpacity>
            ))}
  
  
          </View>
  
          <TouchableOpacity style={{ position: 'absolute', right: 5, top: 5 }} onPress={() => setShowTaskStatus(!showTaskStatus)}>
            <Icon icon={"x"} />
          </TouchableOpacity>
        </View>
      </>
    )
  }

  export default TaskStatus;
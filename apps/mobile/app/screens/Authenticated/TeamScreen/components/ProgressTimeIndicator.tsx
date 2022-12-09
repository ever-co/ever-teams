import React from "react"
import { View, TextInput, StyleSheet, TouchableOpacity } from "react-native"
import Svg, { G, Circle } from "react-native-svg"

import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { convertMsToTime, secondsToTime } from "../../../../helpers/date"

type progressProps = {
  estimatedHours: number
  workedHours: number
  estimated: boolean
}

const ProgressTimeIndicator = ({ estimatedHours, workedHours, estimated }: progressProps) => {
  const percentage = workedHours
  // Convert seconds to milliseconds
  const maxMillis = estimatedHours * 1000

  const radius = 23
  const strokeWidth = 4
  const color = "#28D581"
  const maxPerc = (100 * percentage) / maxMillis
  const circleCircumference = 2 * Math.PI * radius
  const strokeDashoffset = circleCircumference - (circleCircumference * maxPerc) / 100

  const { h: estimateHours, m: estimateMinutes } = secondsToTime(estimatedHours);

  return (
    <View>
      <Svg height="50" width="50">
        <G>
          <Circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke={"gray"}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeOpacity={0.2}
          />
          <Circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke={color}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circleCircumference}
            strokeDashoffset={estimated ? strokeDashoffset : circleCircumference}
          />
        </G>
      </Svg>
      <TextInput
        underlineColorAndroid={"transparent"}
        editable={false}
        defaultValue={estimated && estimatedHours > 0 ? `${estimateHours}:${estimateMinutes !== 0 ? estimateMinutes : ""}` : "00:00"}
        style={[
          StyleSheet.absoluteFillObject,
          { fontSize: radius / 1.8, color: `${estimated ? "#1B005D" : "gray"}` },
          { fontWeight: "900", textAlign: "center", opacity: estimated ? 1 : 0.2 },
        ]}
      />
    </View>
  )
}

export default ProgressTimeIndicator

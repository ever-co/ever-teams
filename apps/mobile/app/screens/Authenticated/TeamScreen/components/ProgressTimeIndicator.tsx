import React from "react"
import { View, TextInput, StyleSheet } from "react-native"
import Svg, { G, Circle } from "react-native-svg"

import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { secondsToTime } from "../../../../helpers/date"

type progressProps = {
  estimatedHours: number
  workedHours: number
  estimated: boolean
}

const ProgressTimeIndicator = ({ estimatedHours, workedHours, estimated }: progressProps) => {
  const percentage = workedHours
  const max = estimatedHours

  const radius = 20
  const strokeWidth = 3
  const color = CC["success"]
  const maxPerc = (100 * percentage) / max
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
        defaultValue={estimated && estimatedHours > 0 ? `${estimateHours}h${estimateMinutes !== 0 ? estimateMinutes : ""}` : "00:00"}
        style={[
          StyleSheet.absoluteFillObject,
          { fontSize: radius / 1.6, color: `${estimated ? CC["success"] : "gray"}` },
          { fontWeight: "900", textAlign: "center", opacity: estimated ? 1 : 0.2 },
        ]}
      />
    </View>
  )
}

export default ProgressTimeIndicator

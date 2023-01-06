import React from "react"
import { View, TextInput, StyleSheet, TouchableOpacity } from "react-native"
import Svg, { G, Circle } from "react-native-svg"

import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { convertMsToTime, secondsToTime } from "../../../../helpers/date"
import { colors, typography } from "../../../../theme"

type progressProps = {
  estimatedHours: number
  workedHours: number
}

const ProgressTimeIndicator = ({ estimatedHours, workedHours }: progressProps) => {
  const percentage = workedHours
  // Convert seconds to milliseconds
  const maxMillis = estimatedHours * 1000
  const estimated = estimatedHours > 0;

  const radius = 23
  const strokeWidth = 5
  const color = "#27AE60"
  const maxPerc = (100 * percentage) / maxMillis
  const circleCircumference = 2 * Math.PI * radius
  const strokeDashoffset = circleCircumference - (circleCircumference * maxPerc) / 100

  const { h: estimateHours, m: estimateMinutes } = secondsToTime(estimatedHours);

  return (
    <View style={{}}>
      <Svg height="65" width="65">
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
        defaultValue={estimated && estimatedHours > 0 ? `${estimateHours}H` : "0H"}
        style={[
          StyleSheet.absoluteFillObject,
          { fontSize: 12, color: colors.primary },
          { fontFamily: typography.primary.semiBold, textAlign: "center" },
        ]}
      />
    </View>
  )
}

export default ProgressTimeIndicator

import React from "react"
import { View, TextInput, StyleSheet } from "react-native"
import Svg, { G, Circle } from "react-native-svg"

type progressProps={
    estimatedHours:number;
    workedHours:number;
}

const ProgressTimeIndicator = ({estimatedHours, workedHours}:progressProps) => {

  const percentage = workedHours;
  const max = estimatedHours;
  
  
  const radius = 20
  const strokeWidth = 3
  const color = "green"
  const maxPerc = (100 * percentage) / max
  const circleCircumference = 2 * Math.PI * radius
  const strokeDashoffset = circleCircumference - (circleCircumference * maxPerc) / 100

  return (
    <View>
      <Svg height="50" width="50">
        <G>
          <Circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke={color}
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
            strokeDashoffset={strokeDashoffset}
          />
        </G>
      </Svg>
      <TextInput
        underlineColorAndroid={"transparent"}
        editable={false}
        defaultValue={`${estimatedHours}h`}
        style={[
          StyleSheet.absoluteFillObject,
          { fontSize: radius / 1.5, color: "green" },
          { fontWeight: "900", textAlign: "center" },
        ]}
      />
    </View>
  )
}

export default ProgressTimeIndicator

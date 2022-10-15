import React from "react"
import { View } from "react-native"

// COMPONENTS
import { Card, Text, Button } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors } from "../../../../theme"

export type Props = Record<string, unknown>

export const HeaderTimerCard: React.FC<Record<string, unknown>> = () => {
  return (
    <View style={{ ...GS.inlineItems, ...GS.justifyBetween, ...GS.mb4 }}>
      <Text weight="bold" size="xl">
        02:10:59
      </Text>

      {/* <View>
        <View style={{ ...GS.roundedFull, ...GS.overflowHidden }}>
          <TouchableNativeFeedback>
            <View style={$playButton}>
              <Icon icon="more" color={colors.palette.primary600} />
            </View>
          </TouchableNativeFeedback>
        </View>
      </View> */}

      <Button preset="reversed" style={{ backgroundColor: colors.primary }}>
        Start
      </Button>
    </View>
  )
}

export const ContentTimerCard: React.FC<Record<string, unknown>> = () => {
  return (
    <View>
      <View
        style={{
          ...GS.positionRelative,
          ...GS.overflowHidden,
          ...GS.roundedSm,
          ...GS.mb2,
          backgroundColor: colors.palette.neutral200,
        }}
      >
        <View style={{ ...GS.py1, width: `${70}%`, backgroundColor: colors.palette.primary600 }} />
      </View>

      <View style={{ ...GS.inlineItems, ...GS.justifyBetween }}>
        <Text>00:00</Text>

        <Text>02:12:30</Text>
      </View>
    </View>
  )
}

export const TimerCard: React.FC<Record<string, unknown>> = () => {
  return (
    <Card
      HeadingComponent={<HeaderTimerCard />}
      ContentComponent={<ContentTimerCard />}
      style={{ ...GS.p3, ...GS.mb4, ...GS.shadow }}
    />
  )
}

export default TimerCard

// const $playButton: ViewStyle = {
//   ...GS.roundedFull,
//   ...GS.border,
//   ...GS.py0,
//   ...GS.centered,
//   height: spacing.huge,
//   width: spacing.huge,
//   borderColor: colors.palette.primary600,
//   borderWidth: spacing.micro,
// }

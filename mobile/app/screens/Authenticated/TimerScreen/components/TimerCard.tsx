import React, { useEffect, useState } from "react"
import { View } from "react-native"

// COMPONENTS
import { Card, Text, Button } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors } from "../../../../theme"
import { formatDuration } from "../../../../utils/formatDate"
import LocalStorage from "../../../../services/api/tokenHandler"

export type Props = Record<string, unknown>

/**
 * TimerCardProps
 */
export type TimerCardProps = {
  totalTime: number
  onTimerStart: () => void
  onTimerStop: () => void
  workedTime: number
  startTime: number
  timerStarted?: boolean
}

export type SavedTimer = {
  started: boolean
  startTime: number
}

export const HeaderTimerCard: React.FC<Partial<TimerCardProps>> = (props) => {
  const { workedTime, onTimerStart, onTimerStop, timerStarted } = props

  useEffect(() => {
    //
  }, [timerStarted])
  return (
    <View style={{ ...GS.inlineItems, ...GS.justifyBetween, ...GS.mb4 }}>
      <Text weight="bold" size="xl">
        {formatDuration(workedTime)}
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

      <View style={{ ...GS.inlineItems }}>
        <Button
          onPress={timerStarted ? onTimerStop : onTimerStart}
          preset="reversed"
          style={{ ...GS.mr2, backgroundColor: colors.primary }}
        >
          {timerStarted ? "Stop" : "Start"}
        </Button>
      </View>
    </View>
  )
}

export const ContentTimerCard: React.FC<Partial<TimerCardProps>> = (props) => {
  const { workedTime, startTime } = props

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
        <Text>{formatDuration(startTime)}</Text>

        <Text>{formatDuration(workedTime)}</Text>
      </View>
    </View>
  )
}

export const TimerCard: React.FC<TimerCardProps> = (props) => {
  const { totalTime, onTimerStart, onTimerStop, workedTime, startTime } = props
  const [isTimerStarted, setIsTimerStarted] = useState(false)

  const isTimerRunning = async () => {
    const timer = JSON.parse(await LocalStorage.get("timer")) as SavedTimer
    if (timer.started) {
      setIsTimerStarted(true)
    } else {
      setIsTimerStarted(false)
    }
  }

  useEffect(() => {
    isTimerRunning()
  }, [])

  return (
    <Card
      HeadingComponent={
        <HeaderTimerCard
          timerStarted={isTimerStarted}
          onTimerStart={onTimerStart}
          onTimerStop={onTimerStop}
          totalTime={totalTime}
        />
      }
      ContentComponent={<ContentTimerCard workedTime={workedTime} startTime={startTime} />}
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

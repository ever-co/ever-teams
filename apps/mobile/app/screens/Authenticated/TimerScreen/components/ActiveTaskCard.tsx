import React from "react"
import { View } from "react-native"

// COMPONENTS
import { Icon, Card, Text, TextField } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors } from "../../../../theme"

export type Props = Record<string, unknown>

export const HeaderActiveTask = () => (
  <View style={{ ...GS.inlineItems }}>
    <Text size="md" weight="semiBold" style={{ ...GS.mr2 }}>
      Active Task:
    </Text>
    <TextField
      placeholder="Create_dashboard"
      containerStyle={{ ...GS.flex1 }}
      inputWrapperStyle={{
        ...GS.bgTransparent,
        ...GS.rounded,
        borderColor: colors.palette.primary600,
      }}
      RightAccessory={(props) => (
        <Icon
          icon="caretRight"
          containerStyle={props.style}
          color={colors.palette.primary600}
          size={21}
        />
      )}
    />
  </View>
)

const ActiveTaskCard: React.FC<Props> = () => {
  return (
    <View style={{ ...GS.mb5 }}>
      <Card
        HeadingComponent={<HeaderActiveTask />}
        style={{ ...GS.p3, ...GS.mb2, ...GS.shadow, minHeight: null || null }}
      />
      <Text size="md" weight="bold" style={{ ...GS.ml3 }}>
        Estimated: {40}h:{15}min
      </Text>
    </View>
  )
}

export default ActiveTaskCard

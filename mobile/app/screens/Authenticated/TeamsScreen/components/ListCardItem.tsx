import React from "react"
import { View, ViewStyle } from "react-native"

// COMPONENTS
import { Icon, Card, Text } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { colors, spacing } from "../../../../theme"

export type Props = {
  variant: "success" | "warning" | "danger"
}

export const ListItemContent = () => (
  <View style={{ ...GS.inlineItems }}>
    <Text size="sm" weight="bold" style={{ ...GS.p2 }}>
      User 1
    </Text>

    <View
      // eslint-disable-next-line react-native/no-inline-styles
      style={$listItemSeparatorContent}
    />

    <Text size="sm" style={{ ...GS.p2, ...GS.flex1 }}>
      02.10.59
    </Text>

    <View
      // eslint-disable-next-line react-native/no-inline-styles
      style={$listItemSeparatorContent}
    />

    <Text size="sm" style={{ ...GS.p2, ...GS.flex1 }}>
      02.10.59
    </Text>

    <Icon icon="caretRight" />
  </View>
)

const ListCardItem: React.FC<Props> = ({ variant }) => (
  <View style={{ ...GS.inlineItems, ...GS.mb2 }}>
    <View style={{ ...GS.mr2 }}>
      <View style={{ ...GS.p3, ...GS.roundedFull, backgroundColor: CC[variant] }} />
    </View>

    <Card
      style={{
        ...$listCard,
        borderColor: CC[variant],
      }}
      HeadingComponent={<ListItemContent />}
    />
  </View>
)

export default ListCardItem

const $listCard: ViewStyle = {
  ...GS.py0,
  ...GS.flex1,
  ...GS.rounded0,
  ...GS.noShadow,
  ...GS.noBorder,
  borderLeftWidth: spacing.extraSmall - spacing.micro,
  minHeight: null,
}

const $listItemSeparatorContent: ViewStyle = {
  backgroundColor: colors.palette.neutral900,
  width: spacing.micro,
  height: "100%",
}

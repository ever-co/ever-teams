import React from "react"
import { ScrollView, View, ViewStyle, TouchableOpacity } from "react-native"

// COMPONENTS
import { Icon, Card, Text } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { colors, spacing } from "../../../../theme"

export type ListItemContentProps = {
  variant: "success" | "warning" | "danger"
}

export interface Props extends ListItemContentProps {}

export const ListItemContent: React.FC<ListItemContentProps> = ({ variant }) => (
  <View style={{ ...GS.inlineItems }}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <TouchableOpacity>
        <View style={{ ...GS.inlineItems }}>
          <Text size="sm" weight="bold" style={{ ...GS.p2 }}>
            User 1
          </Text>

          <View style={$listItemSeparatorContent} />

          <Text size="sm" style={{ ...GS.p2, ...GS.flex1 }}>
            Task description
          </Text>

          <View style={$listItemSeparatorContent} />

          <View
            style={{
              ...GS.positionRelative,
              ...GS.overflowHidden,
              ...GS.roundedSm,
              ...GS.mx2,
              ...GS.mb2,
              backgroundColor: colors.palette.neutral200,
              width: parseInt("80"),
            }}
          >
            <View style={{ ...GS.py1, width: `${70}%`, backgroundColor: CC[variant] }} />
          </View>

          <View style={$listItemSeparatorContent} />

          <Text size="sm" style={{ ...GS.p2, ...GS.flex1 }}>
            02.10.59
          </Text>

          <View style={$listItemSeparatorContent} />

          <Text size="sm" style={{ ...GS.p2, ...GS.flex1 }}>
            02.10.59
          </Text>
        </View>
      </TouchableOpacity>
    </ScrollView>

    <TouchableOpacity>
      <Icon icon="caretRight" />
    </TouchableOpacity>
  </View>
)

const ListCardItem: React.FC<Props> = (props) => (
  <View style={{ ...GS.inlineItems, ...GS.mb2 }}>
    <Card
      style={{
        ...$listCard,
        backgroundColor: colors.palette.neutral200 + "55",
        borderColor: CC[props.variant],
      }}
      HeadingComponent={<ListItemContent {...props} />}
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

import React from "react"
import { View, ViewStyle, Image, ImageStyle, TouchableNativeFeedback } from "react-native"

// COMPONENTS
import { Card, Text } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { colors, spacing } from "../../../../theme"

export type ListItemProps = {
  variant: "success" | "warning" | "danger"
}

export interface Props extends ListItemProps {}

export const ListItemContent: React.FC<ListItemProps> = ({ variant }) => (
  <TouchableNativeFeedback>
    <View style={{ ...GS.p3 }}>
      <View style={{ ...GS.inlineItems, ...GS.py2 }}>
        <Image
          source={{
            uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Breezeicons-actions-22-im-user.svg/1200px-Breezeicons-actions-22-im-user.svg.png",
          }}
          style={$userProfile}
        />

        <Text preset="subheading">User name</Text>
      </View>

      <View style={{ ...GS.mb3 }}>
        <Text weight="semiBold" size="md">
          Task name:
        </Text>
        <Text>Task description</Text>
      </View>

      <View style={{}}>
        <Text weight="semiBold" size="md" style={{ ...GS.mb1 }}>
          Total worked time:
        </Text>

        <View style={{ ...GS.inlineItems, ...GS.justifyBetween }}>
          <Text size="sm" style={{ ...GS.mb2 }}>
            02:10:59
          </Text>

          <Text size="sm" style={{ ...GS.mb2 }}>
            03:00:00
          </Text>
        </View>

        <View
          style={{
            ...GS.positionRelative,
            ...GS.overflowHidden,
            ...GS.roundedSm,
            ...GS.mb2,
            backgroundColor: colors.palette.neutral200,
          }}
        >
          <View style={{ ...GS.py1, width: `${70}%`, backgroundColor: CC[variant] }} />
        </View>
      </View>
    </View>
  </TouchableNativeFeedback>
)

const ListCardItem: React.FC<Props> = (props) => (
  <Card
    style={{
      ...$listCard,
      ...GS.mb3,
      borderColor: CC[props.variant],
    }}
    ContentComponent={<ListItemContent {...props} />}
  />
)

export default ListCardItem

const $listCard: ViewStyle = {
  ...GS.flex1,
  ...GS.p0,
  ...GS.rounded,
  ...GS.noBorder,
  ...GS.shadow,
  borderLeftWidth: spacing.extraSmall - spacing.micro,
  minHeight: null,
}
const $userProfile: ImageStyle = {
  ...GS.roundedFull,
  ...GS.mr2,
  ...GS.borderSm,
  backgroundColor: colors.background,
  width: spacing.huge - spacing.tiny,
  height: spacing.huge - spacing.tiny,
}

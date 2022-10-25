import React from "react"
import {
  View,
  ViewStyle,
  Image,
  ImageStyle,
  TouchableNativeFeedback,
  TouchableOpacity,
  TextStyle,
} from "react-native"

// COMPONENTS
import { Card, Icon, ListItem, Text } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { colors, spacing } from "../../../../theme"
export type ListItemProps = {
  variant: "success" | "warning" | "danger"
  onPressIn?: () => unknown
}

export interface Props extends ListItemProps {}

export const ListItemContent: React.FC<ListItemProps> = ({ variant, onPressIn }) => (
  <TouchableNativeFeedback onPressIn={onPressIn}>
    <View style={{ ...GS.p3, ...GS.positionRelative }}>
      <View style={{ ...GS.inlineItems, ...GS.py1 }}>
        <Image
          source={{
            uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Breezeicons-actions-22-im-user.svg/1200px-Breezeicons-actions-22-im-user.svg.png",
          }}
          style={$userProfile}
        />

        <Text preset="default">Rouslan Konviser</Text>
      </View>

      <View style={{ ...GS.mb3 }}>
        <Text weight="light" size="xxs">
          Open Platform for On-Demand and Sharing Economies.
        </Text>
      </View>

      <View style={{ width: "100%", height: 0.5, backgroundColor: colors.separator }} />

      <View style={{}}>
        <View style={{ ...GS.inlineItems, ...GS.justifyBetween }}>
          <View>
            <Text size="xs" style={{ ...GS.mb1, ...GS.mt1 }}>
              Current Time
            </Text>
            <Text weight="bold" size="sm" style={{ ...GS.mb1 }}>
              02:10:59
            </Text>
          </View>

          <View>
            <Text size="xs" style={{ ...GS.mb1, ...GS.mt1 }}>
              Total Time
            </Text>
            <Text weight="bold" size="sm" style={{ ...GS.mb1 }}>
              03:00
            </Text>
          </View>
        </View>

        {/* <View
          style={{
            ...GS.positionRelative,
            ...GS.overflowHidden,
            ...GS.roundedSm,
            ...GS.mb2,
            backgroundColor: colors.palette.neutral200,
          }}
        >
          <View style={{ ...GS.py1, width: `${70}%`, backgroundColor: CC[variant] }} />
        </View> */}
      </View>

      {/* <View style={{}}>
        <Text weight="semiBold" size="md" style={{ ...GS.mb1 }}>
          Total worked time:
        </Text>

        <Text size="sm" style={{ ...GS.mb2 }}>
          12:10:59
        </Text>
      </View> */}
    </View>
  </TouchableNativeFeedback>
)

const ListCardItem: React.FC<Props> = (props) => {
  // STATS
  const [showMenu, setShowMenu] = React.useState(false)

  return (
    <Card
      style={{
        ...$listCard,
        ...GS.mb3,
        borderColor: CC[props.variant],
      }}
      HeadingComponent={
        <View
          style={{
            ...GS.positionAbsolute,
            ...GS.t0,
            ...GS.r0,
            ...GS.m3,
            ...GS.p2,
            ...GS.zIndexFront,
          }}
        >
          <View
            style={{
              ...GS.positionRelative,
            }}
          >
            <View
              style={{
                ...GS.positionAbsolute,
                ...GS.p2,
                ...GS.pt4,
                ...GS.shadow,
                ...GS.r0,
                ...GS.roundedSm,
                marginTop: -spacing.extraSmall,
                marginRight: -spacing.extraSmall,
                backgroundColor: colors.background,
                minWidth: spacing.massive * 2.5,
                ...(!showMenu ? { display: "none" } : {}),
              }}
            >
              <View style={{}}>
                <ListItem>Edit</ListItem>
                <ListItem>Release</ListItem>
                <ListItem>Estimate now</ListItem>
              </View>
            </View>

            <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
              <Icon icon={showMenu ? "x" : "more"} />
            </TouchableOpacity>
          </View>
        </View>
      }
      ContentComponent={
        <ListItemContent
          {...props}
          onPressIn={() => {
            setShowMenu(false)

            if (typeof props?.onPressIn === "function") {
              props.onPressIn()
            }
          }}
        />
      }
    />
  )
}

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

const $taskStyle: TextStyle = {
  textAlign: "center",
}

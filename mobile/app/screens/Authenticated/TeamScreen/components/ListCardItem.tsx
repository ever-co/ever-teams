import React from "react"
import {
  View,
  ViewStyle,
  Image,
  ImageStyle,
  TouchableNativeFeedback,
  TouchableOpacity,
  StyleSheet,
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
    <View style={{ ...GS.p2, ...GS.positionRelative }}>
      <View style={styles.firstContainer}>
        <Image source={require("../../../../../assets/images/Ruslan.png")} style={$usersProfile} />
        <Text style={styles.name}>Ruslan Konviser</Text>
        <View style={styles.estimate}>
          <Text style={{ color: "#FFF", fontSize: 10 }}>Estimate Now</Text>
        </View>
      </View>

      <Text style={styles.otherText}>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Illum, minus cupiditate corporis
      </Text>
      <View style={{ borderBottomWidth: 2, borderBottomColor: "#E8EBF8" }} />
      <View style={styles.times}>
        <View>
          <Text style={styles.timeHeading}>Current time</Text>
          <Text style={styles.timeNumber}>00:00:00</Text>
        </View>
        <View>
          <Text style={styles.timeHeading}>Total time</Text>
          <Text style={styles.timeNumber}>00:00:00</Text>
        </View>
      </View>
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
            ...GS.pt2,
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
              <Icon icon={showMenu ? "x" : "VMore"} />
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

const $usersProfile: ImageStyle = {
  ...GS.roundedFull,
  backgroundColor: colors.background,
  width: spacing.huge - spacing.tiny,
  height: spacing.huge - spacing.tiny,
}

const styles = StyleSheet.create({
  mainContainer: {
    borderColor: "#1B005D",
    borderWidth: 0.5,
    borderRadius: 20,
    height: 180,
    justifyContent: "space-around",
    padding: 10,
    marginBottom: 10,
  },
  times: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 10,
    paddingRight: 10,
    marginVertical: 10,
  },
  otherText: {
    fontSize: 12,
    color: "#ACB3BB",
    width: "80%",
    lineHeight: 15,
    marginVertical: 15,
  },
  timeNumber: {
    color: "#1B005D",
    fontSize: 18,
    fontWeight: "bold",
  },
  timeHeading: {
    color: "#ACB3BB",
    fontSize: 14,
  },
  firstContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    color: "#1B005D",
    fontSize: 13,
    fontWeight: "bold",
  },
  estimate: {
    backgroundColor: "#1B005D",
    padding: 3,
    borderRadius: 5,
    marginLeft: 25,
    paddingHorizontal: 15,
  },
  notEstimate: {
    color: "#ACB3BB",
    fontSize: 12,
    fontWeight: "400",
  },
})

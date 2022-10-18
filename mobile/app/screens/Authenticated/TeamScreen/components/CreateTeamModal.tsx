import React, { FC } from "react"
import { View, ViewStyle, Modal, ScrollView } from "react-native"

// COMPONENTS
import { Button, Screen, Text } from "../../../../components"
// STYLES
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors, spacing } from "../../../../theme"

export interface Props {
  visible: boolean
  onDismiss: () => unknown
}

const CreateTeamModal: FC<Props> = function CreateTeamModal({ visible, onDismiss }) {
  return (
    <Modal visible={visible} statusBarTranslucent onDismiss={onDismiss}>
      <Screen contentContainerStyle={$container} safeAreaEdges={["top"]}>
        <Text preset="heading" style={{}}>
          Create Team
        </Text>

        {/* Users activity list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ ...GS.py2, ...GS.px1 }}
          style={{ ...GS.my2 }}
        ></ScrollView>

        <View style={{ ...GS.inlineItems, ...GS.mb2 }}>
          <Button preset="default" style={{ ...GS.flex1, ...GS.mr2 }} onPress={() => onDismiss()}>
            Cancel
          </Button>

          <Button
            preset="reversed"
            style={{ ...GS.flex1, backgroundColor: colors.primary }}
            onPress={() => onDismiss()}
          >
            Confirm
          </Button>
        </View>
      </Screen>
    </Modal>
  )
}

export default CreateTeamModal

const $container: ViewStyle = {
  ...GS.flex1,
  paddingTop: spacing.extraLarge + spacing.large,
  paddingHorizontal: spacing.large,
}

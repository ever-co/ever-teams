import React, { FC } from "react"
import { View, ViewStyle, Modal, ScrollView } from "react-native"

// COMPONENTS
import { Button, Screen, Text, TextField } from "../../../../components"
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
        <Text preset="heading" style={{ ...GS.mb5 }}>
          Create Team
        </Text>

        {/* Users activity list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ ...GS.py2, ...GS.px1 }}
          style={{ ...GS.my2 }}
        >
          <TextField
            label="Team name"
            helper="Provide a Team  name"
            placeholder="Text goes here"
            style={{ ...GS.my3 }}
            containerStyle={{ ...GS.mb3 }}
          />

          <TextField
            status="error"
            helper="Email invalid"
            label="Own email"
            placeholder="Enter the user mail"
            style={{ ...GS.my3 }}
          />
        </ScrollView>

        <View style={{ ...GS.mb2 }}>
          <Button
            preset="reversed"
            style={{ ...GS.mb2, backgroundColor: colors.primary }}
            onPress={() => onDismiss()}
          >
            Confirm
          </Button>

          <Button preset="default" onPress={() => onDismiss()}>
            Cancel
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

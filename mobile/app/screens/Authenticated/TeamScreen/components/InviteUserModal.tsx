import React, { FC } from "react"
import { View, ViewStyle, Modal, ScrollView, Image, StyleSheet, TextInput } from "react-native"

// COMPONENTS
import { Button, Screen, Text, TextField } from "../../../../components"
// STYLES
import { CONSTANT_SIZE, GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors, spacing } from "../../../../theme"

export interface Props {
  visible: boolean
  onDismiss: () => unknown
}

const InviteUserModal: FC<Props> = function InviteUserModal({ visible, onDismiss }) {
  return (
    <Modal visible={visible} statusBarTranslucent onDismiss={onDismiss}>
      <Screen contentContainerStyle={$container} safeAreaEdges={["top"]}>
        <View style={styles.mainContainer}>
          <Image source={require("../../../../../assets/images/lock-cloud.png")} />
          <Text preset="heading" style={{ fontSize: CONSTANT_SIZE.FONT_SIZE_MD, color: "#1B005D" }}>
            Invite member to your team
          </Text>

          <Text style={{ color: "#ACB3BB", fontSize: 10, marginBottom: 10 }}>
            Send an invitation to a team member by email
          </Text>

          <View style={styles.blueBottom}>
            <TextInput placeholder="example@domain.com"></TextInput>
          </View>

          <View style={styles.greyBottom}>
            <TextInput placeholder="Team Member's Name"></TextInput>
          </View>

          <Button
            text="Send Invite"
            preset="filled"
            textStyle={{ color: colors.palette.neutral100, fontWeight: "bold" }}
            style={{
              backgroundColor: colors.primary,
              width: "100%",
            }}
          ></Button>
        </View>

        <Text preset="heading" style={{ ...GS.mb5 }}>
          Invite user
        </Text>

        {/* Users activity list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ ...GS.py2, ...GS.px1 }}
          style={{ ...GS.my2 }}
        >
          <TextField
            label="User"
            helper="Provide a valid user name"
            placeholder="Text goes here"
            style={{ ...GS.my3 }}
            containerStyle={{ ...GS.mb3 }}
          />

          <TextField
            status="error"
            helper="Email invalid"
            label="Email"
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

export default InviteUserModal

const $container: ViewStyle = {
  ...GS.flex1,
  paddingTop: spacing.extraLarge + spacing.large,
  paddingHorizontal: spacing.large,
}

const styles = StyleSheet.create({
  mainContainer: {
    alignItems: "center",
    shadowColor: "#1B005D0D",
    shadowOffset: { width: 10, height: 10 },
    shadowRadius: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    borderColor: "#1B005D0D",
    borderWidth: 2,
  },
  theTextField: {
    borderWidth: 0,
    width: "100%",
  },
  blueBottom: {
    borderBottomWidth: 2,
    borderColor: "#1B005D",
    width: "100%",
    marginBottom: 25,
  },
  greyBottom: {
    borderBottomWidth: 2,
    borderColor: "#ACB3BB",
    width: "100%",
    marginBottom: 25,
  },
})

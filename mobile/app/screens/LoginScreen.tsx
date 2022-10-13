import { Link } from "@react-navigation/native"
import { observer } from "mobx-react-lite"
import React, { FC, useEffect, useMemo, useRef, useState } from "react"
import { Pressable } from "react-native"
import { TextInput, TextStyle, View, ViewStyle, Image, ImageStyle } from "react-native"
import { Button, Icon, Screen, Text, TextField, TextFieldAccessoryProps } from "../components"
import { useStores } from "../models"
import { AppStackScreenProps } from "../navigators"
import { colors, spacing } from "../theme"
const pkg = require("../../package.json")

const welcomeLogo = require("../../assets/images/logo.png")
interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

export const LoginScreen: FC<LoginScreenProps> = observer(function LoginScreen(_props) {
  const authPasswordInput = useRef<TextInput>()
  const [isAuthPasswordHidden, setIsAuthPasswordHidden] = useState(true)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [ismanager, setIsmanager] = useState<boolean>(false)
  const [attemptsCount, setAttemptsCount] = useState(0)
  const {
    authenticationStore: {
      authEmail,
      authTeamName,
      setAuthEmail,
      setAuthTeamName,
      setAuthToken,
      validationErrors,
    },
  } = useStores()

  useEffect(() => {
    // Here is where you could fetch credientials from keychain or storage
    // and pre-fill the form fields.
    setAuthEmail("gauzy@ever.tech")
    setAuthTeamName("GauzyTeam")
  }, [])

  const errors: typeof validationErrors = isSubmitted ? validationErrors : ({} as any)

  function login() {
    setIsSubmitted(true)
    setAttemptsCount(attemptsCount + 1)

    if (Object.values(validationErrors).some((v) => !!v)) return

    // Make a request to your server to get an authentication token.
    // If successful, reset the fields and set the token.
    setIsSubmitted(false)
    setAuthTeamName("")
    setAuthEmail("")

    // We'll mock this with a fake token.
    setAuthToken(String(Date.now()))
  }

  useEffect(() => {
    return () => {
      setAuthTeamName("")
      setAuthEmail("")
    }
  }, [])

  return (
    <Screen
      preset="auto"
      contentContainerStyle={$screenContentContainer}
      safeAreaEdges={["top", "bottom"]}
    >
      <View style={$header}>
        <Image style={$welcomeLogo} source={welcomeLogo} resizeMode="contain" />
        <Text testID="login-heading" tx="loginScreen.welcome" preset="heading" style={$smalltext} />
      </View>

      <View style={$container}>
        <View style={$form}>
          <Text
            testID="login-heading"
            tx="loginScreen.enterDetails"
            preset="heading"
            style={$text}
          />
          {attemptsCount > 2 && (
            <Text tx="loginScreen.hint" size="sm" weight="light" style={$hint} />
          )}
          <TextField
            ref={authPasswordInput}
            value={authTeamName}
            onChangeText={setAuthTeamName}
            inputWrapperStyle={$textField}
            autoCapitalize="none"
            autoCorrect={false}
            labelTx="loginScreen.teamNameFieldLabel"
            placeholderTx="loginScreen.teamNameFieldPlaceholder"
            onSubmitEditing={login}
          />
          <TextField
            value={authEmail}
            onChangeText={setAuthEmail}
            inputWrapperStyle={$textField}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            labelTx="loginScreen.emailFieldLabel"
            placeholderTx="loginScreen.emailFieldPlaceholder"
            helper={errors?.authEmail}
            status={errors?.authEmail ? "error" : undefined}
            onSubmitEditing={() => authPasswordInput.current?.focus()}
          />

          <Button
            testID="login-button"
            tx="loginScreen.tapToSignIn"
            style={$tapButton}
            textStyle={{}}
            preset="reversed"
            onPress={login}
          />
          <Text style={{ fontSize: 13, fontFamily: "Helvetica Neue", marginTop: spacing.small }}>
            {" "}
            You got a invite code ?{" "}
          </Text>
          <Pressable>
            <Text
              style={{
                fontSize: 17,
                fontFamily: "Helvetica Neue",
                textDecorationLine: "underline",
              }}
            >
              {" "}
              Join as a team member
            </Text>
          </Pressable>
        </View>
      </View>
      <Text style={$release}> Version: {pkg.version}</Text>
    </Screen>
  )
})

const $screenContentContainer: ViewStyle = {
  paddingHorizontal: spacing.large,
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}

const $header: ViewStyle = {
  // paddingVertical: spacing.huge,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
}

const $container: ViewStyle = {
  // paddingVertical: spacing.huge,
  width: "100%",
  height: "80%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const $form: ViewStyle = {
  // paddingVertical: spacing.huge,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
}

const $smalltext: TextStyle = {
  marginBottom: spacing.small,
  position: "absolute",
  top: 50,
  fontSize: 16,
  color: colors.text,
  fontFamily: "Helvetica Neue",
  fontWeight: "700",
}
const $text: TextStyle = {
  marginBottom: spacing.small,

  fontSize: 26,
  color: colors.text,
  fontFamily: "Helvetica Neue",
  fontWeight: "700",
}

const $welcomeLogo: ImageStyle = {
  width: "100%",
}
const $hint: TextStyle = {
  color: colors.tint,
  marginBottom: spacing.medium,
  fontFamily: "Helvetica Neue",
}

const $textField: ViewStyle = {
  marginBottom: spacing.large,
  width: "98%",
  borderRadius: 20,
}

const $tapButton: ViewStyle = {
  marginTop: spacing.extraSmall,
  width: "98%",
  borderRadius: 50,
  backgroundColor: colors.primary,
}
const $release: TextStyle = {
  fontSize: 10,
  color: colors.text,
  fontFamily: "Helvetica Neue",
  fontWeight: "700",
}

// @demo remove-file

import { Link } from "@react-navigation/native"
import { observer } from "mobx-react-lite"
import React, { FC, useEffect, useMemo, useRef, useState } from "react"
import { Pressable } from "react-native"
import { TextInput, TextStyle, View, ViewStyle, Image, ImageStyle } from "react-native"
import { Button, Icon, Screen, Text, TextField, TextFieldAccessoryProps } from "../components"
import { useStores } from "../models"
import { AppStackScreenProps } from "../navigators"
import { colors, spacing } from "../theme"
import * as Animatable from "react-native-animatable"
const pkg = require("../../package.json")

const welcomeLogo = require("../../assets/images/logo.png")
interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

export const LoginScreen: FC<LoginScreenProps> = observer(function LoginScreen(_props) {
  const authTeamInput = useRef<TextInput>()
  const [isAuthPasswordHidden, setIsAuthPasswordHidden] = useState(true)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [newteam, setNewteam] = useState<boolean>(false)
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
      <Animatable.View animation="wobble" duration={2500} style={$header}>
        <Image style={$welcomeLogo} source={welcomeLogo} resizeMode="contain" />
        <Text testID="login-heading" tx="loginScreen.welcome" preset="heading" style={$smalltext} />
      </Animatable.View>
      {!newteam ? (
        <Animatable.View animation="bounceInDown" delay={1000} style={$container}>
          <View style={$form}>
            <Text
              testID="login-heading"
              tx="loginScreen.enterDetails"
              preset="heading"
              style={$text}
            />

            <TextField
              ref={authTeamInput}
              value={authTeamName}
              onChangeText={setAuthTeamName}
              containerStyle={$textField}
              autoCapitalize="none"
              autoCorrect={false}
              labelTx="loginScreen.teamNameFieldLabel"
              placeholderTx="loginScreen.teamNameFieldPlaceholder"
              helper={errors?.authTeamName}
              status={errors?.authTeamName ? "error" : undefined}
              onSubmitEditing={() => authTeamInput.current?.focus()}
            />
            <TextField
              value={authEmail}
              onChangeText={setAuthEmail}
              containerStyle={$textField}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              labelTx="loginScreen.emailFieldLabel"
              placeholderTx="loginScreen.emailFieldPlaceholder"
              helper={errors?.authEmail}
              status={errors?.authEmail ? "error" : undefined}
              onSubmitEditing={() => authTeamInput.current?.focus()}
            />

            <Button
              testID="login-button"
              tx="loginScreen.tapCreate"
              style={$tapButton}
              textStyle={{}}
              preset="reversed"
              onPress={login}
            />
            <Text style={{ fontSize: 13, fontFamily: "Helvetica Neue", marginTop: spacing.small }}>
              {" "}
              You got a invite code ?{" "}
            </Text>
            <Pressable
              onPress={() => {
                setNewteam(true)
              }}
            >
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
        </Animatable.View>
      ) : (
        <Animatable.View animation="bounceInUp" style={$container}>
          <View style={$form}>
            <Text
              testID="login-heading"
              tx="loginScreen.enterDetails2"
              preset="heading"
              style={$text}
            />

            <TextField
              ref={authTeamInput}
              value={authTeamName}
              onChangeText={setAuthTeamName}
              containerStyle={$textField}
              autoCapitalize="none"
              autoCorrect={false}
              labelTx="loginScreen.inviteCodeFieldLabel"
              placeholderTx="loginScreen.inviteCodeFieldPlaceholder"
              helper={errors?.authTeamName}
              status={errors?.authTeamName ? "error" : undefined}
              onSubmitEditing={() => authTeamInput.current?.focus()}
            />
            <TextField
              value={authEmail}
              onChangeText={setAuthEmail}
              containerStyle={$textField}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              labelTx="loginScreen.emailFieldLabel"
              placeholderTx="loginScreen.emailFieldPlaceholder"
              helper={errors?.authEmail}
              status={errors?.authEmail ? "error" : undefined}
              onSubmitEditing={() => authTeamInput.current?.focus()}
            />

            <Button
              testID="login-button"
              tx="loginScreen.tapJoin"
              style={$tapButton}
              textStyle={{}}
              preset="reversed"
              onPress={login}
            />
            <Text style={{ fontSize: 13, fontFamily: "Helvetica Neue", marginTop: spacing.small }}>
              {" "}
              or{" "}
            </Text>
            <Pressable
              onPress={() => {
                setNewteam(false)
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontFamily: "Helvetica Neue",
                  textDecorationLine: "underline",
                }}
              >
                {" "}
                Create new team
              </Text>
            </Pressable>
          </View>
        </Animatable.View>
      )}
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
  paddingVertical: spacing.large,
  width: "100%",
  // height: "60%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  overflow: "hidden",
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

import { Link } from "@react-navigation/native"
import { observer } from "mobx-react-lite"
import React, { FC, useEffect, useMemo, useRef, useState } from "react"
import { Pressable } from "react-native"
import { ActivityIndicator } from 'react-native-paper';
import { TextInput, TextStyle, View, ViewStyle, Image, ImageStyle } from "react-native"
import { Button, Icon, Screen, Text, TextField, TextFieldAccessoryProps } from "../components"
import { useStores } from "../models"
import { AppStackScreenProps } from "../navigators"
import { colors, spacing } from "../theme"
import { typography } from "../theme"

// import { Api } from "../services/api"

import * as Animatable from "react-native-animatable"
import { CodeInput } from "../components/CodeInput"
import { IRegister, IRegisterResponse, register } from "../services/auth/register"
const pkg = require("../../package.json")

const welcomeLogo = require("../../assets/images/gauzy-teams-blue-2.png")
const inviteCodeLogo = require("../../assets/images/lock-cloud.png")
interface LoginScreenProps extends AppStackScreenProps<"Login"> { }


export const LoginScreen: FC<LoginScreenProps> = observer(function LoginScreen(_props) {
  const authTeamInput = useRef<TextInput>()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [screenstatus, setScreenStatus] = useState<{ screen: number; animation: boolean }>({
    screen: 1,
    animation: false,
  })
  const [withteam, setWithTeam] = useState<boolean>(false)
  const [attemptsCount, setAttemptsCount] = useState(0)
  const {
    authenticationStore: {
      authEmail,
      authTeamName,
      authUsername,
      authInviteCode,
      authConfirmCode,
      setAuthEmail,
      setAuthTeamName,
      setAuthUsername,
      setAuthToken,
      setAuthConfirmCode,
      setAuthInviteCode,
      validationErrors,
      setOrganizationId,
      setUser,
      setTenantId,
      setEmployeeId
    },
    teamStore: {
      setActiveTeam, getUserTeams
    },
    TaskStore: {
      getTeamTasks
    }
  } = useStores()



  useEffect(() => {
    // Here is where you could fetch credientials from keychain or storage
    // and pre-fill the form fields.
    // setAuthEmail("gauzy@ever.tech")
    // setAuthTeamName("GauzyTeam")

  }, [])




  const errors: typeof validationErrors = isSubmitted ? validationErrors : ({} as any)
  console.log(errors)
  //const api = new Api()
  function joinTeam() {
    setIsSubmitted(true)

    setAttemptsCount(attemptsCount + 1)

    if (Object.values(validationErrors).some((v) => !!v)) return

    // Make a request to your server to get an authentication token.
    // If successful, reset the fields and set the token.
    setIsSubmitted(false)
    setAuthTeamName("")
    setAuthEmail("")
    setAuthUsername("")
    setAuthInviteCode("")
    setAuthConfirmCode("")

    // We'll mock this with a fake token.
    setAuthToken(String(Date.now()))
  }

  const createNewTeam = async () => {
    setIsSubmitted(true)
    setIsLoading(true)
    setAttemptsCount(attemptsCount + 1)

    if (Object.values(validationErrors).some((v) => !!v)) return

    // Make a request to your server to get an authentication token.


    let response: IRegisterResponse = await register({
      team: authTeamName,
      name: authUsername,
      email: authEmail
    });

    // If successful, reset the fields and set the token.
    if (response.status === 200) {

      const employee = response.employee;
      const loginRes = response.loginRes;
      const user = loginRes.user;


      setIsSubmitted(false)
      setAuthTeamName("")
      setAuthEmail("")
      setAuthInviteCode("")
      setAuthUsername("")
      setAuthConfirmCode("")

      setIsLoading(false)

      // Save Auth Data
      setAuthToken(loginRes.token);
      setActiveTeam(response.team)
      // setActiveTeamId(response.team.id)
      setOrganizationId(response.team.organizationId)
      setUser(loginRes.user)
      setTenantId(response.team.tenantId)
      setEmployeeId(employee.id)
      //Load first team data
      getUserTeams({ tenantId: response.team.tenantId, userId: loginRes.user.id, authToken: loginRes.token });
      //Load tasks for current team or initialize tasks

      getTeamTasks(
        {
          tenantId: response.team.tenantId,
          activeTeamId: response.team.id,
          authToken: loginRes.token,
          organizationId: response.team.organizationId
        })
    }
  }


  useEffect(() => {
    return () => {
      // setIsSubmitted(false)
      setAuthTeamName("")
      setAuthEmail("")
      setAuthUsername("")
      setAuthInviteCode("")
      setAuthConfirmCode("")
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
        <Text testID="login-heading" tx="loginScreen.welcome" preset="heading" style={[$smalltext, { marginTop: 10 }]} />
      </Animatable.View>
      {screenstatus.screen === 1 && !withteam ? (
        //ENTER TEAM NAME SCREEN STARTS HERE
        <Animatable.View
          animation={screenstatus.animation ? "bounceInLeft" : "bounceInDown"}
          delay={1000}
          style={$container}
        >
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
              editable={!isLoading}
              labelTx="loginScreen.teamNameFieldLabel"
              placeholderTx="loginScreen.teamNameFieldPlaceholder"
              helper={errors?.authTeamName}
              status={errors?.authTeamName ? "error" : undefined}
              onSubmitEditing={() => authTeamInput.current?.focus()}
            />

            <Button
              testID="login-button"
              tx="loginScreen.tapContinue"
              style={$tapButton}
              textStyle={{}}
              preset="reversed"
              onPress={() => {
                setScreenStatus({ screen: 2, animation: true })
              }}
            />
            <Text
              style={{
                fontSize: 13,
                fontFamily: typography.secondary.normal,
                marginTop: spacing.small,
              }}
            >
              {" "}
              You got a invite code ?{" "}
            </Text>
            <Pressable
              onPress={() => {
                setWithTeam(true)
                setScreenStatus({ screen: screenstatus.screen, animation: false })
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontFamily: typography.secondary.normal,
                  textDecorationLine: "underline",
                }}
              >
                {" "}
                Join existed team ?
              </Text>
            </Pressable>
          </View>
        </Animatable.View>
      ) : //ENTER TEAM NAME SCREEN ENDS HERE
        screenstatus.screen === 2 ? (
          //CREATE TEAM SCREEN STARTS HERE

          <Animatable.View animation={"bounceInRight"} delay={1000} style={$container}>
            <View style={$form}>
              <Text
                testID="login-heading"
                tx="loginScreen.enterDetails"
                preset="heading"
                style={$text}
              />

              <TextField
                ref={authTeamInput}
                value={authUsername}
                onChangeText={setAuthUsername}
                containerStyle={$textField}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                labelTx="loginScreen.userNameFieldLabel"
                placeholderTx="loginScreen.userNameFieldPlaceholder"
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
                editable={!isLoading}
                keyboardType="email-address"
                labelTx="loginScreen.emailFieldLabel"
                placeholderTx="loginScreen.emailFieldPlaceholder"
                helper={errors?.authEmail}
                status={errors?.authEmail ? "error" : undefined}
                onSubmitEditing={() => authTeamInput.current?.focus()}
              />
              <View style={$buttonsView}>
                <Button
                  testID="login-button"
                  // tx="loginScreen.tapCreate"
                  style={$backButton}
                  preset="reversed"
                  onPress={() => {
                    setWithTeam(false)
                    setScreenStatus({ screen: 1, animation: true })
                  }}
                >
                  <Icon icon="back" />
                </Button>

                <Button
                  testID="login-button"
                  tx="loginScreen.tapCreate"
                  style={$tapButton}
                  textStyle={{}}
                  preset="reversed"
                  onPress={() => setScreenStatus({ screen: 3, animation: true })}
                />
              </View>
            </View>
          </Animatable.View>
        ) : //CREATE TEAM SCREEN ENDS HERE
          screenstatus.screen === 3 ? (
            //EMAIL CONFIRMATION SCREEN STARTS HERE
            <Animatable.View animation={"bounceIn"} delay={1000} style={$container}>
              <View style={$form}>
                <Text
                  testID="login-heading"
                  tx="loginScreen.confirmDetails"
                  preset="heading"
                  style={$text}
                />

                <TextField
                  ref={authTeamInput}
                  value={authConfirmCode}
                  onChangeText={setAuthConfirmCode}
                  containerStyle={$textField}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  labelTx="loginScreen.confirmCodeFieldLabel"
                  placeholderTx="loginScreen.confirmCodePlaceholder"
                  helper={errors?.authConfirmCode}
                  status={errors?.authConfirmCode ? "error" : undefined}
                  onSubmitEditing={() => authTeamInput.current?.focus()}
                />

                <View style={$buttonsView}>
                  <Button
                    testID="login-button"
                    // tx="loginScreen.tapCreate"
                    style={$backButton}
                    textStyle={{}}
                    preset="reversed"
                    onPress={() => {
                      setWithTeam(false)
                      setScreenStatus({ screen: 2, animation: true })
                    }}
                  >
                    <Icon icon="back" />
                  </Button>
                  <Button
                    testID="login-button"
                    tx="loginScreen.tapConfirm"
                    style={$tapButton}
                    textStyle={{}}
                    preset="reversed"
                    onPress={createNewTeam}
                  />
                </View>
              </View>
              <Pressable
                onPress={() => {
                  setWithTeam(false)
                }}
                style={{ marginTop: 10 }}
              >
                <Text
                  style={{
                    fontSize: 17,
                    fontFamily: typography.secondary.normal,
                    textDecorationLine: "underline",
                  }}
                >
                  {" "}
                  Resend code
                </Text>
              </Pressable>
            </Animatable.View>
          ) : (
            //EMAIL CONFIRMATION SCREEN ENDS HERE
            //JOIN TEAM SCREEN STARTS HERE
            <Animatable.View animation="bounceInUp" style={$container}>
              <View style={$form}>
                <View style={$joinTeamLogoContainer}>
                  <Image style={$joinTeamLogo} source={inviteCodeLogo} resizeMode="contain" />
                </View>

                <Text
                  testID="login-heading"
                  tx="loginScreen.enterDetails2"
                  preset="heading"
                  style={$text}
                />

                <Text
                  testID="login-heading"
                  tx="loginScreen.confirmDetails2"
                  preset="heading"
                  style={$confirmtext}
                />

                <CodeInput />

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
                  textStyle={$joinButtonText}
                  preset="reversed"
                  onPress={joinTeam}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: typography.secondary.normal,
                    marginTop: spacing.small,
                  }}
                >
                  {" "}
                  or{" "}
                </Text>
                <Pressable
                  onPress={() => {
                    setWithTeam(false)
                  }}
                >
                  <Text
                    style={{
                      fontSize: 17,
                      fontFamily: typography.secondary.normal,
                      textDecorationLine: "underline",
                    }}
                  >
                    {" "}
                    Create new team
                  </Text>
                </Pressable>
              </View>
            </Animatable.View>

            //JOIN TEAM SCREEN ENDS HERE
          )}
      <ActivityIndicator style={$loading} animating={isLoading} size={'small'} color={colors.primary} />
      <Text style={$release}> Version: {pkg.version}</Text>
    </Screen>
  )
})

//Styles

const $screenContentContainer: ViewStyle = {
  paddingHorizontal: spacing.large,
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}

const $header: ViewStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  paddingTop: 15,
  justifyContent: "flex-start",
}

const $container: ViewStyle = {
  paddingVertical: spacing.large,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  overflow: "hidden",
}

const $form: ViewStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
}

const $loading: ViewStyle = {
  position: "absolute",
  bottom: "15%"
}

const $smalltext: TextStyle = {
  marginBottom: spacing.small,
  position: "absolute",
  top: 40,
  fontSize: 16,
  color: colors.text,
  fontFamily: typography.secondary.normal,
  fontWeight: "300",
}
const $text: TextStyle = {
  marginBottom: spacing.small,
  fontSize: 20,
  color: colors.text,
  fontFamily: typography.secondary.normal,
  fontWeight: "700",
}

const $confirmtext: TextStyle = {
  marginBottom: spacing.small,
  fontSize: 16,
  color: colors.text,
  textAlign: "center",
  fontFamily: typography.secondary.normal,
  fontWeight: "300",
}

const $welcomeLogo: ImageStyle = {
  width: "70%",
}

const $joinButtonText: TextStyle = {
  fontWeight: "700",
}

const $joinTeamLogo: ImageStyle = {
  width: "100%",
}

const $joinTeamLogoContainer: ViewStyle = {
  width: 120,
  height: 120,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.palette.neutral200,
  borderRadius: 60,
  marginTop: 50,
}
const $textField: ViewStyle = {
  marginBottom: spacing.large,
  width: "98%",
  borderRadius: 20,
}

const $tapButton: ViewStyle = {
  marginTop: spacing.extraSmall,
  width: "80%",
  borderRadius: 50,
  backgroundColor: colors.primary,
}
const $buttonsView: ViewStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "row",
  alignContent: "center",
  justifyContent: "space-around",
}

const $backButton: ViewStyle = {
  height: 45,
  width: 45,
  marginTop: spacing.extraSmall,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 50,
  backgroundColor: colors.palette.neutral200,
}
const $release: TextStyle = {
  fontSize: 10,
  color: colors.text,
  fontFamily: typography.secondary.normal,
  fontWeight: "700",
}

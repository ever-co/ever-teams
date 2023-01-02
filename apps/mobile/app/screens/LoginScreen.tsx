import { Link } from "@react-navigation/native"
import { observer } from "mobx-react-lite"
import React, { FC, useEffect, useRef, useState } from "react"
import { Dimensions } from "react-native"
import * as Animatable from 'react-native-animatable';
import { TextInput, TextStyle, Text, View, ViewStyle, Image, ImageStyle, TouchableOpacity } from "react-native"
import { Button, Screen, TextField } from "../components"
import { useStores } from "../models"
import { AppStackScreenProps } from "../navigators"
import { colors, spacing } from "../theme"
import { typography } from "../theme"

// import { Api } from "../services/api"

import { CodeInput } from "../components/CodeInput"
import { register } from "../services/client/api/auth/register"
import { login } from "../services/client/api/auth/login"
import { useTeamInvitations } from "../services/hooks/useTeamInvitation";
import { useTeamTasks } from "../services/hooks/features/useTeamTasks";
import { useFirstLoad } from "../services/hooks/useFirstLoad";
import { ActivityIndicator } from "react-native-paper";
const pkg = require("../../package.json")

interface LoginScreenProps extends AppStackScreenProps<"Login"> { }

const { width, height } = Dimensions.get("window")
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
  const { verifyInviteByCode } = useTeamInvitations();
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
      setActiveTeam, getUserTeams,
      setActiveTeamId
    },
  } = useStores()

  const { loadTeamTasksData } = useTeamTasks();
  const { firstLoadData } = useFirstLoad();


  useEffect(() => {
    // Here is where you could fetch credientials from keychain or storage
    // and pre-fill the form fields.
    // setAuthEmail("gauzy@ever.tech")
    // setAuthTeamName("GauzyTeam")

  }, [])




  const errors: typeof validationErrors = isSubmitted ? validationErrors : ({} as any)

  //const api = new Api()
  const joinTeam = async () => {
    setIsSubmitted(true)

    setAttemptsCount(attemptsCount + 1)

    if (Object.values(validationErrors).some((v) => !!v)) return
    // verifyInviteByCode({ email: authEmail, code: authInviteCode });
    const { response } = await login({ email: authEmail, code: authInviteCode })

    // Make a request to your server to get an authentication token.
    // If successful, reset the fields and set the token.
    if (response.status == 200) {
      setIsSubmitted(false)
      setAuthTeamName("")
      setAuthEmail("")
      setAuthUsername("")
      setAuthInviteCode("")
      setAuthConfirmCode("")

      const data = response.data

      const employee = data.loginRes.user.employee;
      const loginRes = data.loginRes;
      const user = loginRes.user;


      setIsSubmitted(false)
      setAuthTeamName("")
      setAuthEmail("")
      setAuthInviteCode("")
      setAuthUsername("")
      setAuthConfirmCode("")

      setIsLoading(false)
      setActiveTeamId(data.team.id)
      setActiveTeam(data.team)
      setOrganizationId(data.team.organizationId)
      setUser(loginRes.user)
      setTenantId(data.team.tenantId)
      setEmployeeId(employee.id)
      //Load first team data
      getUserTeams({ tenantId: data.team.tenantId, userId: loginRes.user.id, authToken: loginRes.token });
      //Load tasks for current team or initialize tasks
      loadTeamTasksData();
      firstLoadData();
      // Save Auth Data
      setAuthToken(loginRes.token);
      setIsLoading(false)
    }

  }

  const createNewTeam = async () => {
    setIsSubmitted(true)
    setAttemptsCount(attemptsCount + 1)

    if (Object.values(validationErrors).some((v) => !!v)) return
    setIsLoading(true)
    // Make a request to your server to get an authentication token.


    const { response } = await register({
      team: authTeamName,
      name: authUsername,
      email: authEmail
    });
    console.log("RESPONSE" + JSON.stringify(response))
    // If successful, reset the fields and set the token.
    if (response.status === 200) {
      const data = response.data
      console.log(JSON.stringify(data))
      const employee = data.employee;
      const loginRes = data.loginRes;
      const user = loginRes.user;


      setIsSubmitted(false)
      setAuthTeamName("")
      setAuthEmail("")
      setAuthInviteCode("")
      setAuthUsername("")
      setAuthConfirmCode("")

      setIsLoading(false)

      setActiveTeamId(data.team.id)
      setActiveTeam(data.team)
      setOrganizationId(data.team.organizationId)
      setUser(loginRes.user)
      setTenantId(data.team.tenantId)
      setEmployeeId(employee.id)
      //Load first team data
      getUserTeams({ tenantId: data.team.tenantId, userId: loginRes.user.id, authToken: loginRes.token });
      //Load tasks for current team or initialize tasks

      loadTeamTasksData();
      firstLoadData();
      // Save Auth Data
      setAuthToken(loginRes.token);
      setIsLoading(false)
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
      backgroundColor={colors.primary}
      statusBarStyle="light"
      safeAreaEdges={["top"]}
    >
      <View style={{ paddingHorizontal: 20, marginTop: 20, width, backgroundColor: colors.primary }}>
        <Image source={require("../../assets/images/new/gauzy-teams-white.png")} />
        <View style={{ width: "100%", justifyContent: "center", alignItems: "center" }}>
          <Text style={$screenTitle}>Create New Team</Text>
          {!width ?
            <Text style={$smalltext}>Please enter your team details to create a new team.</Text>
            :
            <Text style={$smalltext}>Please enter email and invitation code to join existing team.</Text>

          }
        </View>
      </View>
      <View style={{ width, height: height / 1.9, backgroundColor: "#fff" }}>

        {/* CREATE NEW TEAM STARTS HERE */}
        {/* STEP 1 : PROVIDE TEAM NAME */}
        {screenstatus.screen === 1 && !withteam ? (
          <Animatable.View animation={"bounceIn"} delay={1000} style={$form}>
            <Text style={$text}>Select Team Name</Text>
            <TextField
              placeholder="Please Enter your team name |"
              containerStyle={$textField}
              placeholderTextColor={"rgba(40, 32, 72, 0.4)"}
              inputWrapperStyle={$inputStyleOverride}
              ref={authTeamInput}
              value={authTeamName}
              onChangeText={setAuthTeamName}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              helper={errors?.authTeamName}
              status={errors?.authTeamName ? "error" : undefined}
              onSubmitEditing={() => authTeamInput.current?.focus()}
            />
            <View style={[$buttonsView]}>
              <TouchableOpacity style={{}} onPress={() => setWithTeam(true)}>
                <Text style={$backButtonText}>Joining existing team?</Text>
              </TouchableOpacity>
              <Button
                style={$tapButton}
                textStyle={$tapButtonText}
                onPress={() => setScreenStatus({
                  screen: 2,
                  animation: true
                })}
              >
                <Text>Continue</Text>
              </Button>
            </View>
          </Animatable.View>
          // END STEP 1 : PROVIDE TEAM NAME
        )

          : screenstatus.screen === 2 ? (
            // STEP 2 : ENTER YOUR NAME AND EMAIL
            <Animatable.View animation={"bounceIn"} delay={1000} style={$form}>
              <Text style={$text}>Provide More Details</Text>
              <TextField
                placeholder="Enter your name |"
                containerStyle={$textField}
                placeholderTextColor={"rgba(40, 32, 72, 0.4)"}
                inputWrapperStyle={$inputStyleOverride}
                ref={authTeamInput}
                value={authUsername}
                onChangeText={setAuthUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                helper={errors?.authUsername}
                status={errors?.authUsername ? "error" : undefined}
                onSubmitEditing={() => authTeamInput.current?.focus()}
              />
              <TextField
                placeholder="Enter your email address |"
                containerStyle={[$textField, { marginTop: 20 }]}
                placeholderTextColor={"rgba(40, 32, 72, 0.4)"}
                inputWrapperStyle={$inputStyleOverride}
                ref={authTeamInput}
                value={authEmail}
                onChangeText={setAuthEmail}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                helper={errors?.authEmail}
                status={errors?.authEmail ? "error" : undefined}
                onSubmitEditing={() => authTeamInput.current?.focus()}
              />
              <View style={[$buttonsView]}>
                <TouchableOpacity
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: 65 }}
                  onPress={() => setScreenStatus({
                    screen: 1,
                    animation: true
                  })}
                >
                  <Image source={require("../../assets/icons/back.png")} />
                  <Text style={[$backButtonText, { color: colors.primary, fontSize: 14 }]}>Back</Text>
                </TouchableOpacity>
                <Button
                  style={[$tapButton, { width: width / 2.1 }]}
                  textStyle={$tapButtonText}
                  onPress={() => setScreenStatus({
                    screen: 3,
                    animation: true
                  })}
                >
                  <Text>Continue</Text>
                </Button>
              </View>
            </Animatable.View>
            // END STEP 2 : ENTER YOUR NAME AND EMAIL 
          ) : screenstatus.screen === 3 ? (
            // START STEP 3 : EMAIL VERIFICATION
            <Animatable.View animation={"bounceIn"} delay={1000} style={$form}>
              <Text style={$text}>Invitation code</Text>
              <View>
                <CodeInput
                  onChange={setAuthConfirmCode}
                />
                <TouchableOpacity style={$resendWrapper}
                  onPress={() => setScreenStatus({
                    screen: 2,
                    animation: true
                  })}>
                  <Text style={$resendText}>Didn’t recieve code ?Re<Text style={{ color: colors.primary }}>send Code</Text></Text>
                </TouchableOpacity>
              </View>
              <View style={[$buttonsView]}>
                <Button
                  style={[$tapButton, { width: "100%", opacity:isLoading ? 0.7 :1 }]}
                  textStyle={$tapButtonText}
                  onPress={() => createNewTeam()}
                >
                  <Text>Join</Text>
                </Button>
                <ActivityIndicator style={$loading} animating={isLoading} size={'small'} color={"#fff"} />
              </View>
            </Animatable.View>

            // END STEP 3 : EMAIL VERIFICATION
          ) : (
            // JOIN EXISTED TEAM STARTS HERE
            <Animatable.View animation={"bounceInUp"} style={$form}>
              <Text style={$text}>Provide your Email</Text>
              <TextField
                placeholder="Enter your name |"
                containerStyle={$textField}
                placeholderTextColor={"rgba(40, 32, 72, 0.4)"}
                inputWrapperStyle={$inputStyleOverride}
                ref={authTeamInput}
                value={authEmail}
                onChangeText={setAuthEmail}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                helper={errors?.authEmail}
                status={errors?.authEmail ? "error" : undefined}
                onSubmitEditing={() => authTeamInput.current?.focus()}
              />
              <View style={{ marginTop: 32 }}>
                <Text style={$inputInviteTitle}>Input invitation code</Text>
                <CodeInput
                  onChange={setAuthInviteCode}
                />
                <TouchableOpacity style={$resendWrapper}
                  onPress={() => setScreenStatus({
                    screen: 2,
                    animation: true
                  })}>
                  <Text style={$resendText}>Didn’t recieve code ?Re-<Text style={{ color: colors.primary }}>send Code</Text></Text>
                </TouchableOpacity>
              </View>
              <View style={[$buttonsView]}>
                <Button
                  style={[$tapButton, { width: "100%", opacity:isLoading ? 0.7 :1 }]}
                  textStyle={$tapButtonText}
                  onPress={() => joinTeam()}
                >
                  <Text>Join</Text>
                </Button>
                <ActivityIndicator style={$loading} animating={isLoading} size={'small'} color={"#fff"} />
              </View>
            </Animatable.View>
          )}

        <View style={$bottomSection}>
          <Text style={$bottomSectionTxt}>©2022. https://gauzy.teams, Powered by Gauzy. All right reserved, Terms of Services</Text>
          <Image style={{ height: 50, marginBottom: -25 }} source={require("../../assets/icons/new/toogle-light.png")} />
        </View>
      </View>
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
  position: "absolute",
  padding: 24,
  top: -height / 5.7,
  width: width / 1.2,
  alignSelf: 'center',
  backgroundColor: colors.background,
  display: "flex",
  alignItems: "center",
  borderRadius: 16,
  justifyContent: "flex-start",
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.1)",
  elevation: 10,
  shadowColor: "rgba(0,0,0,0.1)",
  shadowOffset: { width: 10, height: 10 },
  shadowOpacity: 5,
  shadowRadius: 9,
  minHeight: height / 4
}

const $loading: ViewStyle = {
  position: "absolute",
  bottom: "20%",
  left: 10,

}

const $smalltext: TextStyle = {
  marginTop: spacing.medium,
  fontSize: spacing.small,
  color: "#fff",
  fontFamily: typography.secondary.normal,
  fontWeight: "400",
}
const $text: TextStyle = {
  marginBottom: spacing.small,
  fontSize: 24,
  color: "#1A1C1E",
  fontFamily: typography.primary.semiBold,
}

const $screenTitle: TextStyle = {
  marginTop: 40,
  fontSize: 25,
  color: "#fff",
  fontFamily: typography.primary.bold,
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
  width: "100%",
  height: 53,
  borderRadius: 20,
}
const $inputStyleOverride: TextStyle = {
  marginTop: 28,
  height: 53,
  borderColor: "rgba(0,0,0,0.1)",
  backgroundColor: "#FFFFFF",
  paddingVertical: 7,
  paddingHorizontal: 10,
  borderRadius: 10

}

const $tapButton: ViewStyle = {
  marginTop: spacing.extraSmall,
  width: width / 3,
  borderRadius: 10,
  backgroundColor: "#3826A6",
}

const $tapButtonText: TextStyle = {
  color: "#fff",
  fontFamily: typography.primary.semiBold,
  fontSize: 16
}
const $buttonsView: ViewStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  marginTop: 32,
  justifyContent: "space-between",
}
const $resendWrapper: ViewStyle = {
  marginTop: 24
}

const $resendText: TextStyle = {
  fontSize: 14,
  color: "#B1AEBC",
  fontFamily: typography.primary.medium
}

const $backButton: ViewStyle = {

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
const $backButtonText: TextStyle = {
  fontSize: 12,
  fontFamily: typography.primary.semiBold,
  color: "#3826A6"
}
const $bottomSection: ViewStyle = {
  position: "absolute",
  justifyContent: "space-between",
  alignItems: "center",
  width: width - 40,
  flexDirection: 'row',
  alignSelf: "center",
  bottom: 44,
  paddingTop: 16,
  borderTopColor: "rgba(0, 0, 0, 0.16)",
  borderTopWidth: 1
}
const $bottomSectionTxt: TextStyle = {
  width: width / 1.47,
  fontSize: 10,
  fontFamily: typography.primary.medium,
  color: "rgba(126, 121, 145, 0.7)"
}

const $inputInviteTitle: TextStyle = {
  fontSize: 14,
  fontFamily: typography.primary.medium,
  color: "#B1AEBC"
}

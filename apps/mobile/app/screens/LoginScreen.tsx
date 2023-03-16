import { observer } from "mobx-react-lite"
import React, { FC, useCallback, useEffect, useRef, useState } from "react"
import { Dimensions } from "react-native"
import * as Animatable from 'react-native-animatable';
import { TextInput, TextStyle, Text, View, ViewStyle, Image, ImageStyle, TouchableOpacity } from "react-native"
import EStyleSheet from 'react-native-extended-stylesheet';
import { Button, Screen, TextField } from "../components"
import { useStores } from "../models"
import { AppStackScreenProps } from "../navigators"
import { colors, spacing } from "../theme"
import { typography } from "../theme"


import { CodeInput } from "../components/CodeInput"
import { register } from "../services/client/api/auth/register"
import { login } from "../services/client/api/auth/login"
import { useFirstLoad } from "../services/hooks/useFirstLoad";
import { ActivityIndicator } from "react-native-paper";
import { translate } from "../i18n";
import sendAuthCode from "../services/client/api/auth/sendAuthCode";
import { useAppTheme } from "../app";
import { resentVerifyUserLinkRequest, verifyUserEmailByCodeRequest } from "../services/client/requests/auth";
const pkg = require("../../package.json")

interface LoginScreenProps extends AppStackScreenProps<"Login"> { }

const { width, height } = Dimensions.get("window")

export const LoginScreen: FC<LoginScreenProps> = observer(function LoginScreen(_props) {
  const authTeamInput = useRef<TextInput>()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [joinError, setJoinError] = useState(null)
  const [verificationError, setVerificationError] = useState(null)
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
      setTempAuthToken,
      tempAuthToken,
      setOrganizationId,
      tenantId,
      setUser,
      setTenantId,
      setEmployeeId,
      setRefreshToken,
      toggleTheme,
    },
    teamStore: {
      setActiveTeam,
      setActiveTeamId
    },
  } = useStores()

  const { firstLoadData } = useFirstLoad();
  const { colors, dark } = useAppTheme();



  const errors: typeof validationErrors = isSubmitted ? validationErrors : ({} as any)

  /**
   * Join an existing team
   */
  const joinTeam = async () => {
    setIsSubmitted(true)

    setAttemptsCount(attemptsCount + 1)

    // if (Object.values(validationErrors).some((v) => !!v)) return
    setIsLoading(true)

    await login({ email: authEmail, code: authInviteCode })
      .then((res) => {
        const { response, errors, status } = res

        if (status === 200) {

          const loginRes = response.data.authStoreData
          const user = response.data.loginResponse.user
          // const employee = user.employee;
          const team = response.data.team

          setActiveTeamId(loginRes.teamId)
          setActiveTeam(team)
          setOrganizationId(team.organizationId)
          setUser(user)
          setTenantId(team.tenantId)
          setEmployeeId(user.employee.id)

          // Save Auth Token
          setAuthToken(loginRes.access_token);
          setRefreshToken(loginRes.refresh_token.token)
          setIsLoading(false)

          // Reset all fields
          setIsSubmitted(false)
          setAuthTeamName("")
          setAuthEmail("")
          setAuthInviteCode("")
          setAuthUsername("")
          setAuthConfirmCode("")
          setAuthTeamName("")
          setAuthEmail("")
          setAuthUsername("")
          setAuthInviteCode("")
          setAuthConfirmCode("")
        } else {
          if (errors) {
            setJoinError(errors.email)
            setIsLoading(false)
            setIsSubmitted(false)
            return
          }
        }
      })
      .catch((e) => console.log(e))
  }

  /**
   * 
   * Register or Create New Team
   */
  const createNewTeam = async () => {

    setIsSubmitted(true)
    setAttemptsCount(attemptsCount + 1)

    if (Object.values(validationErrors).some((v) => !!v)) return

    setIsLoading(true)
    // Make a request to your server to get an authentication token.
    await register({
      team: authTeamName,
      name: authUsername,
      email: authEmail
    }).then((res) => {
      const { response } = res

      // If successful, reset the fields and set the token.
      if (response.status === 200) {
        const data = response.data

        const employee = data.employee;
        const loginRes = data.loginRes;
        const user = loginRes.user;

        setActiveTeamId(data.team.id)
        setActiveTeam(data.team)
        setOrganizationId(data.team.organizationId)
        setUser(loginRes.user)
        setTenantId(data.team.tenantId)
        setEmployeeId(employee.id)

        firstLoadData();
        // Save Auth Data
        setTempAuthToken(loginRes.token)
        setRefreshToken(loginRes.refresh_token)
        setScreenStatus({
          screen: 3,
          animation: true
        })

        setIsLoading(false)
        setIsSubmitted(false)
      }
    }).catch((e) => console.log(e))
  }

  /**
   * Generate authentication code for login
   */
  const getAuthCode = useCallback(async () => {
    setIsSubmitted(true)
    setIsLoading(true)
    await sendAuthCode(authEmail).then((res) => {
      const { data, status, error } = res

    }).catch((e) => console.log(e))
    setIsSubmitted(false);
    setIsLoading(false)
  }, [authEmail])

  /**
   * Verify User Email by Verification Code
   */
  const verifyEmailByCode = async () => {
    setIsLoading(true)
    await verifyUserEmailByCodeRequest({
      bearer_token: tempAuthToken,
      code: parseInt(authConfirmCode),
      email: authEmail,
      tenantId
    }).then((res) => {
      const { response, data } = res
      if (data.status === 400) {
        setVerificationError(data.message)
        return
      }

      if (data.status === 200) {
        setAuthToken(tempAuthToken)
        setAuthTeamName("")
        setAuthEmail("")
        setAuthUsername("")
        setAuthInviteCode("")
        setAuthConfirmCode("")
      }
      setIsLoading(false)
    }).catch((e) => {
      setIsLoading(false)
      console.log(e)
    })
  }

  /**
   * Resend Email Verification Code
   */
  const resendEmailVerificationCode=async()=>{
    setIsLoading(true)
    await resentVerifyUserLinkRequest({
      bearer_token:tempAuthToken,
      email:authEmail,
      tenantId
    })
    setIsLoading(false)
  }

  useEffect(() => {
    return () => {
      setIsSubmitted(false)
      setAuthTeamName("")
      setAuthEmail("")
      setAuthUsername("")
      setAuthInviteCode("")
      setAuthConfirmCode("")
      setVerificationError(null)
      setJoinError(null)
    }
  }, [])



  return (
    <Screen
      preset="scroll"
      contentContainerStyle={{ ...$screenContentContainer, backgroundColor: "#282149" }}
      backgroundColor={"#282149"}
      statusBarStyle={"light"}
      safeAreaEdges={["top"]}
      ScrollViewProps={{ bounces: false }}
      KeyboardAvoidingViewProps={{}}
    >
      <View style={$header}>
        <Image source={require("../../assets/images/new/gauzy-teams-white.png")} />
        {withteam ? (
          <View style={{ width: "100%", justifyContent: "center", alignItems: "center" }}>
            <Text style={styles.screenTitle}>{translate("loginScreen.enterDetails2")}</Text>
            <Text style={styles.smalltext}>{translate("loginScreen.hintDetails2")}</Text>
          </View>
        ) : !withteam && screenstatus.screen !== 3 ?
          (
            <View style={{ width: "100%", justifyContent: "center", alignItems: "center" }}>
              <Text style={styles.screenTitle}>{translate("loginScreen.enterDetails")}</Text>
              <Text style={styles.smalltext}>{translate("loginScreen.hintDetails")}</Text>
            </View>
          ) : (
            <View style={{ width: "100%", justifyContent: "center", alignItems: "center" }}>
              <Text style={styles.screenTitle}>{translate("loginScreen.joinTeam")}</Text>
              <Text style={styles.smalltext}>{translate("loginScreen.joinTeamHint")}</Text>
            </View>
          )
        }
      </View>
      <View style={$bottom}>


        {/* CREATE NEW TEAM STARTS HERE */}
        {/* STEP 1 : PROVIDE TEAM NAME */}
        {screenstatus.screen === 1 && !withteam ? (
          <Animatable.View animation={"bounceIn"} delay={1000} style={styles.form}>
            <Text style={styles.text}>{translate("loginScreen.step1Title")}</Text>
            <TextField
              placeholder={translate("loginScreen.teamNameFieldPlaceholder")}
              containerStyle={styles.textField}
              placeholderTextColor={"rgba(40, 32, 72, 0.4)"}
              inputWrapperStyle={styles.inputStyleOverride}
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
            <View style={styles.buttonsView}>
              <TouchableOpacity style={{ width: 130 }} onPress={() => setWithTeam(true)}>
                <Text style={styles.joinExistedText}>{translate("loginScreen.joinExistTeam")}</Text>
              </TouchableOpacity>
              <Button
                style={$tapButton}
                textStyle={styles.tapButtonText}
                onPress={() => setScreenStatus({
                  screen: 2,
                  animation: true
                })}
              >
                <Text>{translate("loginScreen.tapContinue")}</Text>
              </Button>
            </View>
          </Animatable.View>
          // END STEP 1 : PROVIDE TEAM NAME
        )
          : screenstatus.screen === 2 ? (
            // STEP 2 : ENTER YOUR NAME AND EMAIL
            <Animatable.View animation={"bounceIn"} delay={1000} style={styles.form}>
              <Text style={styles.text}>{translate("loginScreen.step2Title")}</Text>
              <TextField
                placeholder={translate("loginScreen.userNameFieldPlaceholder")}
                containerStyle={styles.textField}
                placeholderTextColor={"rgba(40, 32, 72, 0.4)"}
                inputWrapperStyle={styles.inputStyleOverride}
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
                placeholder={translate("loginScreen.emailFieldPlaceholder")}
                containerStyle={[styles.textField, { marginTop: 20 }]}
                placeholderTextColor={"rgba(40, 32, 72, 0.4)"}
                inputWrapperStyle={styles.inputStyleOverride}
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
              <View style={[styles.buttonsView]}>
                <TouchableOpacity
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: 65 }}
                  onPress={() => setScreenStatus({
                    screen: 1,
                    animation: true
                  })}
                >
                  <Image source={require("../../assets/icons/back.png")} />
                  <Text style={[styles.backButtonText, { color: "#282048", fontSize: 14 }]}>{translate("common.back")}</Text>
                </TouchableOpacity>
                <Button
                  style={[$tapButton, { width: width / 2.1, opacity: isLoading ? 0.5 : 1 }]}
                  textStyle={styles.tapButtonText}
                  onPress={() => createNewTeam()}
                >
                  <Text>{translate("loginScreen.createTeam")}</Text>
                </Button>
                <ActivityIndicator style={[styles.loading,{marginRight:8}]} animating={isLoading} size={'small'} color={"#fff"} />
              </View>
            </Animatable.View>
            // END STEP 2 : ENTER YOUR NAME AND EMAIL 
          ) : screenstatus.screen === 3 ? (
            // START STEP 3 : EMAIL VERIFICATION
            <Animatable.View animation={"bounceIn"} delay={1000} style={styles.form}>
              <Text style={styles.text}>{translate("loginScreen.step3Title")}</Text>
              <View>
                <CodeInput
                  onChange={setAuthConfirmCode}
                  editable={!isLoading}
                />
                {verificationError ?
                  <Text style={styles.verifyError}>{verificationError}</Text> : null}
                <TouchableOpacity style={styles.resendWrapper}
                  onPress={() => resendEmailVerificationCode()}>
                  <Text
                    style={{ ...styles.resendText }}
                  >{translate("loginScreen.codeNotReceived")}-<Text style={{ color: colors.primary }}>{translate("loginScreen.sendCode")}</Text></Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.buttonsView]}>
                <TouchableOpacity
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: 65 }}
                  onPress={() => setScreenStatus({
                    screen: 2,
                    animation: true
                  })}
                >
                  <Image source={require("../../assets/icons/back.png")} />
                  <Text style={[styles.backButtonText]}>{translate("common.back")}</Text>
                </TouchableOpacity>
                <Button
                  style={[$tapButton, { width: width / 2.1, opacity: isLoading ? 0.5 : 1 }]}
                  textStyle={styles.tapButtonText}
                  onPress={() => verifyEmailByCode()}
                >
                  <Text>{translate("loginScreen.tapJoin")}</Text>
                </Button>
                <ActivityIndicator style={styles.loading} animating={isLoading} size={'small'} color={"#fff"} />
              </View>
            </Animatable.View>

            // END STEP 3 : EMAIL VERIFICATION
          ) : (
            // JOIN EXISTED TEAM STARTS HERE
            <Animatable.View animation={"bounceInUp"} style={styles.form}>
              <Text style={styles.text}>{translate("loginScreen.inviteStepLabel")}</Text>
              <TextField
                placeholder={translate("loginScreen.emailFieldPlaceholder")}
                containerStyle={styles.textField}
                placeholderTextColor={"rgba(40, 32, 72, 0.4)"}
                inputWrapperStyle={styles.inputStyleOverride}
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
              <View style={{}}>
                <Text style={styles.inputInviteTitle}>{translate("loginScreen.inviteCodeFieldLabel")}</Text>
                <CodeInput
                  onChange={setAuthInviteCode}
                  editable={!isLoading}
                />
                {joinError ?
                  <Text style={styles.verifyError}>{joinError}</Text>
                  : null}
                <TouchableOpacity
                  onPress={() => getAuthCode()}>
                  <Text style={styles.resendText}>{translate("loginScreen.codeNotReceived")} <Text style={{ color: colors.primary }}>{translate("loginScreen.sendCode")}</Text></Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.buttonsView]}>
                <TouchableOpacity
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: 65 }}
                  onPress={() => {
                    setWithTeam(false)
                    setScreenStatus({
                      screen: 1,
                      animation: true
                    })
                  }}
                >
                  <Image source={require("../../assets/icons/back.png")} />
                  <Text style={[styles.backButtonText]}>{translate("common.back")}</Text>
                </TouchableOpacity>
                <Button
                  style={[$tapButton, { width: width / 2.1, opacity: isLoading ? 0.5 : 1 }]}
                  textStyle={styles.tapButtonText}
                  onPress={() => joinTeam()}
                >
                  <Text>{translate("loginScreen.tapJoin")}</Text>
                </Button>
                <ActivityIndicator style={styles.loading} animating={isLoading} size={'small'} color={"#fff"} />
              </View>
            </Animatable.View>
          )}


        <View style={styles.bottomSection}>
          <Text style={styles.bottomSectionTxt}>© 2022-Present, Gauzy Teams by Ever Co. LTD. All rights reserved.</Text>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => toggleTheme()}>
            <Image style={styles.imageTheme} source={require("../../assets/icons/new/toogle-light.png")} />
          </TouchableOpacity>
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
  paddingTop: 15,
  flex: 1.4,
  justifyContent: "flex-start",
}

const $bottom: ViewStyle = {
  width,
  backgroundColor: "#fff",
  flex: 2
}

const $tapButton: ViewStyle = {
  marginTop: spacing.extraSmall,
  width: width / 3,
  borderRadius: 10,
  backgroundColor: "#3826A6",
}

const styles = EStyleSheet.create({
  form: {
    position: "absolute",
    display: "flex",
    flex: 1,
    width: "90%",
    top: "-32%",
    padding: "1.5rem",
    alignSelf: 'center',
    backgroundColor: "#fff",
    alignItems: "center",
    borderRadius: "1rem",
    justifyContent: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    elevation: 10,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 5,
    shadowRadius: 9,
    zIndex: 1000
  },
  text: {
    fontSize: "1.5rem",
    marginBottom: "2rem",
    color: "#1A1C1E",
    width: "100%",
    textAlign: "center",
    fontFamily: typography.primary.semiBold,
  },
  buttonsView: {
    width: "100%",
    display: "flex",
    marginTop: "2rem",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  imageTheme: {
    height: "3.1rem",
    marginBottom: "-1.5rem"
  },
  bottomSection: {
    position: "absolute",
    justifyContent: "space-between",
    alignItems: "center",
    width: width - 40,
    display: "flex",
    flexDirection: 'row',
    alignSelf: "center",
    bottom: 0,
    marginBottom: "2rem",
    paddingTop: "1rem",
    borderTopColor: "rgba(0, 0, 0, 0.16)",
    borderTopWidth: 1,
    zIndex: 100
  },
  inputStyleOverride: {
    height: "3.3rem",
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "#FFFFFF",
    paddingVertical: "0.43rem",
    paddingHorizontal: "0.6rem",
    borderRadius: "0.6rem"
  },
  textField: {
    width: "100%",
    borderRadius: "1.25rem",
  },
  buttonText: {
    fontSize: "2rem",
    fontFamily: typography.primary.semiBold,
    color: "#3826A6"
  },
  joinExistedText: {
    fontSize: "0.75rem",
    fontFamily: typography.primary.semiBold,
    color: "#3826A6"
  },
  backButtonText: {
    fontSize: "0.87rem",
    fontFamily: typography.primary.semiBold,
    color: "#3826A6"
  },
  tapButtonText: {
    color: "#fff",
    fontFamily: typography.primary.semiBold,
    fontSize: "1rem"
  },
  inputInviteTitle: {
    fontSize: "0.87rem",
    marginTop: "1.8rem",
    marginBottom: "1rem",
    fontFamily: typography.primary.medium,
    color: "#B1AEBC"
  },
  resendText: {
    fontSize: "0.87rem",
    color: "#B1AEBC",
    marginTop: "1rem",
    fontFamily: typography.primary.medium
  },
  bottomSectionTxt: {
    flex: 3,
    fontSize: "0.7rem",
    fontFamily: typography.primary.medium,
    color: "rgba(126, 121, 145, 0.7)"
  },
  loading: {
    position: "absolute",
    bottom: "20%",
    right: 140,
  },
  screenTitle: {
    marginTop: "2rem",
    fontSize: "1.5rem",
    textAlign: "center",
    width: "100%",
    color: "#fff",
    fontFamily: typography.primary.bold,
    fontWeight: "700",
  },
  smalltext: {
    marginTop: "1rem",
    fontSize: '0.7rem',
    width: "100%",
    textAlign: "center",
    color: "#fff",
    fontFamily: typography.secondary.normal,
    fontWeight: "400",
  },
  verifyError: {
    color: "red",
    margin: 10,
  }
})
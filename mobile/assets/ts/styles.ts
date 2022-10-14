/* eslint-disable react-native/no-color-literals */
import { StyleSheet, Dimensions, Platform } from "react-native"

export const isIOS = Platform.OS === "ios"
export const isAndroid = Platform.OS === "android"

export const CONSTANT_SIZE = {
  FONT_SIZE_SM: 11,
  FONT_SIZE: 14,
  FONT_SIZE_MD: 17,
  FONT_SIZE_LG: 20,
  FONT_SIZE_XLG: 23,
  NO_SPACE: 0,
  SPACE_SM: 8,
  SPACE: 16,
  SPACE_MD: 24,
  SPACE_LG: 32,
  SPACE_XLG: 40,
  BOTTOM_NAVBAR_HEIGHT: 80,
  STATUS_BAR_HEIGHT: 24,
  SCREEN_HEIGHT: Dimensions.get("screen").height,
  SCREEN_WIDTH: Dimensions.get("screen").width,
  WINDOW_HEIGHT: Dimensions.get("window").height,
  WINDOW_WIDTH: Dimensions.get("window").width,
  DRAWER_HEADER_HEIGHT: 56,
}

export const CONSTANT_COLOR = {
  muted: "#8f96a7",
  mutedLight: "#b3bbce",
  mutedHighLight: "#dce3f4",

  light: "#fcfdff",
  dark: "#0C2146",
  info: "#2979FF",
  success: "#43A047",
  danger: "#F44336",
  warning: "#FB8200",
  white: "#FFFFFF",
  input: "#edeef2",
  transparent: "transparent",
}

export const GLOBAL_STYLE = StyleSheet.create({
  alignBaseline: { alignItems: "baseline" },
  alignCenter: { alignItems: "center" },
  alignEnd: { alignItems: "flex-end" },
  alignStart: { alignItems: "flex-start" },
  alignStretch: { alignItems: "stretch" },
  appendTag: {},
  b0: {
    bottom: 0,
  },
  bgDanger: {
    backgroundColor: CONSTANT_COLOR.danger,
  },
  bgInfo: {
    backgroundColor: CONSTANT_COLOR.info,
  },
  bgLight: {
    backgroundColor: CONSTANT_COLOR.light,
  },
  bgSuccess: {
    backgroundColor: CONSTANT_COLOR.success,
  },
  bgTransparent: {
    backgroundColor: "transparent",
  },
  bgWarning: {
    backgroundColor: CONSTANT_COLOR.warning,
  },
  border: {
    borderColor: CONSTANT_COLOR.muted,
    borderWidth: 1,
  },
  borderLg: {
    borderColor: CONSTANT_COLOR.muted,
    borderWidth: 4,
  },
  borderMd: {
    borderColor: CONSTANT_COLOR.muted,
    borderWidth: 2,
  },
  borderSm: {
    borderColor: CONSTANT_COLOR.muted,
    borderWidth: 0.5,
  },
  btn: {
    alignItems: "center",
    borderColor: "rgba(0,0,0,0)",
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: "row",
    height: 45,
    justifyContent: "center",
    marginVertical: 5,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    position: "relative",
  },
  cardBtnClose: {
    position: "absolute",
    right: 10,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  column: {
    flexDirection: "column",
  },
  container: {
    marginHorizontal: 20,
    paddingHorizontal: 10,
  },
  dFex: {
    display: "flex",
  },
  dNone: {
    display: "none",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  errorMessage: {
    fontSize: 13,
    fontWeight: "400",
    textAlign: "center",
  },
  field: {
    marginBottom: 20,
  },
  flex1: {
    flex: 1,
  },
  flexWrap: {
    flexWrap: "wrap",
  },
  floatBtnBottomRight: {
    alignItems: "center",
    borderRadius: 40 / 2,
    bottom: 20,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    width: 40,
  },
  floatBtnTopLeft: {
    alignItems: "center",
    borderRadius: 40 / 2,
    height: 40,
    justifyContent: "center",
    left: 20,
    position: "absolute",
    top: 30,
    width: 40,
  },
  fontBold: {
    fontWeight: "bold",
  },
  fontItalic: {
    fontStyle: "italic",
  },
  form: {
    marginBottom: 32,
  },
  h100: {
    height: "100%",
  },
  h25: {
    height: "25%",
  },
  h50: {
    height: "50%",
  },
  h75: {
    height: "75%",
  },
  image: {
    flex: 1,
    height: undefined,
    resizeMode: "cover",
    width: undefined,
  },
  imgCover: {
    flex: 1,
    height: undefined,
    resizeMode: "cover",
    width: undefined,
  },
  inlineItems: {
    alignItems: "center",
    flexDirection: "row",
  },
  input: {
    borderBottomWidth: 1,
    color: CONSTANT_COLOR.muted,
    fontSize: 15,
    height: 40,
    paddingHorizontal: 10,
  },
  inputGroup: {
    alignItems: "stretch",
    flexDirection: "row",
  },
  inputPicker: {
    alignItems: "center",
    borderColor: CONSTANT_COLOR.input,
    borderRadius: 7,
    borderWidth: 1,
    color: CONSTANT_COLOR.muted,
    display: "flex",
    flexDirection: "row",
    height: 30,
    justifyContent: "space-between",
    paddingHorizontal: 5,
    width: "100%",
  },
  inputPickerIcon: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "15%",
  },
  inputPickerLabel: {
    color: CONSTANT_COLOR.muted,
    fontSize: 12,
    paddingRight: 0,
    width: "85%",
  },
  inputTitle: {
    color: CONSTANT_COLOR.muted,
    fontSize: 10,
    marginBottom: 0,
    textTransform: "uppercase",
  },
  justifyAround: { justifyContent: "space-around" },
  justifyBetween: { justifyContent: "space-between" },
  justifyCenter: { justifyContent: "center" },
  justifyContentBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  justifyEnd: { justifyContent: "flex-end" },
  justifyEvenly: { justifyContent: "space-evenly" },
  justifyStart: { justifyContent: "flex-start" },
  l0: {
    left: 0,
  },
  m0: {
    margin: 0,
  },
  m1: {
    margin: 5,
  },
  m2: {
    margin: 10,
  },
  m3: {
    margin: 15,
  },
  m4: {
    margin: 20,
  },
  m5: {
    margin: 25,
  },
  mb0: {
    marginBottom: 0,
  },
  mb1: {
    marginBottom: 5,
  },
  mb2: {
    marginBottom: 10,
  },
  mb3: {
    marginBottom: 15,
  },
  mb4: {
    marginBottom: 20,
  },
  mb5: {
    marginBottom: 25,
  },
  ml0: {
    marginLeft: 0,
  },
  ml1: {
    marginLeft: 5,
  },
  ml2: {
    marginLeft: 10,
  },
  ml3: {
    marginLeft: 15,
  },
  ml4: {
    marginLeft: 20,
  },
  ml5: {
    marginLeft: 25,
  },
  mr0: {
    marginRight: 0,
  },
  mr1: {
    marginRight: 5,
  },
  mr2: {
    marginRight: 10,
  },
  mr3: {
    marginRight: 15,
  },
  mr4: {
    marginRight: 20,
  },
  mr5: {
    marginRight: 25,
  },
  mt0: {
    marginTop: 0,
  },
  mt1: {
    marginTop: 5,
  },
  mt2: {
    marginTop: 10,
  },
  mt3: {
    marginTop: 15,
  },
  mt4: {
    marginTop: 20,
  },
  mt5: {
    marginTop: 25,
  },
  mx0: {
    marginHorizontal: 0,
  },
  mx1: {
    marginHorizontal: 5,
  },
  mx2: {
    marginHorizontal: 10,
  },
  mx3: {
    marginHorizontal: 15,
  },
  mx4: {
    marginHorizontal: 20,
  },
  mx5: {
    marginHorizontal: 25,
  },
  my0: {
    marginVertical: 0,
  },
  my1: {
    marginVertical: 5,
  },
  my2: {
    marginVertical: 10,
  },
  my3: {
    marginVertical: 15,
  },
  my4: {
    marginVertical: 20,
  },
  my5: {
    marginVertical: 25,
  },
  noBorder: {
    borderColor: "transparent",
    borderWidth: 0,
  },
  noShadow: {
    elevation: 0,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  opacity0: { opacity: 0 },
  opacity100: { opacity: 1 },
  opacity25: { opacity: 0.25 },
  opacity50: { opacity: 0.5 },
  opacity75: { opacity: 0.75 },
  overflowHidden: {
    overflow: "hidden",
  },
  overflowScroll: {
    overflow: "scroll",
  },
  overflowVisible: {
    overflow: "visible",
  },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    flex: 1,
    height: "100%",
    justifyContent: "center",
    position: "absolute",
    width: "100%",
  },
  p0: {
    padding: 0,
  },
  p1: {
    padding: 5,
  },
  p2: {
    padding: 10,
  },
  p3: {
    padding: 15,
  },
  p4: {
    padding: 20,
  },
  p5: {
    padding: 25,
  },
  pb0: {
    paddingBottom: 0,
  },
  pb1: {
    paddingBottom: 5,
  },
  pb2: {
    paddingBottom: 10,
  },
  pb3: {
    paddingBottom: 15,
  },
  pb4: {
    paddingBottom: 20,
  },
  pb5: {
    paddingBottom: 25,
  },
  pl0: {
    paddingLeft: 0,
  },
  pl1: {
    paddingLeft: 5,
  },
  pl2: {
    paddingLeft: 10,
  },
  pl3: {
    paddingLeft: 15,
  },
  pl4: {
    paddingLeft: 20,
  },
  pl5: {
    paddingLeft: 25,
  },
  positionAbsolute: {
    position: "absolute",
  },
  positionRelative: {
    position: "relative",
  },
  positionReset: {
    position: undefined,
  },
  pr0: {
    paddingRight: 0,
  },
  pr1: {
    paddingRight: 5,
  },
  pr2: {
    paddingRight: 10,
  },
  pr3: {
    paddingRight: 15,
  },
  pr4: {
    paddingRight: 20,
  },
  pr5: {
    paddingRight: 25,
  },
  pt0: {
    paddingTop: 0,
  },
  pt1: {
    paddingTop: 5,
  },
  pt2: {
    paddingTop: 10,
  },
  pt3: {
    paddingTop: 15,
  },
  pt4: {
    paddingTop: 20,
  },
  pt5: {
    paddingTop: 25,
  },
  px0: {
    paddingHorizontal: 0,
  },
  px1: {
    paddingHorizontal: 5,
  },
  px2: {
    paddingHorizontal: 10,
  },
  px3: {
    paddingHorizontal: 15,
  },
  px4: {
    paddingHorizontal: 20,
  },
  px5: {
    paddingHorizontal: 25,
  },
  py0: {
    paddingVertical: 0,
  },
  py1: {
    paddingVertical: 5,
  },
  py2: {
    paddingVertical: 10,
  },
  py3: {
    paddingVertical: 15,
  },
  py4: {
    paddingVertical: 20,
  },
  py5: {
    paddingVertical: 25,
  },
  r0: {
    right: 0,
  },
  rounded: {
    borderRadius: 10,
  },
  rounded0: {
    borderRadius: 0,
  },
  roundedFull: {
    borderRadius: 9999,
  },
  roundedLg: {
    borderRadius: 30,
  },
  roundedMd: {
    borderRadius: 20,
  },
  roundedSm: {
    borderRadius: 5,
  },
  row: {
    flexDirection: "row",
  },
  screen: {
    backgroundColor: CONSTANT_COLOR.white,
    flex: 1,
  },
  screenStatic: {
    height: CONSTANT_SIZE.SCREEN_HEIGHT,
  },
  screenStaticNav: {
    flex: 1,
    marginBottom: CONSTANT_SIZE.BOTTOM_NAVBAR_HEIGHT,
  },
  section: {
    backgroundColor: CONSTANT_COLOR.light,
    marginBottom: 10,
    padding: CONSTANT_SIZE.SPACE_SM,
  },
  selectContainer: {
    alignItems: "center",
    borderBottomWidth: 1,
    height: 35,
    paddingHorizontal: 0,
    width: 130,
  },
  selectItem: {
    color: CONSTANT_COLOR.muted,
    fontSize: 15,
    height: "100%",
    width: "100%",
  },
  separator: {
    borderTopColor: CONSTANT_COLOR.muted,
    borderTopWidth: 1,
    marginVertical: 10,
    padding: 0,
  },
  shadow: {
    elevation: 5,
    shadowColor: CONSTANT_COLOR.info,
    shadowOffset: { width: 1, height: 1.5 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  shadowLg: {
    elevation: 8.5,
    shadowColor: isIOS ? "#000" : CONSTANT_COLOR.info,
    shadowOffset: {
      width: isIOS ? 0 : 2,
      height: 2,
    },
    shadowOpacity: isIOS ? 0.25 : 0.7,

    shadowRadius: isIOS ? 3.84 : 5,
  },
  shadowSm: {
    elevation: 2,
    shadowColor: CONSTANT_COLOR.info,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  stat: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  statAmount: {
    color: CONSTANT_COLOR.muted,
    fontSize: 18,
    fontWeight: "bold",
  },
  statTitle: {
    color: CONSTANT_COLOR.muted,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    textTransform: "capitalize",
  },
  statsContainer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 30,
    marginVertical: 10,
  },
  t0: {
    top: 0,
  },
  tab: {
    alignItems: "center",
    borderBottomColor: CONSTANT_COLOR.light,
    borderBottomWidth: 3,
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 12,
  },
  tableBtn: {
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "center",
    marginHorizontal: 5,
    padding: 5,
    paddingHorizontal: 10,
  },
  tabsContainer: {
    alignItems: "stretch",
    backgroundColor: CONSTANT_COLOR.light,
    flexDirection: "row",
  },
  textarea: {
    borderColor: CONSTANT_COLOR.mutedLight,
    borderRadius: 5,
    borderWidth: 1,
    height: 100,
    overflow: "hidden",
  },
  th: {
    backgroundColor: CONSTANT_COLOR.light,
    height: 40,
  },
  titleSection: {
    fontWeight: "bold",
    marginBottom: CONSTANT_SIZE.SPACE_SM,
    textTransform: "uppercase",
  },
  txtAuto: {
    textAlign: "auto",
  },
  txtCapitalize: {
    textTransform: "capitalize",
  },
  txtCenter: {
    textAlign: "center",
  },
  txtDecorationNone: { textDecorationLine: "none" },
  txtJustify: {
    textAlign: "justify",
  },
  txtLarge: { fontSize: CONSTANT_SIZE.FONT_SIZE_LG },
  txtLeft: {
    textAlign: "left",
  },
  txtLineThrough: { textDecorationLine: "line-through" },
  txtLower: {
    textTransform: "lowercase",
  },
  txtMedium: { fontSize: CONSTANT_SIZE.FONT_SIZE_MD },
  txtRegular: { fontSize: CONSTANT_SIZE.FONT_SIZE },
  txtRight: {
    textAlign: "right",
  },
  txtSmall: { fontSize: CONSTANT_SIZE.FONT_SIZE_SM },
  txtUnderLineThrough: { textDecorationLine: "underline line-through" },
  txtUnderline: { textDecorationLine: "underline" },
  txtUpper: {
    textTransform: "uppercase",
  },
  txtXLarge: { fontSize: CONSTANT_SIZE.FONT_SIZE_XLG },
  w100: {
    width: "100%",
  },
  w25: {
    width: "25%",
  },
  w50: {
    width: "50%",
  },
  w75: {
    width: "75%",
  },
  zIndexBack: { zIndex: -1 },
  zIndexFront: { zIndex: 9999 },
})

import React, { useCallback, useEffect, useState } from "react"
import {
	View,
	Text,
	TouchableOpacity,
	TextInput,
	StyleSheet,
	ActivityIndicator,
	Image,
	FlatList,
	TouchableHighlight,
	Platform,
} from "react-native"
import { Feather, Ionicons, AntDesign } from "@expo/vector-icons"
import { translate } from "../../../../i18n"
import { IUser } from "../../../../services/interfaces/IUserData"
import { typography, useAppTheme } from "../../../../theme"
import * as MediaLibrary from "expo-media-library"
import * as ImagePicker from "expo-image-picker"
import { BlurView } from "expo-blur"
import axios from "axios"

interface IValidation {
	firstname: boolean
	lastName: boolean
}
const ChangeUserAvatar = ({
	onDismiss,
	user,
	onUpdateFullName,
	onExtend,
}: {
	onDismiss: () => unknown
	user?: IUser
	onUpdateFullName?: (userBody: IUser) => unknown
	onExtend: () => unknown
}) => {
	const { colors, dark } = useAppTheme()
	const [isExtended, setIsExtending] = useState(false)
	const [isFetching, setIsFetching] = useState(true)
	const [isLoading, setIsLoading] = useState(false)
	const [recentPictures, setRecentPictures] = useState<MediaLibrary.Asset[]>([])
	const [selectedImage, setSelectedImage] = useState<MediaLibrary.Asset>(null)
	const [permissionResponse, requestPermission] = MediaLibrary.usePermissions()

	const updateAvatar = useCallback(async () => {
		if (Platform.OS === "ios") {
			const info = await MediaLibrary.getAssetInfoAsync(selectedImage.id)
			const uri_local = info.localUri
			setSelectedImage({
				...selectedImage,
				uri: uri_local,
			})
			console.log("test image: ", info)
		}

		const formData = new FormData()
		// const uri = Platform.OS === 'android' ? selectedImage.uri : selectedImage.uri.replace('ph://', '');
		const type = selectedImage.mediaType
		const name = selectedImage.filename
		const image = {
			uri: selectedImage.uri,
			type,
			name,
		}
		const blob = new Blob([selectedImage.uri])
		formData.append("file", selectedImage.uri)
		formData.append("folder", "gauzy_team_user_profile")
		formData.append("context", `photo=${selectedImage.filename}`)
		formData.append("upload_preset", "ml_default")
		setIsLoading(true)
		console.log(formData)

		// axios
		//     .post('https://api.cloudinary.com/v1_1/dv6ezkfxg/upload', formData)
		//     .then(async (res: any) => {
		//         const imageUrl = res.data.secure_url;
		//         // await updateAvatar({ imageUrl, id: user.id });
		//         console.log("Upload response" + JSON.stringify(res))
		//         setIsLoading(false)
		//     })
		//     .catch((e) => {
		//         setIsLoading(false)
		//         console.log(e);
		//     });
	}, [selectedImage])

	const pickImageFromGalery = () => {
		// MediaLibrary.getAlbumsAsync()
		ImagePicker.launchImageLibraryAsync().then((t) => console.log(t))
	}

	useEffect(() => {
		if (!permissionResponse?.granted) {
			requestPermission()
			return
		}

		MediaLibrary.getAssetsAsync({
			mediaType: "photo",
			sortBy: "creationTime",
		}).then((t) => {
			setRecentPictures(t.assets)
			setIsFetching(false)
		})
	}, [permissionResponse, isExtended])

	useEffect(() => {
		setIsExtending(false)
		setSelectedImage(null)
	}, [onDismiss])
	const image = dark
		? require("../../../../../assets/images/new/image-dark.png")
		: require("../../../../../assets/images/new/image-light.png")
	return (
		<>
			{!isExtended ? (
				<View style={{ backgroundColor: dark ? "#1E2025" : "#F6F6F7", ...styles.avatarContainer1 }}>
					<TouchableOpacity
						onPress={() => {
							onExtend()
							setIsExtending(true)
						}}
						style={styles.wrapCirclePic}
					>
						<View style={[styles.circlePic, { backgroundColor: dark ? "#303540" : "#fff" }]}>
							<AntDesign name="clockcircleo" size={24} color={colors.primary} />
						</View>
						<Text style={styles.selectText}>
							{translate("settingScreen.changeAvatar.recentPictures")}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.wrapCirclePic} onPress={() => pickImageFromGalery()}>
						<View style={[styles.circlePic, { backgroundColor: dark ? "#303540" : "#fff" }]}>
							<Image source={image} />
						</View>
						<Text style={styles.selectText}>
							{translate("settingScreen.changeAvatar.selectFromGalery")}
						</Text>
					</TouchableOpacity>
					<View style={styles.wrapCirclePic}>
						<View style={[styles.circlePic, { backgroundColor: dark ? "#303540" : "#fff" }]}>
							<Ionicons name="md-document-outline" size={24} color={colors.primary} />
						</View>
						<Text style={styles.selectText}>
							{translate("settingScreen.changeAvatar.selectFromFiles")}
						</Text>
					</View>
				</View>
			) : (
				<View
					style={{
						height: 611,
						backgroundColor: dark ? "#1E2025" : "#fff",
						padding: 20,
					}}
				>
					<View style={{ flex: 5, justifyContent: "center", alignItems: "center" }}>
						{isFetching ? (
							<ActivityIndicator size={"large"} color={colors.primary} />
						) : (
							<View style={{ flex: 1 }}>
								<Text
									style={{
										marginBottom: 16,
										fontSize: 24,
										fontFamily: typography.primary.semiBold,
										color: colors.primary,
									}}
								>
									{translate("settingScreen.changeAvatar.recentFiles")}
								</Text>
								<FlatList
									data={recentPictures.slice(0, 4)}
									bounces={false}
									numColumns={2}
									showsVerticalScrollIndicator={false}
									keyExtractor={(item, index) => item.id}
									columnWrapperStyle={{ justifyContent: "space-between" }}
									renderItem={({ item, index }) => (
										<TouchableHighlight
											style={{ width: "48%", marginBottom: 14 }}
											onPress={() => setSelectedImage(item)}
										>
											<>
												{selectedImage?.id === item.id ? (
													<BlurView
														intensity={15}
														tint="dark"
														style={{
															position: "absolute",
															width: "100%",
															height: "100%",
															zIndex: 1000,
														}}
													/>
												) : null}
												<Image source={{ uri: item.uri }} style={styles.image} />
												{selectedImage?.id === item.id && (
													<Ionicons
														style={{
															position: "absolute",
															alignSelf: "center",
															marginTop: 50,
															zIndex: 1001,
														}}
														name="checkmark-sharp"
														size={84}
														color="#fff"
													/>
												)}
											</>
										</TouchableHighlight>
									)}
								/>
							</View>
						)}
					</View>

					<View style={styles.wrapButtons}>
						<TouchableOpacity
							style={styles.cancelBtn}
							onPress={() => {
								setIsExtending(false)
								onDismiss()
							}}
						>
							<Text style={styles.cancelTxt}>{translate("common.cancel")}</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={{
								...styles.createBtn,
								backgroundColor: dark ? "#6755C9" : "#3826A6",
							}}
							onPress={() => updateAvatar()}
						>
							{isLoading ? (
								<ActivityIndicator
									style={{ position: "absolute", left: 10 }}
									size={"small"}
									color={"#fff"}
								/>
							) : null}
							<Text style={styles.createTxt}>
								{translate("settingScreen.changeAvatar.continueButton")}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}
		</>
	)
}

const styles = StyleSheet.create({
	avatarContainer1: {
		flexDirection: "row",
		height: 174,
		justifyContent: "space-between",
		padding: 25,
	},
	cancelBtn: {
		alignItems: "center",
		backgroundColor: "#E6E6E9",
		borderRadius: 12,
		height: 57,
		justifyContent: "center",
		width: "48%",
	},
	cancelTxt: {
		color: "#1A1C1E",
		fontFamily: typography.primary.semiBold,
		fontSize: 18,
	},
	circlePic: {
		alignItems: "center",
		backgroundColor: "#fff",
		borderColor: "rgba(255,255,255,0.04)",
		borderRadius: 100,
		borderWidth: 2,
		elevation: 2,
		height: 70,
		justifyContent: "center",
		shadowColor: "rgba(0,0,0,0.13)",
		shadowOffset: { width: 1, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 12,
		width: 70,
	},
	createBtn: {
		alignItems: "center",
		backgroundColor: "#3826A6",
		borderRadius: 12,
		flexDirection: "row",
		height: 57,
		justifyContent: "center",
		width: "48%",
	},
	createTxt: {
		color: "#FFF",
		fontFamily: typography.primary.semiBold,
		fontSize: 18,
	},
	formTitle: {
		color: "#1A1C1E",
		fontFamily: typography.primary.semiBold,
		fontSize: 24,
	},
	image: {
		flex: 0.2,
		height: 188,
	},
	selectText: {
		color: "#B1AEBC",
		fontFamily: typography.primary.medium,
		fontSize: 12,
		marginTop: 16,
		textAlign: "center",
	},
	styleInput: {
		alignItems: "center",
		borderColor: "#DCE4E8",
		borderRadius: 12,
		borderWidth: 1,
		fontFamily: typography.primary.medium,
		fontSize: 16,
		height: 57,
		marginTop: 16,
		paddingHorizontal: 18,
		width: "100%",
	},
	wrapButtons: {
		flexDirection: "row",
		flex: 1,
		justifyContent: "space-between",
		marginTop: 40,
		width: "100%",
	},
	wrapCirclePic: {
		alignItems: "center",
		width: "25%",
	},
})

export default ChangeUserAvatar

/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { useCallback, useEffect, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	Image,
	FlatList,
	TouchableHighlight,
	Platform
} from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { translate } from '../../../../i18n';
import { typography, useAppTheme } from '../../../../theme';
import * as MediaLibrary from 'expo-media-library';
import { launchImageLibraryAsync, MediaTypeOptions } from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { useImageAssets } from '../../../../services/hooks/features/useImageAssets';
import { IImageAssets } from '../../../../services/interfaces/IImageAssets';
import mime from 'mime';
import { useOrganizationTeam } from '../../../../services/hooks/useOrganization';
import { useStores } from '../../../../models';
import { observer } from 'mobx-react-lite';
import LoadingModal from '../../../../components/LoadingModal';
import { SvgXml } from 'react-native-svg';
import { galleryDarkIcon, galleryLightIcon } from '../../../../components/svgs/icons';

const ChangeTeamLogo = observer(({ onDismiss, onExtend }: { onDismiss: () => unknown; onExtend: () => unknown }) => {
	const { colors, dark } = useAppTheme();
	const { createImageAssets, loading } = useImageAssets();
	const { onUpdateOrganizationTeam } = useOrganizationTeam();
	const {
		teamStore: { activeTeam, activeTeamId }
	} = useStores();
	const [isExtended, setIsExtending] = useState(false);
	const [isFetching, setIsFetching] = useState(true);
	const [recentPictures, setRecentPictures] = useState<MediaLibrary.Asset[]>([]);
	const [selectedImage, setSelectedImage] = useState<MediaLibrary.Asset>(null);
	const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

	// Pick from recent pictures
	const updateTeamAvatar = useCallback(async () => {
		const info = await MediaLibrary.getAssetInfoAsync(selectedImage.id);
		let uri = null;
		Platform.OS === 'ios' ? (uri = info.localUri) : (uri = info.uri);
		uploadAvatar(uri);
	}, [selectedImage]);

	// Pick image from Gallery
	const pickImageFromGalery = async () => {
		const result = await launchImageLibraryAsync({
			mediaTypes: MediaTypeOptions.All,
			allowsEditing: true,
			quality: 1
		});

		if (result.canceled) {
			onDismiss();
			return;
		}
		uploadAvatar(result.assets[0].uri);
	};

	const uploadAvatar = useCallback((imageUri: string) => {
		// @ts-ignore
		const type = mime.getType(imageUri);
		const name = imageUri.split('/').pop();
		const image = {
			uri: imageUri,
			type,
			name
		};

		createImageAssets(image, 'organization_teams_avatars')
			.then((d: IImageAssets) => {
				if (d?.id) {
					onUpdateOrganizationTeam({
						id: activeTeamId,
						data: {
							...activeTeam,
							imageId: d.id,
							image: d
						}
					});
				}
			})
			.finally(() => onDismiss());
	}, []);

	const checkPermission = () => {
		if (!permissionResponse?.granted) {
			requestPermission();
		}
	};

	useEffect(() => {
		checkPermission();
		MediaLibrary.getAssetsAsync({
			mediaType: 'photo',
			sortBy: 'creationTime'
		}).then((t) => {
			setRecentPictures(t.assets);
			setIsFetching(false);
		});
	}, [permissionResponse, isExtended]);

	useEffect(() => {
		setIsExtending(false);
		setSelectedImage(null);
	}, [onDismiss]);

	const galleryImage = dark ? <SvgXml xml={galleryDarkIcon} /> : <SvgXml xml={galleryLightIcon} />;

	return (
		<>
			<LoadingModal loading={loading} />
			{!isExtended ? (
				<View style={{ backgroundColor: dark ? '#1E2025' : '#F6F6F7', ...styles.avatarContainer1 }}>
					<TouchableOpacity
						onPress={() => {
							onExtend();
							setIsExtending(true);
						}}
						style={styles.wrapCirclePic}
					>
						<View style={[styles.circlePic, { backgroundColor: dark ? '#303540' : '#fff' }]}>
							<AntDesign name="clockcircleo" size={24} color={colors.primary} />
						</View>
						<Text style={styles.selectText}>{translate('settingScreen.changeAvatar.recentPictures')}</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.wrapCirclePic} onPress={() => pickImageFromGalery()}>
						<View style={[styles.circlePic, { backgroundColor: dark ? '#303540' : '#fff' }]}>
							{galleryImage}
						</View>
						<Text style={styles.selectText}>
							{translate('settingScreen.changeAvatar.selectFromGalery')}
						</Text>
					</TouchableOpacity>
					<View style={styles.wrapCirclePic}>
						<View style={[styles.circlePic, { backgroundColor: dark ? '#303540' : '#fff' }]}>
							<Ionicons name="document-outline" size={24} color={colors.primary} />
						</View>
						<Text style={styles.selectText}>{translate('settingScreen.changeAvatar.selectFromFiles')}</Text>
					</View>
				</View>
			) : (
				<View
					style={{
						height: 611,
						backgroundColor: dark ? '#1E2025' : '#fff',
						padding: 20
					}}
				>
					<View style={{ flex: 5, justifyContent: 'center', alignItems: 'center' }}>
						{isFetching ? (
							<ActivityIndicator size={'large'} color={colors.primary} />
						) : (
							<View style={{ flex: 1 }}>
								<Text
									style={{
										marginBottom: 16,
										fontSize: 24,
										fontFamily: typography.primary.semiBold,
										color: colors.primary
									}}
								>
									{translate('settingScreen.changeAvatar.recentFiles')}
								</Text>
								<FlatList
									data={recentPictures.slice(0, 4)}
									bounces={false}
									numColumns={2}
									showsVerticalScrollIndicator={false}
									keyExtractor={(item) => item.id}
									columnWrapperStyle={{ justifyContent: 'space-between' }}
									renderItem={({ item }) => (
										<TouchableHighlight
											style={{ width: '48%', marginBottom: 14 }}
											onPress={() => setSelectedImage(item)}
										>
											<>
												{selectedImage?.id === item.id ? (
													<BlurView
														intensity={15}
														tint="dark"
														style={{
															position: 'absolute',
															width: '100%',
															height: '100%',
															zIndex: 1000
														}}
													/>
												) : null}
												<Image source={{ uri: item.uri }} style={styles.image} />
												{selectedImage?.id === item.id && (
													<Ionicons
														style={{
															position: 'absolute',
															alignSelf: 'center',
															marginTop: 50,
															zIndex: 1001
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
								setIsExtending(false);
								onDismiss();
							}}
						>
							<Text style={styles.cancelTxt}>{translate('common.cancel')}</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={{
								...styles.createBtn,
								backgroundColor: dark ? '#6755C9' : '#3826A6',
								opacity: loading ? 0.4 : 1
							}}
							onPress={() => (loading ? {} : updateTeamAvatar())}
						>
							{loading ? (
								<ActivityIndicator
									style={{ position: 'absolute', left: 10 }}
									size={'small'}
									color={'#fff'}
								/>
							) : null}
							<Text style={styles.createTxt}>
								{translate('settingScreen.changeAvatar.continueButton')}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}
		</>
	);
});

const styles = StyleSheet.create({
	avatarContainer1: {
		flexDirection: 'row',
		height: 174,
		justifyContent: 'space-between',
		padding: 25
	},
	cancelBtn: {
		alignItems: 'center',
		backgroundColor: '#E6E6E9',
		borderRadius: 12,
		height: 57,
		justifyContent: 'center',
		width: '48%'
	},
	cancelTxt: {
		color: '#1A1C1E',
		fontFamily: typography.primary.semiBold,
		fontSize: 18
	},
	circlePic: {
		alignItems: 'center',
		backgroundColor: '#fff',
		borderColor: 'rgba(255,255,255,0.04)',
		borderRadius: 100,
		borderWidth: 2,
		elevation: 2,
		height: 70,
		justifyContent: 'center',
		shadowColor: 'rgba(0,0,0,0.13)',
		shadowOffset: { width: 1, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 12,
		width: 70
	},
	createBtn: {
		alignItems: 'center',
		backgroundColor: '#3826A6',
		borderRadius: 12,
		flexDirection: 'row',
		height: 57,
		justifyContent: 'center',
		width: '48%'
	},
	createTxt: {
		color: '#FFF',
		fontFamily: typography.primary.semiBold,
		fontSize: 18
	},
	image: {
		flex: 0.2,
		height: 188
	},
	selectText: {
		color: '#B1AEBC',
		fontFamily: typography.primary.medium,
		fontSize: 12,
		marginTop: 16,
		textAlign: 'center'
	},
	wrapButtons: {
		flexDirection: 'row',
		flex: 1,
		justifyContent: 'space-between',
		marginTop: 40,
		width: '100%'
	},
	wrapCirclePic: {
		alignItems: 'center',
		width: '25%'
	}
});

export default ChangeTeamLogo;

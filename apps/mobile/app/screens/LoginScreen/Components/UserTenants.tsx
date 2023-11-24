/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-unused-styles */
import React, { FC, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList } from 'react-native';
import { IWorkspace } from '../../../services/interfaces/IAuthentication';
import { SvgXml } from 'react-native-svg';
import { grayCircleIcon, greenCircleTickIcon } from '../../../components/svgs/icons';
import { useAppTheme } from '../../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultUserInfoType } from './PassCode';

interface IValid {
	step1: boolean;
	step2: boolean;
	step3: boolean;
}
interface IUserTenants {
	data: IWorkspace;
	index: number;
	activeTeamId: string;
	setActiveTeamId: (teamId: string) => void;
	selectedWorkspace: number;
	setSelectedWorkspace: React.Dispatch<React.SetStateAction<number>>;
	isValid: IValid;
	setIsValid: React.Dispatch<React.SetStateAction<IValid>>;
	setTempAuthToken: (token: string) => void;
	setDefaultUserInfo: React.Dispatch<React.SetStateAction<defaultUserInfoType>>;
}

const UserTenants: FC<IUserTenants> = ({
	data,
	index,
	activeTeamId,
	setActiveTeamId,
	setSelectedWorkspace,
	selectedWorkspace,
	isValid,
	setIsValid,
	setTempAuthToken,
	setDefaultUserInfo
}) => {
	const { colors } = useAppTheme();

	const [autoSetWorkspace, setAutoSetWorkspace] = useState<boolean>(true);

	useEffect(() => {
		const getDefaultTeamId = async () => {
			try {
				setAutoSetWorkspace(true);
				const defaultTeamId = await AsyncStorage.getItem('defaultTeamId');
				const defaultUserInfoString = await AsyncStorage.getItem('defaultUserInfo');
				const defaultUserInfoObj: defaultUserInfoType = JSON.parse(defaultUserInfoString);

				if (
					defaultTeamId &&
					data?.user?.id === defaultUserInfoObj?.defaultUserId &&
					data?.user?.tenant?.id === defaultUserInfoObj?.defaultUserTenantId
				) {
					setActiveTeamId(defaultTeamId);
				} else {
					index === 0 && setActiveTeamId(data?.current_teams[0]?.team_id);
				}

				setIsValid({ ...isValid, step3: true });

				setTempAuthToken(data?.token);
			} catch (error) {
				console.error(error);
			}
		};

		getDefaultTeamId();
	}, [data.current_teams]);

	useEffect(() => {
		if (autoSetWorkspace) {
			const selectedIndex = data.current_teams.findIndex((team) => team.team_id === activeTeamId);
			if (selectedIndex !== -1) {
				setSelectedWorkspace(index);
			}
		}
	}, [activeTeamId]);

	return (
		<View style={{ ...styles.tenantContainer, backgroundColor: colors.background, borderColor: colors.border }}>
			<View style={styles.tenantNameContainer}>
				<Text style={{ fontSize: 17, color: colors.primary }}>{data.user.tenant.name}</Text>
				<View
					onTouchStart={() => {
						autoSetWorkspace && setAutoSetWorkspace(false);
						setDefaultUserInfo({
							defaultUserId: data?.user?.id,
							defaultUserTenantId: data?.user?.tenant?.id
						});
						setSelectedWorkspace(index);
						selectedWorkspace !== index && setActiveTeamId(data?.current_teams[0].team_id);
						data?.current_teams.filter((team) => team.team_id === activeTeamId) &&
							setIsValid({ ...isValid, step3: true });
						setTempAuthToken(data?.token);
					}}
				>
					{selectedWorkspace === index ? (
						<SvgXml xml={greenCircleTickIcon} />
					) : (
						<SvgXml xml={grayCircleIcon} />
					)}
				</View>
			</View>
			<View style={{ backgroundColor: '#E5E5E5', height: 1, width: '100%' }} />
			<View style={{ paddingHorizontal: 10, width: '95%', gap: 5 }}>
				<FlatList
					data={data.current_teams}
					renderItem={({ item }) => (
						<View style={styles.teamsContainer}>
							<View style={styles.teamInfoContainer}>
								<Image
									source={{ uri: item.team_logo }}
									style={{ width: 25, height: 25, borderRadius: 100 }}
								/>
								<Text style={{ fontSize: 18, color: colors.primary }}>
									{item.team_name}({item.team_member_count})
								</Text>
							</View>
							<View
								onTouchStart={() => {
									autoSetWorkspace && setAutoSetWorkspace(false);
									setDefaultUserInfo({
										defaultUserId: data?.user?.id,
										defaultUserTenantId: data?.user?.tenant?.id
									});
									setActiveTeamId(item.team_id);
									setSelectedWorkspace(index);
									setIsValid({ ...isValid, step3: true });
									setTempAuthToken(data?.token);
								}}
							>
								{activeTeamId === item.team_id ? (
									<SvgXml xml={greenCircleTickIcon} />
								) : (
									<SvgXml xml={grayCircleIcon} />
								)}
							</View>
						</View>
					)}
					keyExtractor={(item, index) => index.toString()}
				/>
			</View>
		</View>
	);
};

export default UserTenants;

const styles = StyleSheet.create({
	teamInfoContainer: {
		alignItems: 'center',
		display: 'flex',
		flexDirection: 'row',
		gap: 10,
		justifyContent: 'space-between'
	},
	teamsContainer: {
		alignItems: 'center',
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginVertical: 5,
		paddingBottom: 10,
		paddingTop: 17
	},
	tenantContainer: {
		backgroundColor: '#FCFCFC',
		borderColor: '#0000001A',
		borderRadius: 12,
		borderWidth: 1,
		marginVertical: 8,
		padding: 12,
		width: '100%'
	},
	tenantNameContainer: {
		alignItems: 'center',
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 22,
		marginTop: 10
	}
});

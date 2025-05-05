import React from 'react';
import { StyleSheet } from 'react-native';
import { View } from 'react-native-animatable';
import { Card } from 'react-native-paper';
import { Skeleton } from 'react-native-skeletons';
import { useAppTheme } from '../../../../theme';

const TimerScreenSkeleton = ({ showTaskDropdown }: { showTaskDropdown: boolean }) => {
	const { colors, dark } = useAppTheme();
	return (
		<View style={[styles.container, { backgroundColor: colors.background2 }]}>
			<View
				style={[
					styles.header,
					{
						backgroundColor: colors.background,
						shadowColor: !dark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
					}
				]}
			>
				<Skeleton width={110} height={22} borderRadius={50} />
				<Skeleton width={52} height={22} borderRadius={50} />
			</View>

			<View style={[styles.teamSection, { backgroundColor: colors.background }]}>
				<Skeleton height={44} borderRadius={9} />
			</View>

			<Card style={[styles.timerCard, { backgroundColor: colors.background }]}>
				<View style={[styles.inputStyle, { borderColor: colors.border }]} />
				{showTaskDropdown ? (
					<>
						<View style={{ marginTop: 16 }}>
							<Skeleton height={33} borderRadius={9} />
						</View>

						<View
							style={{
								width: '75%',
								flexDirection: 'row',
								justifyContent: 'space-between',
								marginTop: 16
							}}
						>
							<Skeleton height={26} width={110} borderRadius={38} />
							<Skeleton height={26} width={110} borderRadius={38} />
						</View>

						<View
							style={{
								marginTop: 16,
								flexDirection: 'row',
								justifyContent: 'space-between',
								paddingVertical: 16,
								borderTopColor: colors.border,
								borderTopWidth: 1,
								alignItems: 'center'
							}}
						>
							<Skeleton height={9} width={101} borderRadius={50} />
							<Skeleton height={33} width={113} borderRadius={10} />

							<View style={{ flexDirection: 'row', alignItems: 'center' }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 5 }}>
									<Skeleton
										height={28}
										width={28}
										borderRadius={14}
										style={{
											position: 'absolute',
											right: 12,
											borderColor: colors.background,
											borderWidth: 2,
											zIndex: 1000
										}}
									/>
									<Skeleton
										height={28}
										width={28}
										borderRadius={14}
										style={{ borderColor: colors.background, borderWidth: 2 }}
									/>
								</View>
								<Skeleton height={9} width={11} borderRadius={50} />
							</View>
						</View>

						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								paddingVertical: 16,
								borderTopColor: colors.border,
								borderTopWidth: 1,
								alignItems: 'center'
							}}
						>
							<Skeleton height={9} width={101} borderRadius={50} />
							<Skeleton height={33} width={113} borderRadius={10} />

							<View style={{ flexDirection: 'row', alignItems: 'center' }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 5 }}>
									<Skeleton
										height={28}
										width={28}
										borderRadius={14}
										style={{
											position: 'absolute',
											right: 12,
											borderColor: colors.background,
											borderWidth: 2,
											zIndex: 1000
										}}
									/>
									<Skeleton
										height={28}
										width={28}
										borderRadius={14}
										style={{ borderColor: colors.background, borderWidth: 2 }}
									/>
								</View>
								<Skeleton height={9} width={11} borderRadius={50} />
							</View>
						</View>

						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								paddingVertical: 16,
								borderTopColor: colors.border,
								borderTopWidth: 1,
								alignItems: 'center'
							}}
						>
							<Skeleton height={9} width={101} borderRadius={50} />
							<Skeleton height={33} width={113} borderRadius={10} />

							<View style={{ flexDirection: 'row', alignItems: 'center' }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 5 }}>
									<Skeleton
										height={28}
										width={28}
										borderRadius={14}
										style={{
											position: 'absolute',
											right: 12,
											borderColor: colors.background,
											borderWidth: 2,
											zIndex: 1000
										}}
									/>
									<Skeleton
										height={28}
										width={28}
										borderRadius={14}
										style={{ borderColor: colors.background, borderWidth: 2 }}
									/>
								</View>
								<Skeleton height={9} width={11} borderRadius={50} />
							</View>
						</View>

						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								paddingVertical: 16,
								borderTopColor: colors.border,
								borderTopWidth: 1,
								alignItems: 'center'
							}}
						>
							<Skeleton height={9} width={101} borderRadius={50} />
							<Skeleton height={33} width={113} borderRadius={10} />

							<View style={{ flexDirection: 'row', alignItems: 'center' }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 5 }}>
									<Skeleton
										height={28}
										width={28}
										borderRadius={14}
										style={{
											position: 'absolute',
											right: 12,
											borderColor: colors.background,
											borderWidth: 2,
											zIndex: 1000
										}}
									/>
									<Skeleton
										height={28}
										width={28}
										borderRadius={14}
										style={{ borderColor: colors.background, borderWidth: 2 }}
									/>
								</View>
								<Skeleton height={9} width={11} borderRadius={50} />
							</View>
						</View>
					</>
				) : (
					<>
						<View style={styles.firstRow}>
							<View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '47%' }}>
								<Skeleton width={48} height={9} />
								<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
									<Skeleton width={37} height={9} />
									<Skeleton width={37} height={9} />
								</View>
							</View>
							<Skeleton width={136.5} height={32} borderRadius={10} />
						</View>
						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								width: '100%',
								marginTop: 24
							}}
						>
							<Skeleton width={136.5} height={32} borderRadius={10} />
							<Skeleton width={136.5} height={32} borderRadius={10} />
						</View>
						<View
							style={{
								width: '100%',
								marginTop: 24,
								paddingBottom: 24,
								borderBottomColor: colors.border,
								borderBottomWidth: 1
							}}
						>
							<Skeleton height={32} borderRadius={10} />
						</View>

						<View
							style={{
								width: '100%',
								marginTop: 33,
								flexDirection: 'row',
								justifyContent: 'space-between',
								alignItems: 'center'
							}}
						>
							<View style={{ width: '60%' }}>
								<View
									style={{
										flexDirection: 'row',
										marginBottom: 16,
										justifyContent: 'space-between'
									}}
								>
									<Skeleton height={19} width={48} borderRadius={50} />
									<Skeleton height={19} width={48} borderRadius={50} />
									<Skeleton height={19} width={48} borderRadius={50} />
									<Skeleton height={19} width={15} borderRadius={50} />
								</View>
								<Skeleton height={6} />
							</View>
							<View style={[styles.wrapTimerBtn, { borderLeftColor: colors.border }]}>
								<Skeleton width={48} height={48} borderRadius={24} />
							</View>
						</View>
					</>
				)}
			</Card>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	firstRow: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 24
	},
	header: {
		elevation: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 17,
		paddingVertical: 16,
		shadowColor: 'rgba(0,0,0,0.1)',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 1,
		width: '100%',
		zIndex: 100
	},
	inputStyle: {
		borderColor: 'rgba(0, 0, 0, 0.1)',
		borderRadius: 10,
		borderWidth: 1,
		height: 45,
		width: '100%'
	},
	teamSection: {
		paddingBottom: 33,
		paddingHorizontal: 17,
		paddingTop: 27,
		width: '100%',
		zIndex: 99
	},
	timerCard: {
		borderRadius: 16,
		marginHorizontal: 25,
		marginTop: 24,
		padding: 16
	},
	wrapTimerBtn: {
		alignItems: 'center',
		borderLeftColor: 'rgba(0,0,0,0.1)',
		borderLeftWidth: 2,
		justifyContent: 'center',
		width: '35%'
	}
});
export default TimerScreenSkeleton;

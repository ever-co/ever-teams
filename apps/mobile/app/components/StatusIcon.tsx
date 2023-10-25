/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { typography } from '../theme';
import { observer } from 'mobx-react-lite';
import { useTaskStatus } from '../services/hooks/features/useTaskStatus';
import { limitTextCharaters } from '../helpers/sub-text';

export const BadgedTaskStatus = observer(
	({ status, TextSize, iconSize }: { status: string; TextSize: number; iconSize: number }) => {
		const { allStatuses } = useTaskStatus();
		const currentStatus = useMemo(() => allStatuses.find((s) => s.name === status), [status, allStatuses]);

		return (
			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center'
				}}
			>
				<SvgUri width={iconSize} height={iconSize} uri={currentStatus?.fullIconUrl} />
				<Text
					style={{
						color: '#292D32',
						left: 5,
						fontSize: TextSize,
						fontFamily: typography.fonts.PlusJakartaSans.semiBold
					}}
				>
					{limitTextCharaters({ text: currentStatus?.name, numChars: 12 })}
				</Text>
			</View>
		);
	}
);

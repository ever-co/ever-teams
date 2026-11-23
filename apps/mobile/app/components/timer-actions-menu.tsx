import React, { FC, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Menu } from 'react-native-paper';
import { MoreHorizontal } from '../../src/components/icons';
import { observer } from 'mobx-react-lite';
import { translate } from '../i18n';
import { typography, useAppTheme } from '../theme';
import { useTimerDiscard } from '../services/hooks/use-timer-discard';
import ConfirmationModal from './confirmation-modal';

const DISCARD_COLOR = '#DA5E5E';

interface ITimerActionsMenuProps {
	/** Opens the panel of the running time. */
	onChangeStart: () => void;
}

/**
 * The small menu of the running timer (ever-co/ever-teams#5373): "Change the start", and "Discard this run" where the
 * organization allows it for this run. A discard is confirmed first; a run started on another kind of device is named,
 * since it stops there too.
 */
const TimerActionsMenu: FC<ITimerActionsMenuProps> = observer(({ onChangeStart }) => {
	const { colors } = useAppTheme();
	const { availability, discard, discarding, sourceKey, runningLogId } = useTimerDiscard();
	const [menuOpen, setMenuOpen] = useState(false);
	const [confirming, setConfirming] = useState(false);
	// The run the confirmation is opened for: a run started meanwhile on another device is never the one discarded
	const confirmedRunId = useRef<string | undefined>(undefined);

	const description = sourceKey
		? translate('timer.discard.descriptionElsewhere', { source: translate(sourceKey) })
		: translate('timer.discard.description');

	const openMenu = () => setMenuOpen(true);
	const closeMenu = () => setMenuOpen(false);

	const changeStart = () => {
		closeMenu();
		onChangeStart();
	};

	const askToDiscard = () => {
		closeMenu();
		confirmedRunId.current = runningLogId;
		setConfirming(true);
	};

	return (
		<>
			<Menu
				visible={menuOpen}
				onDismiss={closeMenu}
				contentStyle={{ backgroundColor: colors.background }}
				anchor={
					<TouchableOpacity
						testID="timer-actions-trigger"
						style={styles.trigger}
						onPress={openMenu}
						disabled={discarding}
						hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
						accessibilityRole="button"
						accessibilityLabel={translate('timer.discard.menu')}
						accessibilityState={{ busy: discarding, expanded: menuOpen }}
					>
						{discarding ? (
							<ActivityIndicator size="small" color={colors.primary} />
						) : (
							<MoreHorizontal size={20} color={colors.primary} />
						)}
					</TouchableOpacity>
				}
			>
				<Menu.Item
					testID="timer-change-start"
					title={translate('timer.discard.changeStart')}
					titleStyle={[styles.item, { color: colors.primary }]}
					onPress={changeStart}
				/>
				{availability.available ? (
					<Menu.Item
						testID="timer-discard"
						title={translate('timer.discard.action')}
						titleStyle={[styles.item, { color: DISCARD_COLOR }]}
						onPress={askToDiscard}
					/>
				) : null}
			</Menu>
			<ConfirmationModal
				visible={confirming}
				onDismiss={() => setConfirming(false)}
				onConfirm={() => {
					void discard(confirmedRunId.current);
				}}
				confirmationText={translate('timer.discard.title')}
				description={description}
				confirmLabel={translate('timer.discard.confirm')}
			/>
		</>
	);
});

const styles = StyleSheet.create({
	item: {
		fontFamily: typography.primary.semiBold,
		fontSize: 14
	},
	trigger: {
		alignItems: 'center',
		height: 24,
		justifyContent: 'center',
		width: 32
	}
});

export default TimerActionsMenu;

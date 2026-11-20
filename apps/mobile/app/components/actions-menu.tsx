import React, { Fragment, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { IconComponent } from '../../src/components/icons';
import type { MenuRect } from '../../src/components/menu-placement';
import { MENU_ICON_SIZE, MENU_LIST_PADDING, raisedSurfaceOf } from '../../src/theme/menu-look';
import type { Theme } from '../../src/theme/use-theme';
import { typography, useWebTheme } from '../theme';
import { MenuLayer, PropertyMenuAction, placementOnArea, useMenuArea } from './property-menu';
import type { MenuActionTone } from './property-menu';

/** The web's row menu (a DropdownMenuContent of w-52): 208 wide, its end on its button's, 4 below it. */
export const ACTIONS_MENU_WIDTH = 208;
const ACTIONS_MENU_OFFSET = 4;

export interface MenuActionItem {
	key: string;
	label: string;
	icon: IconComponent;
	onPress: () => unknown;
	tone?: MenuActionTone;
	disabled?: boolean;
	/** A line above it, as the web's menus set Delete apart. */
	separated?: boolean;
}

interface IActionsMenu {
	/** The button that opened it, in window coordinates. */
	anchor: MenuRect;
	actions: MenuActionItem[];
	/** On top of the actions while they are out of reach: why, and who can use them. */
	hint?: string;
	onDismiss: () => unknown;
}

function iconInkOf(tone: MenuActionTone | undefined, theme: Theme): string {
	if (tone === 'destructive') {
		return theme.colors['destructive-ink'];
	}
	return theme.colors['muted-foreground'];
}

function Separator({ theme }: Readonly<{ theme: Theme }>) {
	return (
		<View testID="actions-menu-separator" style={[styles.separator, { backgroundColor: theme.colors.border }]} />
	);
}

/**
 * The actions of a row, as the web's row menu: under its button, its end on the button's, each action an icon and a
 * name, Delete set apart in destructive-ink. A pressed action closes the menu, then runs.
 */
export function ActionsMenu({ anchor, actions, hint, onDismiss }: Readonly<IActionsMenu>) {
	const theme = useWebTheme();
	const { areaRef, area, measureArea, context } = useMenuArea();
	const [menuHeight, setMenuHeight] = useState<number | null>(null);
	const isMeasured = area !== null && menuHeight !== null;
	const showsHint = Boolean(hint);

	let placementStyle = {};
	if (area !== null && menuHeight !== null) {
		const shape = { width: ACTIONS_MENU_WIDTH, align: 'end' as const, offset: ACTIONS_MENU_OFFSET };
		placementStyle = placementOnArea(area, anchor, menuHeight, context, shape);
	}

	const run = (action: MenuActionItem) => {
		onDismiss();
		action.onPress();
	};

	return (
		<MenuLayer areaRef={areaRef} measureArea={measureArea} onDismiss={onDismiss}>
			<View
				testID="actions-menu"
				onLayout={(event) => setMenuHeight(event.nativeEvent.layout.height)}
				style={[
					styles.menu,
					raisedSurfaceOf(theme),
					{ width: ACTIONS_MENU_WIDTH },
					placementStyle,
					!isMeasured && styles.measuring
				]}
			>
				{showsHint && (
					<>
						<Text style={[styles.hint, { color: theme.colors['muted-foreground'] }]}>{hint}</Text>
						<Separator theme={theme} />
					</>
				)}
				{actions.map((action) => (
					<Fragment key={action.key}>
						{action.separated && <Separator theme={theme} />}
						<PropertyMenuAction
							icon={<action.icon size={MENU_ICON_SIZE} color={iconInkOf(action.tone, theme)} />}
							label={action.label}
							tone={action.tone}
							disabled={action.disabled}
							onPress={() => run(action)}
						/>
					</Fragment>
				))}
			</View>
		</MenuLayer>
	);
}

const styles = StyleSheet.create({
	hint: {
		fontFamily: typography.primary.normal,
		fontSize: 13,
		paddingHorizontal: 8,
		paddingVertical: 6
	},
	// measured once on screen before it shows, so it never jumps into place
	measuring: {
		opacity: 0
	},
	menu: {
		overflow: 'hidden',
		padding: MENU_LIST_PADDING,
		position: 'absolute'
	},
	separator: {
		height: StyleSheet.hairlineWidth,
		marginHorizontal: -MENU_LIST_PADDING,
		marginVertical: MENU_LIST_PADDING
	}
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { IconComponent } from '../../../../../src/components/icons';
import { PlaceholderKind, TaskPropertyPlaceholderIcon } from '../../../../../src/components/task-property-icon';
import { useWebTheme } from '../../../../theme';

const ICON_SIZE = 16;

interface IPropertyLabel {
	label: string;
	/** A plain property's icon, from the web's icon family. */
	icon?: IconComponent;
	/** A task property's placeholder glyph, as the web's property rows draw it. */
	property?: PlaceholderKind;
}

function LabelGlyph({ icon: Icon, property, ink }: Readonly<Omit<IPropertyLabel, 'label'> & { ink: string }>) {
	if (property) {
		return <TaskPropertyPlaceholderIcon kind={property} size={ICON_SIZE} color={ink} />;
	}
	if (Icon) {
		return <Icon size={ICON_SIZE} color={ink} />;
	}
	return null;
}

/** A property's label on the task page: a 16 icon and a 13 label in muted-foreground, as the web's property rows. */
export function PropertyLabel({ label, icon, property }: Readonly<IPropertyLabel>) {
	const theme = useWebTheme();
	const ink = theme.colors['muted-foreground'];

	return (
		<View style={styles.label}>
			{/* the icon only decorates: a screen reader reads the label alone */}
			<View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
				<LabelGlyph icon={icon} property={property} ink={ink} />
			</View>
			<Text numberOfLines={2} style={[styles.text, { color: ink }]}>
				{label}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	// a row without an icon keeps the slot, so every label starts at the same place
	icon: {
		alignItems: 'center',
		width: ICON_SIZE
	},
	label: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		minHeight: 32
	},
	text: {
		flexShrink: 1,
		fontSize: 13
	}
});

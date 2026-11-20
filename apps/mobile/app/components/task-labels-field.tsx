import React, { useRef, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Plus } from '../../src/components/icons';
import { ChipIcon } from '../../src/components/chip-icon';
import { hsl, webColorTokens } from '../../src/theme/tokens';
import { translate } from '../i18n';
import { useWebTheme } from '../theme';
import { propertyTriggerLookOf } from './property-trigger';

const FIELD_HEIGHT = 28;
const GLYPH_SIZE = 14;
const LABEL_MAX_WIDTH = 160;
const ADD_BORDER_ALPHA = 0.25;
// the add button is 28, as the web's; the slop makes it a 44 target
const ADD_HIT_SLOP = 8;

// as a task's tags hold them: Gauzy may send a label without its name
export interface FieldLabel {
	id?: string;
	name?: string;
	color?: string | null;
}

interface ILabelChip {
	label: FieldLabel;
	onOpen: (tapped: View | null) => unknown;
}

/** A label the task holds, as the web's chip: its dot and its name, in the hue of its color. */
function LabelChip({ label, onOpen }: Readonly<ILabelChip>) {
	const theme = useWebTheme();
	const chipRef = useRef<View>(null);
	const item = { name: label.name, bgColor: label.color ?? undefined };
	const look = propertyTriggerLookOf(item, theme);
	return (
		<Pressable accessibilityRole="button" accessibilityLabel={label.name} onPress={() => onOpen(chipRef.current)}>
			<View ref={chipRef} collapsable={false} testID="task-label-chip" style={[styles.chip, look.container]}>
				<ChipIcon item={item} color={look.ink} kind="label" size={GLYPH_SIZE} />
				<Text numberOfLines={1} style={[styles.chipName, look.text]}>
					{label.name}
				</Text>
			</View>
		</Pressable>
	);
}

interface IAddLabel {
	anchorRef: RefObject<View | null>;
	onPress: () => unknown;
}

/** The web's dashed square after the labels, which opens their menu. */
function AddLabelButton({ anchorRef, onPress }: Readonly<IAddLabel>) {
	const theme = useWebTheme();
	const edge = hsl(webColorTokens[theme.scheme].foreground, ADD_BORDER_ALPHA);
	return (
		<Pressable
			ref={anchorRef}
			testID="task-labels-add"
			accessibilityRole="button"
			accessibilityLabel={translate('taskMenus.editLabels')}
			hitSlop={ADD_HIT_SLOP}
			onPress={() => onPress()}
			style={[styles.add, { borderColor: edge }]}
		>
			<Plus size={GLYPH_SIZE} color={theme.colors['muted-foreground']} />
		</Pressable>
	);
}

/** "+ Add label" in muted text, as the web's task page reads a task without labels. */
function AddFirstLabel({ anchorRef, onPress }: Readonly<IAddLabel>) {
	const theme = useWebTheme();
	const muted = theme.colors['muted-foreground'];
	return (
		<Pressable
			ref={anchorRef}
			testID="task-labels-add"
			accessibilityRole="button"
			onPress={() => onPress()}
			style={styles.empty}
		>
			<Plus size={GLYPH_SIZE} color={muted} />
			<Text style={[styles.emptyText, { color: muted }]}>{translate('taskMenus.addLabel')}</Text>
		</Pressable>
	);
}

interface ITaskLabelsField {
	labels: FieldLabel[];
	/** Where the labels' menu opens when it is not opened from a label. */
	anchorRef: RefObject<View | null>;
	/** Opens the labels' menu, under the label tapped or under the add button. */
	onOpen: (tapped?: View | null) => unknown;
}

/**
 * A task's labels as the web's task page shows them: a chip for each, then a dashed add button; "+ Add label" while
 * it has none. The chips wrap onto the next line.
 */
export function TaskLabelsField({ labels, anchorRef, onOpen }: Readonly<ITaskLabelsField>) {
	const hasLabels = labels.length > 0;
	return (
		<View testID="task-labels-field" style={styles.field}>
			{labels.map((label, index) => (
				<LabelChip key={label.id ?? `${label.name}-${index}`} label={label} onOpen={onOpen} />
			))}
			{hasLabels && <AddLabelButton anchorRef={anchorRef} onPress={() => onOpen()} />}
			{!hasLabels && <AddFirstLabel anchorRef={anchorRef} onPress={() => onOpen()} />}
		</View>
	);
}

const styles = StyleSheet.create({
	add: {
		alignItems: 'center',
		borderRadius: 6,
		borderStyle: 'dashed',
		borderWidth: 1,
		height: FIELD_HEIGHT,
		justifyContent: 'center',
		width: FIELD_HEIGHT
	},
	chip: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 6,
		height: FIELD_HEIGHT,
		maxWidth: LABEL_MAX_WIDTH
	},
	chipName: {
		flexShrink: 1
	},
	empty: {
		alignItems: 'center',
		borderRadius: 6,
		flexDirection: 'row',
		gap: 6,
		height: FIELD_HEIGHT,
		marginLeft: -6,
		paddingHorizontal: 6
	},
	emptyText: {
		fontSize: 13
	},
	field: {
		alignItems: 'center',
		flexDirection: 'row',
		flexShrink: 1,
		flexWrap: 'wrap',
		gap: 6,
		paddingVertical: 2
	}
});

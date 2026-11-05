import { Extension } from '@tiptap/core';

export const TEXT_ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const;

export type TTextAlignment = (typeof TEXT_ALIGNMENTS)[number];

const ALIGNABLE_TYPES = ['paragraph', 'heading'];

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		textAlign: {
			setTextAlign: (alignment: TTextAlignment) => ReturnType;
			unsetTextAlign: () => ReturnType;
		};
	}
}

function alignmentOf(value: string): TTextAlignment | null {
	const match = TEXT_ALIGNMENTS.find((alignment) => alignment === value);
	return match ?? null;
}

/**
 * Paragraph and heading alignment, read from and written to `style="text-align: ..."`: the Slate editor and the
 * mobile app store alignment that way, so descriptions keep it when they are opened and saved here.
 */
export const TextAlign = Extension.create({
	name: 'textAlign',

	addGlobalAttributes() {
		return [
			{
				types: ALIGNABLE_TYPES,
				attributes: {
					textAlign: {
						default: null,
						parseHTML: (element) => alignmentOf(element.style.textAlign),
						renderHTML: (attributes) => {
							if (!attributes.textAlign) {
								return {};
							}
							return { style: `text-align: ${attributes.textAlign}` };
						}
					}
				}
			}
		];
	},

	addCommands() {
		return {
			setTextAlign:
				(alignment) =>
				({ commands }) => {
					const updates = ALIGNABLE_TYPES.map((type) =>
						commands.updateAttributes(type, { textAlign: alignment })
					);
					return updates.some(Boolean);
				},
			unsetTextAlign:
				() =>
				({ commands }) => {
					const resets = ALIGNABLE_TYPES.map((type) => commands.resetAttributes(type, 'textAlign'));
					return resets.some(Boolean);
				}
		};
	}
});

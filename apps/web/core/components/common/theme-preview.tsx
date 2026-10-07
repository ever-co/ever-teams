import type { CSSProperties } from 'react';

/**
 * Brand-free preview of what the app looks like in a given theme.
 *
 * This used to be a PNG screenshot of the hosted product, wordmark included, baked into the
 * published image (see test/architecture/unbranded-theme-picker.test.ts): a deployment rebranded with
 * `docker run -e APP_NAME=... -e APP_LOGO_URL=...` still showed Ever's brand in its own theme
 * picker. A wireframe carries no brand and no text, so there is nothing to translate and nothing to
 * re-shoot when the UI changes.
 *
 * Each card previews ITS OWN theme, not the active one, so the colours are fixed per variant here:
 * do not reach for `dark:` variants or theme CSS variables.
 */
const PALETTES = {
	light: {
		background: '#ffffff',
		border: '#e7e7ea',
		muted: '#d7d7dc',
		strong: '#9a97a6',
		surface: '#f7f7f8'
	},
	dark: {
		background: '#16171b',
		border: '#2b2e35',
		muted: '#3a3e47',
		strong: '#6b7280',
		surface: '#1e2025'
	}
} as const;

// tailwind.config.js `primary.DEFAULT` — the same accent in both themes.
const ACCENT = '#6366f1';

export type TThemePreviewVariant = keyof typeof PALETTES;

interface IThemePreviewProps {
	className?: string;
	style?: CSSProperties;
	variant: TThemePreviewVariant;
}

export function ThemePreview({ className, style, variant }: IThemePreviewProps) {
	const palette = PALETTES[variant];
	const outline = { fill: palette.background, stroke: palette.border, strokeWidth: 0.75 };
	const panel = { fill: palette.surface, stroke: palette.border, strokeWidth: 0.75 };
	const activePanel = { fill: palette.surface, stroke: ACCENT, strokeWidth: 0.75 };

	return (
		<svg aria-hidden="true" className={className} focusable="false" style={style} viewBox="0 0 290 156">
			<rect width={290} height={156} fill={palette.background} />
			{/* Top bar: logo placeholder, workspace switcher, avatar */}
			<rect width={290} height={22} fill={palette.surface} />
			<rect y={21.25} width={290} height={0.75} fill={palette.border} />
			<rect x={12} y={8} width={34} height={6} rx={3} fill={ACCENT} />
			<rect x={198} y={6} width={56} height={11} rx={5.5} {...outline} />
			<circle cx={270} cy={11} r={6} fill={palette.muted} />
			{/* Breadcrumb */}
			<rect x={16} y={30} width={46} height={4} rx={2} fill={palette.muted} />
			{/* Member header and the running timer card */}
			<circle cx={29} cy={53} r={11} fill={palette.muted} />
			<rect x={47} y={46} width={64} height={7} rx={3.5} fill={palette.strong} />
			<rect x={47} y={58} width={44} height={4} rx={2} fill={palette.muted} />
			<rect x={188} y={38} width={86} height={30} rx={6} {...panel} />
			<rect x={197} y={46} width={46} height={8} rx={3} fill={palette.strong} />
			<rect x={197} y={58} width={46} height={3} rx={1.5} fill={palette.border} />
			<rect x={197} y={58} width={19} height={3} rx={1.5} fill={ACCENT} />
			<circle cx={259} cy={53} r={8} fill={ACCENT} />
			{/* Tabs, the first one selected */}
			<rect x={16} y={78} width={26} height={5} rx={2.5} fill={ACCENT} />
			<rect x={50} y={78} width={24} height={5} rx={2.5} fill={palette.muted} />
			<rect x={82} y={78} width={30} height={5} rx={2.5} fill={palette.muted} />
			<rect x={16} y={87} width={26} height={1.5} rx={0.75} fill={ACCENT} />
			<rect x={16} y={93} width={258} height={0.75} fill={palette.border} />
			{/* Task rows, the first one running */}
			<rect x={16} y={100} width={258} height={23} rx={6} {...activePanel} />
			<rect x={26} y={107} width={72} height={4} rx={2} fill={palette.strong} />
			<rect x={26} y={115} width={50} height={3} rx={1.5} fill={palette.muted} />
			<rect x={146} y={110} width={32} height={4} rx={2} fill={palette.muted} />
			<rect x={212} y={106} width={50} height={11} rx={5.5} {...outline} />
			<rect x={16} y={129} width={258} height={21} rx={6} {...panel} />
			<rect x={26} y={135} width={60} height={4} rx={2} fill={palette.muted} />
			<rect x={26} y={142} width={40} height={3} rx={1.5} fill={palette.muted} />
			<rect x={146} y={138} width={28} height={3} rx={1.5} fill={palette.muted} />
			<rect x={212} y={134} width={50} height={10} rx={5} {...outline} />
		</svg>
	);
}

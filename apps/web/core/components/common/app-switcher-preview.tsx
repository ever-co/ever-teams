import { EverStar } from '@/core/components/icons/ever-star';
import type { AppSwitcherPlacement } from '@/core/stores/common/app-switcher';

const VIEW_WIDTH = 290;
const VIEW_HEIGHT = 156;
const PANEL_TOP = 6;
const PANEL_RIGHT = 284;
const TOP_BAR_HEIGHT = 20;
const SIDEBAR_WIDTH = 64;
const PANEL_GAP = 6;
const PANEL_X = SIDEBAR_WIDTH + PANEL_GAP;
const RAIL_WIDTH = 22;
const NAV_BAR_WIDTHS = [40, 32, 44, 28, 36];
const MENU_BAR_WIDTHS = [26, 20, 30, 18];
const RAIL_TILE_COUNT = 5;
const STROKE = { strokeWidth: 0.75 };

const LAYOUTS = {
	sidebar: { sidebarX: 0, panelX: PANEL_X, hasRail: false, glyph: { x: 13, y: 15 }, menu: { x: 8, y: 24 } },
	header: { sidebarX: 0, panelX: PANEL_X, hasRail: false, glyph: { x: 272, y: 16 }, menu: { x: 216, y: 27 } },
	rail: { sidebarX: RAIL_WIDTH, panelX: RAIL_WIDTH + PANEL_X, hasRail: true, glyph: null, menu: null }
} as const;

type Point = Readonly<{ x: number; y: number }>;

const MARK_GLYPH_SIZE = 11;

function MarkGlyph({ x, y }: Point) {
	const half = MARK_GLYPH_SIZE / 2;
	return <EverStar x={x - half} y={y - half} width={MARK_GLYPH_SIZE} height={MARK_GLYPH_SIZE} />;
}

function FloatingMenu({ x, y }: Point) {
	return (
		<g>
			<rect x={x} y={y} width={62} height={44} rx={5} className="fill-popover stroke-border" {...STROKE} />
			{MENU_BAR_WIDTHS.map((barWidth, index) => {
				const rowY = y + 6 + index * 9.5;
				return (
					<g key={barWidth}>
						<rect x={x + 6} y={rowY} width={5} height={5} rx={1.4} className="fill-foreground/15" />
						<rect
							x={x + 14}
							y={rowY + 1}
							width={barWidth}
							height={3}
							rx={1.5}
							className="fill-foreground/15"
						/>
					</g>
				);
			})}
			<circle cx={x + 55} cy={y + 8.5} r={2.2} className="fill-primary" />
		</g>
	);
}

function Rail() {
	const tileKeys = Array.from({ length: RAIL_TILE_COUNT }, (_, index) => index);
	return (
		<g>
			<rect x={0} y={11.5} width={2} height={6} rx={1} className="fill-primary" />
			{tileKeys.map((index) => {
				const isCurrent = index === 0;
				let tileClass = 'fill-primary/30';
				if (isCurrent) {
					tileClass = 'fill-primary/70';
				}
				return (
					<rect key={index} x={6.5} y={10 + index * 13} width={9} height={9} rx={2.5} className={tileClass} />
				);
			})}
		</g>
	);
}

function SidebarColumn({ x, leavesRoomForGlyph }: Readonly<{ x: number; leavesRoomForGlyph: boolean }>) {
	let workspaceX = x + 8;
	if (leavesRoomForGlyph) {
		workspaceX = x + 22;
	}
	return (
		<g>
			<rect x={workspaceX} y={10} width={34} height={10} rx={3} className="fill-foreground/15" />
			{NAV_BAR_WIDTHS.map((barWidth, index) => (
				<rect
					key={barWidth}
					x={x + 8}
					y={32 + index * 10}
					width={barWidth}
					height={4}
					rx={2}
					className="fill-foreground/10"
				/>
			))}
		</g>
	);
}

function PagePanel({ x, leavesRoomForGlyph }: Readonly<{ x: number; leavesRoomForGlyph: boolean }>) {
	const width = PANEL_RIGHT - x;
	const topBarY = PANEL_TOP + TOP_BAR_HEIGHT;
	let pillsEnd = PANEL_RIGHT - 10;
	if (leavesRoomForGlyph) {
		pillsEnd = PANEL_RIGHT - 22;
	}
	const rowWidth = width - 20;
	const rowYs = [topBarY + 10, topBarY + 36, topBarY + 62, topBarY + 88];

	return (
		<g>
			<rect
				x={x}
				y={PANEL_TOP}
				width={width}
				height={144}
				rx={7}
				className="fill-card stroke-border"
				{...STROKE}
			/>
			<rect x={x} y={topBarY} width={width} height={0.75} className="fill-border" />
			<rect x={x + 10} y={PANEL_TOP + 8} width={36} height={4} rx={2} className="fill-foreground/15" />
			<rect
				x={pillsEnd - 56}
				y={PANEL_TOP + 5.5}
				width={26}
				height={9}
				rx={4.5}
				className="fill-none stroke-border"
				{...STROKE}
			/>
			<rect
				x={pillsEnd - 26}
				y={PANEL_TOP + 5.5}
				width={26}
				height={9}
				rx={4.5}
				className="fill-none stroke-border"
				{...STROKE}
			/>
			{rowYs.map((rowY) => (
				<g key={rowY}>
					<rect
						x={x + 10}
						y={rowY}
						width={rowWidth}
						height={20}
						rx={5}
						className="fill-none stroke-border"
						{...STROKE}
					/>
					<rect
						x={x + 18}
						y={rowY + 8}
						width={rowWidth * 0.35}
						height={4}
						rx={2}
						className="fill-foreground/10"
					/>
				</g>
			))}
		</g>
	);
}

interface IAppSwitcherPreviewProps {
	placement: AppSwitcherPlacement;
	className?: string;
}

/** Unlike ThemePreview, this wireframe follows the active theme: it shows a position, not a palette. */
export function AppSwitcherPreview({ placement, className }: Readonly<IAppSwitcherPreviewProps>) {
	const layout = LAYOUTS[placement];
	const isHeader = placement === 'header';
	const isSidebar = placement === 'sidebar';

	return (
		<svg aria-hidden="true" className={className} focusable="false" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
			<rect width={VIEW_WIDTH} height={VIEW_HEIGHT} className="fill-sidebar" />
			{layout.hasRail && <Rail />}
			<SidebarColumn x={layout.sidebarX} leavesRoomForGlyph={isSidebar} />
			<PagePanel x={layout.panelX} leavesRoomForGlyph={isHeader} />
			{layout.glyph && <MarkGlyph x={layout.glyph.x} y={layout.glyph.y} />}
			{layout.menu && <FloatingMenu x={layout.menu.x} y={layout.menu.y} />}
		</svg>
	);
}

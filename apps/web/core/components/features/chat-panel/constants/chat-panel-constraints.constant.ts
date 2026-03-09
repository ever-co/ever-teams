/**
 * CHAT_PANEL_CONSTRAINTS
 *
 * Sizing rules for the chat panel (expressed in % of SidebarInset width,
 * NOT the full viewport — the sidebar width is excluded).
 */
export const CHAT_PANEL_CONSTRAINTS = {
	defaultSize: 30, // 30% of the content area when open
	minSize: 20, // cannot be squeezed below 20%
	maxSize: 50, // cannot take more than half the content area
	collapsedSize: 0 // fully hidden when collapsed
} as const;

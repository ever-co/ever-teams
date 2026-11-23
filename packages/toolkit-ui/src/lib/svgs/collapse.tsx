// The expand icon's arrows pointing in: what folds back what ExpandIcon unfolds (#5608). Decorative: the control that
// draws it carries the name.
function CollapseIcon({ size = 24 }: Readonly<{ size?: number }>) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="currentColor"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M15 3V9H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M9 21V15H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M15 9L21 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M3 21L9 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export { CollapseIcon };

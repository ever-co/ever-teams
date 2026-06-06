/**
 * Represents an RGBA color value with numeric components
 */
export type RGBAMap = Record<'r' | 'g' | 'b' | 'a', number>;

/**
 * Props for the ResizableContainer component
 */
export interface ContainerProps {
	/** Background color in RGBA format */
	background: RGBAMap;
	/** Text color in RGBA format */
	color: RGBAMap;
	/** Layout direction for container children */
	flexDirection?: 'row' | 'column';
	/** CSS align-items property */
	alignItems?: string;
	/** CSS justify-content property */
	justifyContent?: string;
	/** Whether container should expand to fill available space */
	fillSpace?: 'yes' | 'no';
	/** Container width (CSS value) */
	width?: string;
	/** Container height (CSS value) */
	height?: string;
	/** Padding values [top, right, bottom, left] */
	padding?: string[];
	/** Margin values [top, right, bottom, left] */
	margin?: string[];
	/** Shadow intensity */
	radius?: number;
	/** Border radius */
	shadow?: number;
	/** Additional CSS classes */
	className?: string;
	/** Container contents */
	children: React.ReactNode;
}

/**
 * Interface for components that can be used with Craft.js
 */
export interface CraftComponent<T> extends React.FC<Partial<T>> {
	craft?: {
		/** Display name in the editor */
		displayName: string;
		/** Default props */
		props: T;
		/** Component rules */
		rules: {
			canDrag: () => boolean;
		};
		/** Related UI components */
		related: {
			toolbar: () => React.JSX.Element;
		};
	};
}

/**
 * Type definition for a ResizableContainer component
 */
export type ResizableContainerComponent = CraftComponent<ContainerProps>;

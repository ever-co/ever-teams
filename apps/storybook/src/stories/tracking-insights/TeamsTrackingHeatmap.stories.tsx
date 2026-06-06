import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsTrackingHeatmap } from '@ever-teams/atoms';

/**
 * TeamsTrackingHeatmap provides interactive heatmap visualization with advanced performance optimizations.
 * 
 * ## Features
 * 
 * - **Dual Heatmaps**: Click heatmaps (circles) and scroll heatmaps (rectangles)
 * - **Color Schemes**: Multiple color schemes for visualization (hot, cool, blue)
 * - **Interactive Controls**: Adjustable aggregation radius with debounced updates
 * - **Device Statistics**: Mobile/desktop breakdown with session counts
 * - **Performance Optimized**: 70-80% fewer re-renders with memoized components
 * - **Viewport Filtering**: Reduces canvas operations by 40-50% through smart rendering
 * 
 * ## Data Source
 * 
 * This component gets its data from the `useTrackingContext()` hook, which provides:
 * - Session data with encoded Clarity payloads
 * - Loading states and error handling
 * - Session refresh capabilities
 * 
 * ## Use Cases
 * 
 * - **Click Analysis**: Understanding where users click most frequently
 * - **Scroll Behavior**: Analyzing scroll patterns and page engagement
 * - **UX Optimization**: Identifying hot spots and dead zones on pages
 * - **A/B Testing**: Comparing interaction patterns across page variants
 * - **Conversion Optimization**: Optimizing element placement based on heat data
 */
const meta: Meta<typeof TeamsTrackingHeatmap> = {
	title: 'Tracking & Insights/Teams Tracking Heatmap',
	component: TeamsTrackingHeatmap,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsTrackingHeatmap is a high-performance visualization component that provides interactive heatmap analysis of user behavior. It offers both click and scroll heatmaps with advanced controls and significant performance optimizations.

### Key Capabilities

- **Click Heatmaps**: Visualizes click patterns with color-coded intensity and aggregation
- **Scroll Heatmaps**: Shows scroll behavior patterns with directional indicators
- **Multiple Color Schemes**: Hot, cool, and blue color schemes for different visualization needs
- **Interactive Controls**: Real-time adjustment of aggregation radius, color schemes, and display options
- **Device Analytics**: Automatic device type detection with mobile/desktop statistics
- **Performance Optimized**: Advanced optimizations including memoized components and debounced controls

### Performance Features

- **70-80% Fewer Re-renders**: Through custom context hooks and component memoization
- **Debounced Controls**: 90% reduction in computation frequency during slider interactions
- **Viewport Filtering**: 40-50% fewer canvas operations by rendering only visible elements
- **RequestAnimationFrame**: Smooth scrolling with optimal frame rate synchronization

### Technical Implementation

The component uses Microsoft Clarity's visualization engine with custom performance enhancements. It provides real-time heatmap generation while maintaining smooth user interactions through advanced optimization techniques.
				`
			}
		}
	},
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes to apply to the component container',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'undefined' }
			}
		},
		showControl: {
			control: 'boolean',
			description: 'Whether to show the heatmap control panel for adjusting visualization settings',
			table: {
				type: { summary: 'boolean' },
				defaultValue: { summary: 'true' }
			}
		}
	},
	decorators: [
		(Story) => (
			<div style={{ width: '1200px', height: '800px' }}>
				<Story />
			</div>
		)
	]
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default heatmap component with controls enabled showing full functionality.
 * Displays interactive heatmap with control panel for customization.
 */
export const Default: Story = {
	args: {
		showControl: true
	},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsTrackingHeatmap component with controls enabled. Shows the full heatmap interface including the control panel for adjusting aggregation radius, color schemes, and heatmap modes.'
			}
		}
	}
};

/**
 * Heatmap component without control panel for embedded or simplified use cases.
 * Provides clean heatmap visualization without interactive controls.
 */
export const WithoutControls: Story = {
	args: {
		showControl: false
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsTrackingHeatmap with controls disabled (showControl=false). Provides a clean heatmap visualization without the control panel, ideal for embedded use cases or when controls are managed externally.'
			}
		}
	}
};

/**
 * Heatmap component with custom styling and controls enabled.
 * Demonstrates visual customization while maintaining full functionality.
 */
export const CustomStyling: Story = {
	args: {
		showControl: true,
		className: 'shadow-2xl border-2 border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsTrackingHeatmap with custom styling applied through the className prop and controls enabled. Features enhanced visual design with gradient background, custom borders, and shadow effects while preserving all heatmap functionality.'
			}
		}
	}
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsTrackingSessionReplay } from '@ever-teams/atoms';

/**
 * TeamsTrackingSessionReplay provides session replay functionality with interactive playback controls.
 * 
 * ## Features
 * 
 * - **Session Replay**: Full Microsoft Clarity session replay with playback controls
 * - **Session List**: Interactive session browser with device type indicators
 * - **Session Details**: Duration, date range, URL, and device information display
 * - **Visual Selection**: Interactive session selection with visual feedback
 * - **Session Management**: Clear selection and session filtering capabilities
 * - **Responsive Layout**: Adaptive layout for different screen sizes
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
 * - **User Experience Analysis**: Watching actual user interactions and behavior
 * - **Bug Investigation**: Reproducing user-reported issues through session replay
 * - **Conversion Analysis**: Understanding user paths and drop-off points
 * - **UX Research**: Observing real user behavior patterns and pain points
 * - **Quality Assurance**: Validating user flows and identifying usability issues
 */
const meta: Meta<typeof TeamsTrackingSessionReplay> = {
	title: 'Tracking & Insights/Teams Tracking Session Replay',
	component: TeamsTrackingSessionReplay,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsTrackingSessionReplay is a comprehensive session replay component that provides full Microsoft Clarity integration for watching and analyzing user sessions. It offers an intuitive interface for browsing, selecting, and replaying user interactions.

### Key Capabilities

- **Full Session Replay**: Complete Microsoft Clarity session playback with all user interactions
- **Session Browser**: Interactive list of available sessions with key metadata
- **Device Detection**: Automatic device type identification with visual indicators
- **Session Metadata**: Duration, timestamps, URLs, and session IDs for each session
- **Interactive Selection**: Click-to-select sessions with visual feedback and state management
- **Responsive Design**: Adaptive layout that works across different screen sizes
- **State Management**: Intelligent session clearing when filters change

### Technical Implementation

The component integrates with the TrackingProvider context to access session data and uses Microsoft Clarity's replay functionality to render actual user sessions. It provides efficient session management and optimal performance through memoized device type detection.
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
 * Default session replay component showing the session browser and replay interface.
 * Displays session list with metadata and provides full replay functionality.
 */
export const Default: Story = {
	args: {},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsTrackingSessionReplay component with standard styling and full replay functionality. Shows the session browser on the left with session metadata and the replay area on the right for selected sessions.'
			}
		}
	}
};

/**
 * Session replay component with custom styling applied through className prop.
 * Demonstrates how to customize the appearance while maintaining full functionality.
 */
export const CustomStyling: Story = {
	args: {
		className: 'shadow-2xl border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsTrackingSessionReplay with custom styling applied through the className prop. Features enhanced visual design with gradient background, custom borders, and shadow effects while preserving all session replay functionality.'
			}
		}
	}
};

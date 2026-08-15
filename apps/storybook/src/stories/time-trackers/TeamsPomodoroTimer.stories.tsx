import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsPomodoroTimer } from '@ever-teams/atoms';

const meta = {
	title: 'Time Trackers/Pomodoro Timer',
	component: TeamsPomodoroTimer,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
A comprehensive Pomodoro timer component that implements the Pomodoro Technique for time management.

**Features:**
- Multiple timer presets (Very Short: 15min, Short: 20min, Medium: 25min, Long: 30min, Custom)
- Automatic cycling between work sessions and breaks
- Long breaks every 4 pomodoros
- Task management with add, edit, delete, and completion tracking
- Timer customization with custom durations
- Session counters for pomodoros, rests, and long rests
- Local storage persistence for tasks and counters
- Responsive design with smooth animations

**Timer Flow:**
1. Work session (Pomodoro) → Short break
2. After 4 pomodoros → Long break
3. Automatic progression between sessions

**Customization:**
- Custom work session duration
- Custom short break duration
- Custom long break duration
- Task management for productivity tracking
				`
			}
		}
	},
	argTypes: {
		size: {
			control: { type: 'select' },
			options: ['sm', 'md', 'lg'],
			description: 'Size variant of the timer'
		},
		variant: {
			control: { type: 'select' },
			options: ['default', 'compact', 'minimal'],
			description: 'Visual style variant'
		},
		border: {
			control: { type: 'select' },
			options: ['none', 'bordered'],
			description: 'Border style variant'
		},
		className: {
			control: { type: 'text' },
			description: 'Additional CSS classes'
		}
	},
	decorators: [
		(Story) => (
			<div className="w-[70vw]">
				<Story />
			</div>
		)
	]
} satisfies Meta<typeof TeamsPomodoroTimer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default Pomodoro timer with medium preset (25 minutes work, 5 minutes rest, 15 minutes long rest).
 * Includes task management, timer controls, and customization options.
 */
export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story: `
The default Pomodoro timer starts with the medium preset (25-minute work sessions).
Users can start/pause the timer, manage tasks, and customize timer durations.

**Default Settings:**
- Work Session: 25 minutes
- Short Break: 5 minutes
- Long Break: 15 minutes (every 4th break)
- Timer Type: Pomodoro (work session)
				`
			}
		}
	}
};

// ===== SIZE VARIANTS =====

/**
 * Small size variant of the Pomodoro timer.
 * Compact layout suitable for smaller spaces or sidebars.
 */
export const SmallSize: Story = {
	args: {
		size: 'sm'
	},
	parameters: {
		docs: {
			description: {
				story: `
Small size variant with compact dimensions and reduced padding.
Perfect for dashboard widgets or sidebar placement.

**Features:**
- Smaller timer circle and text
- Compact button sizing
- Reduced spacing throughout
				`
			}
		}
	}
};

/**
 * Large size variant of the Pomodoro timer.
 * Expanded layout for prominent display or full-screen usage.
 */
export const LargeSize: Story = {
	args: {
		size: 'lg'
	},
	parameters: {
		docs: {
			description: {
				story: `
Large size variant with expanded dimensions and generous padding.
Ideal for main focus areas or full-screen timer applications.

**Features:**
- Larger timer circle and text
- Expanded button sizing
- Generous spacing throughout
				`
			}
		}
	}
};

// ===== VARIANT STYLES =====

/**
 * Compact variant with reduced spacing between elements.
 * Maintains all functionality while using less vertical space.
 */
export const CompactVariant: Story = {
	args: {
		variant: 'compact'
	},
	parameters: {
		docs: {
			description: {
				story: `
Compact variant reduces spacing between elements while maintaining full functionality.
Useful when vertical space is limited but all features are needed.

**Features:**
- Reduced spacing between sections
- Same functionality as default
- Includes task management
				`
			}
		}
	}
};

/**
 * Minimal variant without task management.
 * Clean, focused timer interface for distraction-free sessions.
 */
export const MinimalVariant: Story = {
	args: {
		variant: 'minimal'
	},
	parameters: {
		docs: {
			description: {
				story: `
Minimal variant removes the task management section for a clean, focused experience.
Perfect for users who prefer external task management or want minimal distractions.

**Features:**
- No task list
- Clean, minimal interface
- All timer functionality preserved
- Timer customization still available
				`
			}
		}
	}
};

// ===== BORDER VARIANTS =====

/**
 * Bordered variant with enhanced visual definition.
 * Adds a prominent border around the entire timer component.
 */
export const BorderedVariant: Story = {
	args: {
		border: 'bordered'
	},
	parameters: {
		docs: {
			description: {
				story: `
Bordered variant adds a prominent border around the timer for enhanced visual definition.
Useful when the timer needs to stand out from surrounding content.

**Features:**
- Enhanced border styling
- Better visual separation
- Same functionality as default
				`
			}
		}
	}
};

// ===== COMBINED VARIANTS =====

/**
 * Small, compact, and bordered combination.
 * Maximum space efficiency with clear visual boundaries.
 */
export const SmallCompactBordered: Story = {
	args: {
		size: 'sm',
		variant: 'compact',
		border: 'bordered'
	},
	parameters: {
		docs: {
			description: {
				story: `
Combines small size, compact spacing, and bordered styling for maximum space efficiency
while maintaining clear visual boundaries.

**Use Cases:**
- Dashboard widgets
- Sidebar components
- Space-constrained layouts
				`
			}
		}
	}
};

/**
 * Large minimal variant for focused timer sessions.
 * Prominent display without task management distractions.
 */
export const LargeMinimal: Story = {
	args: {
		size: 'lg',
		variant: 'minimal'
	},
	parameters: {
		docs: {
			description: {
				story: `
Large minimal variant provides a prominent, distraction-free timer experience.
Perfect for full-screen timer applications or meditation sessions.

**Use Cases:**
- Full-screen timer mode
- Meditation or focus sessions
- Presentation mode
				`
			}
		}
	}
};

/**
 * Large minimal bordered variant.
 * Maximum prominence with clear boundaries and no distractions.
 */
export const LargeMinimalBordered: Story = {
	args: {
		size: 'lg',
		variant: 'minimal',
		border: 'bordered'
	},
	parameters: {
		docs: {
			description: {
				story: `
Combines large size, minimal interface, and bordered styling for maximum visual impact
while maintaining a clean, focused experience.

**Use Cases:**
- Standalone timer applications
- Kiosk mode displays
- High-visibility timer needs
				`
			}
		}
	}
};

// ===== THEME VARIANTS =====

/**
 * Dark theme variant demonstration.
 * Shows how the timer appears in dark mode.
 */
export const DarkTheme: Story = {
	parameters: {
		docs: {
			description: {
				story: `
Demonstrates the Pomodoro timer in dark theme mode.
The component automatically adapts to the current theme context.

**Dark Theme Features:**
- Inverted color scheme
- Proper contrast ratios
- Theme-aware animations
- Consistent visual hierarchy
				`
			}
		}
	},
	decorators: [
		(Story) => (
			<div className="dark bg-black p-8 rounded-lg">
				<Story />
			</div>
		)
	]
};

// ===== EDGE CASES AND ADVANCED USAGE =====

/**
 * Mobile responsive demonstration.
 * Shows how the timer adapts to mobile screen sizes.
 */
export const MobileResponsive: Story = {
	parameters: {
		docs: {
			description: {
				story: `
Demonstrates the mobile-responsive behavior of the Pomodoro timer.
The component automatically adapts to smaller screen sizes and touch interfaces.

**Mobile Optimizations:**
- Touch-friendly button sizes
- Responsive text scaling
- Optimized spacing for small screens
- Swipe-friendly task management
- Portrait orientation support

**Responsive Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px
				`
			}
		}
	},
	decorators: [
		(Story) => (
			<div className="max-w-sm mx-auto border border-gray-300 rounded-lg overflow-hidden">
				<div className="bg-gray-100 px-4 py-2 text-sm font-medium text-center">Mobile View (375px)</div>
				<div className="p-4">
					<Story args={{ size: 'sm' }} />
				</div>
			</div>
		)
	]
};

/**
 * Integration showcase.
 * Shows how the timer integrates with other components.
 */
export const IntegrationShowcase: Story = {
	parameters: {
		docs: {
			description: {
				story: `
Demonstrates how the Pomodoro timer integrates with other components and systems.

**Integration Points:**
- Theme system integration
- Internationalization support
- Local storage persistence
- Animation system compatibility
- Accessibility framework integration

**Real-world Usage:**
- Dashboard widgets
- Productivity applications
- Time tracking systems
- Focus applications
- Team collaboration tools
				`
			}
		}
	},
	decorators: [
		(Story) => (
			<div className="space-y-6">
				<div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
					<h3 className="text-lg font-semibold mb-4">Productivity Dashboard</h3>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div>
							<Story args={{ size: 'md', variant: 'compact' }} />
						</div>
						<div className="space-y-4">
							<div className="bg-white p-4 rounded border">
								<h4 className="font-medium mb-2">Today's Progress</h4>
								<div className="text-sm text-gray-600">
									<div>Completed Pomodoros: 3</div>
									<div>Total Focus Time: 1h 15m</div>
									<div>Tasks Completed: 5</div>
								</div>
							</div>
							<div className="bg-white p-4 rounded border">
								<h4 className="font-medium mb-2">Upcoming Tasks</h4>
								<div className="text-sm text-gray-600 space-y-1">
									<div>• Review project proposal</div>
									<div>• Update documentation</div>
									<div>• Team standup meeting</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		)
	]
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsTimesheet } from '@ever-teams/atoms';

const meta: Meta<typeof TeamsTimesheet> = {
	title: 'Charts & Reports/Reports/Teams Timesheet',
	component: TeamsTimesheet,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
A comprehensive timesheet component that displays detailed time log entries with advanced filtering and pagination capabilities.

**Features:**
- Detailed time log table with employee, project, task, and time information
- Real-time data from TeamsProvider context via useTimeLogs hook
- Advanced filtering: date selection, source, log type, and activity level
- Employee selector for admin users (optional column display)
- Multi-select filters for source (TEAMS, Desktop, Mobile, etc.) and log type (Tracked, Manual, Idle, Resumed)
- Pagination with customizable items per page (5, 10, 20, 50)
- Refresh functionality to reload data
- Loading states with overlay spinner
- Empty state handling with visual feedback
- Responsive table design with proper column formatting
- Badge indicators for log type and source with color coding
- Time formatting (HH:MM:SS) and time span display
- Timezone support for accurate time display
- Activity level filtering (0-100% range)

**Data Source:**
- Gets data from \`useTimeLogs\` hook with real-time filtering
- Each log contains: employee, project, task, duration, time span, log type, source, and notes
- Loading state managed through hook's loading property
- Error handling with user-friendly error messages

**Table Columns:**
- **Employee** (optional): Avatar and full name
- **Project**: Project avatar, name, client, and task details
- **Log Type**: Badge showing TRACKED, MANUAL, IDLE, or RESUMED
- **Source**: Badge showing TEAMS, DESKTOP, MOBILE, BROWSER, etc.
- **Duration**: Formatted time in HH:MM:SS
- **Time Span**: Start time - End time with AM/PM
- **Notes**: Description/notes for the time entry

**Filtering Options:**
- **Date**: Single date picker (defaults to today)
- **Source**: Multi-select from TimerSource enum values
- **Log Type**: Multi-select from LogType enum values
- **Activity Level**: Range filter (start-end percentage)
- **Timezone**: Custom timezone for time display
- **Employee**: Via TeamsActiveEmployeeSelector (admin only)

**Use Cases:**
- Detailed timesheet reports and auditing
- Employee time tracking verification
- Project time allocation analysis
- Billing and invoicing data collection
- Productivity monitoring and analysis
- Time entry compliance checking
				`
			}
		}
	},
	argTypes: {
		className: {
			control: { type: 'text' },
			description: 'Additional CSS classes for custom styling',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'undefined' }
			}
		},
		date: {
			control: { type: 'object' },
			description: 'Date range filter for time logs (DateRange with from/to)',
			table: {
				type: { summary: 'DateRange' },
				defaultValue: { summary: 'undefined (defaults to today)' }
			}
		},
		activityLevel: {
			control: { type: 'object' },
			description: 'Activity level range filter (start: 0-100, end: 0-100)',
			table: {
				type: { summary: '{ start: number; end: number }' },
				defaultValue: { summary: 'undefined' }
			}
		},
		timeZone: {
			control: { type: 'text' },
			description: 'Timezone for time display (e.g., "America/New_York")',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'undefined (uses user timezone)' }
			}
		},
		showEmployee: {
			control: { type: 'boolean' },
			description: 'Whether to show the employee column in the table',
			table: {
				type: { summary: 'boolean' },
				defaultValue: { summary: 'false' }
			}
		}
	},
	decorators: [
		(Story) => (
			<div style={{ width: '95vw', maxWidth: '1400px' }}>
				<Story />
			</div>
		)
	]
} satisfies Meta<typeof TeamsTimesheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default timesheet with standard configuration.
 * Shows time logs for today without employee column.
 */
export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story: `
The default timesheet displays time logs for the current day.
Data is automatically fetched from the TeamsProvider context with real-time filtering.

**Default Configuration:**
- Date: Today (current date)
- Employee Column: Hidden
- Filters: Date, Source, Log Type
- Pagination: 10 items per page
- Data: Real-time from useTimeLogs hook
- Loading: Automatic overlay when fetching data
			`
			}
		}
	}
};

/**
 * Timesheet with employee column enabled.
 * Shows employee information including avatar and full name for each time log entry.
 */
export const WithEmployeeColumn: Story = {
	args: {
		showEmployee: true
	},
	parameters: {
		docs: {
			description: {
				story: `
Timesheet with employee column visible, ideal for admin users or team managers.
Displays employee avatar and full name for each time log entry.

**Features:**
- Employee column with avatar and name
- Useful for team time tracking
- Admin/manager view
- Multi-employee time log analysis
- Same filtering and pagination capabilities
			`
			}
		}
	}
};

/**
 * Timesheet with custom date range.
 * Demonstrates filtering time logs for a specific date range.
 */
export const CustomDateRange: Story = {
	args: {
		date: {
			from: new Date(new Date().setDate(new Date().getDate() - 7)),
			to: new Date()
		}
	},
	parameters: {
		docs: {
			description: {
				story: `
Timesheet configured with a custom date range (last 7 days).
Shows how to filter time logs for specific time periods.

**Configuration:**
- Date Range: Last 7 days (from 7 days ago to today)
- Allows historical time log analysis
- Useful for weekly reports
- Supports any custom date range via DateRange object
			`
			}
		}
	}
};

/**
 * Timesheet with activity level filtering.
 * Filters time logs based on activity level percentage range.
 */
export const WithActivityLevel: Story = {
	args: {
		activityLevel: {
			start: 50,
			end: 100
		}
	},
	parameters: {
		docs: {
			description: {
				story: `
Timesheet with activity level filtering enabled (50-100%).
Shows only time logs with activity level between 50% and 100%.

**Features:**
- Activity level range filter
- Useful for productivity analysis
- Filter out low-activity time entries
- Identify high-productivity periods
- Range: 0-100% (start and end values)
			`
			}
		}
	}
};

/**
 * Timesheet with custom timezone.
 * Demonstrates timezone-aware time display for global teams.
 */
export const CustomTimezone: Story = {
	args: {
		timeZone: 'America/New_York'
	},
	parameters: {
		docs: {
			description: {
				story: `
Timesheet with custom timezone set to America/New_York (EST/EDT).
All time values are displayed in the specified timezone.

**Features:**
- Custom timezone support
- Useful for global teams
- Accurate time display across regions
- Supports any valid IANA timezone string
- Examples: "America/New_York", "Europe/London", "Asia/Tokyo"
			`
			}
		}
	}
};

/**
 * Timesheet with custom styling.
 * Shows how to apply custom CSS classes for styling customization.
 */
export const CustomStyling: Story = {
	args: {
		className: 'border-2 border-blue-500 shadow-2xl'
	},
	parameters: {
		docs: {
			description: {
				story: `
Timesheet with custom CSS classes applied for visual customization.
Demonstrates the flexibility of the className prop.

**Customization:**
- Custom border styling (blue border)
- Enhanced shadow effect
- Fully customizable via Tailwind CSS classes
- Maintains all functionality
- Can be integrated into any design system
			`
			}
		}
	}
};

/**
 * Complete timesheet configuration.
 * Combines all available features and customization options.
 */
export const CompleteConfiguration: Story = {
	args: {
		showEmployee: true,
		date: {
			from: new Date(new Date().setDate(new Date().getDate() - 30)),
			to: new Date()
		},
		activityLevel: {
			start: 0,
			end: 100
		},
		timeZone: 'UTC',
		className: 'shadow-lg'
	},
	parameters: {
		docs: {
			description: {
				story: `
Comprehensive timesheet configuration showcasing all available features.
Perfect example for understanding the full capabilities of the component.

**Configuration:**
- Employee column enabled
- Date range: Last 30 days
- Activity level: Full range (0-100%)
- Timezone: UTC
- Custom styling applied
- All filters available
- Full pagination support

**Use Case:**
Ideal for comprehensive time tracking reports, auditing, and detailed analysis.
			`
			}
		}
	}
};

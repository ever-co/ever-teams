import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsBasicReport } from '@ever-teams/atoms';

const meta: Meta<typeof TeamsBasicReport> = {
	title: 'Charts & Reports/Reports/Teams Basic Report',
	component: TeamsBasicReport,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
A comprehensive chart-based reporting component that visualizes worked time data for employees and teams.

**Features:**
- Multiple chart types: bar, bar-horizontal, area, pie, line, radar, radial, tooltip
- Real-time data from TeamsProvider context (report data)
- Employee selector for admin users
- Date range picker for custom time periods
- Responsive design with multiple size variants
- Loading states with overlay spinner
- Automatic data transformation and chart configuration
- Theme-aware styling and colors

**Data Source:**
- Gets data from \`useTeamsContext().report\` (transformed chart data)
- Displays worked time by employee in selected date range
- Loading state managed through \`reportLoading\`
- Admin users can view team data, regular users see personal data

**Chart Types:**
- **Bar**: Horizontal bar chart (default)
- **Bar-vertical**: Vertical bar chart
- **Area**: Area chart with filled regions
- **Line**: Line chart for trends
- **Pie**: Circular pie chart
- **Radar**: Radar/spider chart
- **Radial**: Radial progress chart
- **Tooltip**: Interactive tooltip-enhanced chart

**Use Cases:**
- Time tracking dashboards
- Team productivity analytics
- Employee performance reports
- Time allocation visualization
- Billing and invoicing reports
				`
			}
		}
	},
	argTypes: {
		type: {
			control: { type: 'select' },
			options: ['bar', 'bar-horizontal', 'area', 'pie', 'line', 'radar', 'radial', 'tooltip'],
			description: 'Chart type for data visualization',
			defaultValue: 'bar'
		},
		variant: {
			control: { type: 'select' },
			options: ['default', 'bordered'],
			description: 'Visual style variant of the report component',
			defaultValue: 'default'
		},
		size: {
			control: { type: 'select' },
			options: ['default', 'sm', 'lg'],
			description: 'Size variant controlling width and spacing',
			defaultValue: 'default'
		},
		className: {
			control: { type: 'text' },
			description: 'Additional CSS classes for custom styling'
		},
		draggable: {
			control: { type: 'boolean' },
			description: 'Whether the component can be dragged.',
			defaultValue: false
		}
	}
} satisfies Meta<typeof TeamsBasicReport>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default bar chart report showing worked time data.
 * Displays horizontal bars for easy comparison between employees.
 */
export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story: `
The default bar chart report displays worked time data in horizontal bars.
Perfect for comparing time worked between different employees or time periods.

**Default Configuration:**
- Chart Type: Horizontal bar chart
- Size: 700px width, 600px height
- Data: Real-time from report context
- Features: Employee selector, date range picker
			`
			}
		}
	}
};

/**
 * Small size variant with compact dimensions.
 * Reduced width and padding for space-constrained layouts.
 */
export const SmallSize: Story = {
	args: {
		size: 'sm'
	},
	parameters: {
		docs: {
			description: {
				story: `
Compact size variant perfect for dashboards with limited space.
Maintains full functionality while reducing footprint.

**Dimensions:**
- Width: 600px (reduced from 700px)
- Padding: 16px (reduced from 20px)
- Text: Small size
- Same height: 600px
			`
			}
		}
	}
};

/**
 * Large size variant with expanded dimensions.
 * Increased width and padding for prominent display.
 */
export const LargeSize: Story = {
	args: {
		size: 'lg'
	},
	parameters: {
		docs: {
			description: {
				story: `
Large size variant for prominent dashboard placement.
Provides maximum space for detailed data visualization.

**Dimensions:**
- Width: Full width with 1200px minimum
- Padding: 40px horizontal (increased)
- Same height: 600px
- Enhanced visibility
			`
			}
		}
	}
};

/**
 * Bordered variant with visual frame.
 * Adds border styling for enhanced visual separation.
 */
export const BorderedVariant: Story = {
	args: {
		variant: 'bordered'
	},
	parameters: {
		docs: {
			description: {
				story: `
Bordered variant adding visual frame around the report component.
Perfect for layouts requiring clear component separation.

**Features:**
- 2px border with secondary color
- Enhanced visual separation
- Professional appearance
- Maintains all functionality
			`
			}
		}
	}
};

/**
 * Area chart report with filled regions.
 * Shows time trends with smooth curves and filled areas.
 */
export const AreaChartReport: Story = {
	args: {
		type: 'area'
	},
	parameters: {
		docs: {
			description: {
				story: `
Area chart visualization with filled regions showing time trends over periods.
Excellent for visualizing cumulative time data and identifying patterns.

**Features:**
- Smooth area curves
- Filled regions for visual impact
- Trend analysis capabilities
- Time period comparisons
			`
			}
		}
	}
};

/**
 * Interactive tooltip-enhanced chart.
 * Provides detailed information on hover interactions.
 */
export const TooltipChartReport: Story = {
	args: {
		type: 'tooltip'
	},
	parameters: {
		docs: {
			description: {
				story: `
Enhanced chart with interactive tooltips providing detailed information.
Perfect for detailed data exploration and analysis.

**Features:**
- Interactive hover tooltips
- Detailed data on demand
- Enhanced user experience
- Rich information display
			`
			}
		}
	}
};

/**
 * Line chart report for trend analysis.
 * Shows time data as connected points for trend visualization.
 */
export const LineChartReport: Story = {
	args: {
		type: 'line'
	},
	parameters: {
		docs: {
			description: {
				story: `
Line chart visualization perfect for trend analysis and time series data.
Shows clear progression and patterns in worked time over periods.

**Features:**
- Connected data points
- Clear trend visualization
- Time series analysis
- Pattern identification
			`
			}
		}
	}
};

/**
 * Vertical bar chart report.
 * Alternative bar orientation for different layout needs.
 */
export const BarVerticalChartReport: Story = {
	args: {
		type: 'bar-horizontal'
	},
	parameters: {
		docs: {
			description: {
				story: `
Vertical bar chart orientation providing alternative layout for time data.
Useful when horizontal space is limited or for different visual preferences.

**Features:**
- Vertical bar orientation
- Space-efficient layout
- Alternative visualization
- Same data functionality
			`
			}
		}
	}
};

/**
 * Horizontal bar chart report (explicit).
 * Standard horizontal bar chart for time comparison.
 */
export const BarChartReport: Story = {
	args: {
		type: 'bar'
	},
	parameters: {
		docs: {
			description: {
				story: `
Standard horizontal bar chart for clear time data comparison.
The classic visualization for comparing worked time between employees.

**Features:**
- Horizontal bar layout
- Easy comparison
- Standard visualization
- Clear data representation
			`
			}
		}
	}
};

/**
 * Pie chart report for proportional data visualization.
 * Shows time distribution as circular segments.
 */
export const PieChartReport: Story = {
	args: {
		type: 'pie'
	},
	parameters: {
		docs: {
			description: {
				story: `
Pie chart visualization showing time distribution as proportional segments.
Perfect for understanding relative time allocation between employees.

**Features:**
- Circular segment layout
- Proportional representation
- Visual impact
- Easy percentage comparison

**Note:** Currently under development - shows placeholder message.
			`
			}
		}
	}
};

/**
 * Radar chart report for multi-dimensional analysis.
 * Shows time data across multiple dimensions in a spider web format.
 */
export const RadarChartReport: Story = {
	args: {
		type: 'radar'
	},
	parameters: {
		docs: {
			description: {
				story: `
Radar chart visualization displaying time data across multiple dimensions.
Excellent for comparing performance across different metrics simultaneously.

**Features:**
- Multi-dimensional analysis
- Spider web layout
- Performance comparison
- Pattern recognition
			`
			}
		}
	}
};

/**
 * Radial chart report for circular progress visualization.
 * Shows time data in a radial progress format.
 */
export const RadialChartReport: Story = {
	args: {
		type: 'radial'
	},
	parameters: {
		docs: {
			description: {
				story: `
Radial chart visualization showing time data in circular progress format.
Perfect for displaying completion rates and progress indicators.

**Features:**
- Circular progress layout
- Visual progress indication
- Completion tracking
- Modern design aesthetic
			`
			}
		}
	}
};

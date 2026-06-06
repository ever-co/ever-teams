import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsChart } from '@ever-teams/atoms';

/**
 * TeamsChart is a versatile chart component that provides multiple visualization types for time tracking data.
 *
 * ## Features
 *
 * - **Multiple Chart Types**: Supports bar, area, line, pie, radar, radial, and tooltip charts
 * - **Data Integration**: Automatically fetches data from TeamsProvider context
 * - **Loading States**: Shows loading overlay during data fetching
 * - **Theme Integration**: Seamless integration with Teams theme system
 * - **Responsive Design**: Adapts to different screen sizes and containers
 * - **Interactive Elements**: Hover effects and tooltips for data exploration
 * - **Internationalization**: Full i18n support for labels and formatting
 *
 * ## Chart Types
 *
 * - **Bar Chart**: Horizontal bar visualization for comparing values
 * - **Bar Vertical**: Vertical bar chart for traditional column display
 * - **Area Chart**: Filled area visualization for trend analysis
 * - **Line Chart**: Line visualization for time series data
 * - **Pie Chart**: Circular chart for proportional data display
 * - **Radar Chart**: Multi-dimensional spider chart for complex comparisons
 * - **Radial Chart**: Circular progress-style visualization
 * - **Tooltip Chart**: Interactive chart with enhanced tooltip information
 *
 * ## Data Source
 *
 * The component gets its data from the `useTeamsContext()` hook, which provides:
 * - Report data from `report` state
 * - Loading states from `loadings.reportLoading`
 * - Theme configuration from `appliedTheme`
 * - Configuration settings from `config`
 *
 * ## Use Cases
 *
 * - **Time Tracking Dashboards**: Visualizing worked hours and productivity metrics
 * - **Project Analytics**: Comparing time spent across different projects
 * - **Team Performance**: Analyzing team productivity and time allocation
 * - **Trend Analysis**: Identifying patterns in time tracking data over periods
 * - **Resource Planning**: Understanding time distribution for better planning
 */
const meta: Meta<typeof TeamsChart> = {
	title: 'Charts & Reports/Charts/Teams Chart',
	component: TeamsChart,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsChart is a comprehensive chart component that provides multiple visualization types for time tracking and productivity data. It integrates seamlessly with the TeamsProvider context to display real-time data with professional styling and interactive features.

### Key Capabilities

- **8 Chart Types**: bar, bar-horizontal, area, line, pie, radar, radial, and tooltip charts for diverse visualization needs
- **Context Integration**: Automatically retrieves data from TeamsProvider context with real-time updates
- **Loading Management**: Built-in loading states with overlay spinner during data fetching
- **Theme Compatibility**: Seamless integration with Teams theme system for consistent styling
- **Responsive Design**: Minimum width of 400px with flexible container adaptation
- **Interactive Features**: Hover effects, tooltips, and data exploration capabilities

### Data Flow

The component uses the \`useTeamsContext()\` hook to access:
- \`report\` - Chart data transformed using the \`transformData()\` utility
- \`reportLoading\` - Loading state for displaying spinner overlay
- \`appliedTheme\` - Current theme configuration for styling
- \`config\` - Component configuration settings

### Chart Type Selection

Each chart type is optimized for specific data visualization scenarios:
- **Bar/Bar-Vertical**: Ideal for comparing discrete values and categories
- **Area/Line**: Perfect for time series data and trend analysis
- **Pie**: Best for showing proportional relationships and percentages
- **Radar**: Excellent for multi-dimensional comparisons and performance metrics
- **Radial**: Great for progress indicators and goal tracking
- **Tooltip**: Enhanced interactivity for detailed data exploration

### Technical Implementation

The component renders different chart types based on the \`type\` prop, with each chart receiving transformed data and theme configuration. Loading states are managed through the SpinOverlayLoader component for consistent user experience.
				`
			}
		}
	},
	argTypes: {
		type: {
			control: 'select',
			options: ['bar', 'bar-horizontal', 'area', 'pie', 'line', 'radar', 'radial', 'tooltip'],
			description: 'The type of chart to display',
			table: {
				type: { summary: 'ChartType' },
				defaultValue: { summary: 'bar' }
			}
		},
		className: {
			control: 'text',
			description: 'Additional CSS classes to apply to the chart container',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'undefined' }
			}
		}
	}
} satisfies Meta<typeof TeamsChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default bar chart visualization showing horizontal bars for data comparison.
 * Ideal for comparing values across different categories or time periods.
 */
export const Default: Story = {
	args: {
		type: 'bar'
	},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsChart component with horizontal bar visualization. Perfect for comparing discrete values and showing data relationships in a clear, easy-to-read format.'
			}
		}
	}
};

/**
 * Vertical bar chart with traditional column display format.
 * Excellent for time series data and categorical comparisons.
 */
export const BarVertical: Story = {
	args: {
		type: 'bar-horizontal'
	},
	parameters: {
		docs: {
			description: {
				story: 'Vertical bar chart (column chart) visualization ideal for displaying time series data and comparing values across categories with traditional column format.'
			}
		}
	}
};

/**
 * Area chart with filled regions for trend analysis and cumulative data.
 * Perfect for showing data trends over time with visual emphasis.
 */
export const AreaChart: Story = {
	args: {
		type: 'area'
	},
	parameters: {
		docs: {
			description: {
				story: 'Area chart visualization with filled regions, perfect for trend analysis and showing cumulative data over time periods with visual emphasis on data volume.'
			}
		}
	}
};

/**
 * Line chart for clean trend visualization and time series analysis.
 * Ideal for showing data changes and patterns over time.
 */
export const LineChart: Story = {
	args: {
		type: 'line'
	},
	parameters: {
		docs: {
			description: {
				story: 'Clean line chart visualization ideal for time series analysis and trend identification. Shows data changes over time with clear, minimal visual design.'
			}
		}
	}
};

/**
 * Pie chart for proportional data display and percentage visualization.
 * Perfect for showing parts of a whole and data distribution.
 */
export const PieChart: Story = {
	args: {
		type: 'pie'
	},
	parameters: {
		docs: {
			description: {
				story: 'Pie chart visualization for displaying proportional data and percentages. Ideal for showing how different categories contribute to the total dataset.'
			}
		}
	}
};

/**
 * Radar chart for multi-dimensional data comparison and performance metrics.
 * Excellent for comparing multiple variables across different entities.
 */
export const RadarChart: Story = {
	args: {
		type: 'radar'
	},
	parameters: {
		docs: {
			description: {
				story: 'Multi-dimensional radar (spider) chart for comparing multiple variables simultaneously. Perfect for performance metrics and multi-criteria analysis.'
			}
		}
	}
};

/**
 * Radial chart for circular progress visualization and goal tracking.
 * Great for showing completion percentages and progress indicators.
 */
export const RadialChart: Story = {
	args: {
		type: 'radial'
	},
	parameters: {
		docs: {
			description: {
				story: 'Circular radial chart visualization ideal for progress indicators, goal tracking, and completion percentages with modern, clean design.'
			}
		}
	}
};

/**
 * Enhanced tooltip chart with interactive data exploration features.
 * Provides detailed information on hover for comprehensive data analysis.
 */
export const TooltipChart: Story = {
	args: {
		type: 'tooltip'
	},
	parameters: {
		docs: {
			description: {
				story: 'Interactive chart with enhanced tooltip functionality for detailed data exploration. Provides comprehensive information on hover for in-depth analysis.'
			}
		}
	}
};

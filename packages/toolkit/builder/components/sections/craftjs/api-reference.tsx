import { CodeBlock } from '../../ui/CodeBlock';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ever-teams/toolkit-ui';

export const ApiReference = () => (
	<div className="mb-32">
		<h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-slate-100">API Reference</h2>

		<Tabs defaultValue="timer" className="w-full">
			<TabsList className="mb-6">
				<TabsTrigger value="timer">Timer Components</TabsTrigger>
				<TabsTrigger value="charts">Charts</TabsTrigger>
				<TabsTrigger value="settings">Settings Panel</TabsTrigger>
			</TabsList>

			<TabsContent value="timer">
				<div className="space-y-12">
					<div>
						<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Modern Timer</h3>
						<p className="text-slate-600 dark:text-slate-400 mb-4">
							Configuration options for the Modern Timer component in Craft.js.
						</p>
						<CodeBlock
							language="typescript"
							code={`// Modern Timer Component Configuration
const ModernTimer = {
  displayName: 'Modern Timer',
  props: {
    variant: {
      type: 'select',
      options: ['default', 'bordered'],
      defaultValue: 'default'
    },
    size: {
      type: 'select',
      options: ['default', 'sm'],
      defaultValue: 'default'
    },
    expandable: {
      type: 'boolean',
      defaultValue: true
    },
    showProgress: {
      type: 'boolean',
      defaultValue: false
    },
    onStart: {
      type: 'event'
    },
    onPause: {
      type: 'event'
    },
    onComplete: {
      type: 'event'
    }
  }
};

ModernTimer.craft = {
  related: {
    settings: TimerSettings
  }
};`}
						/>
					</div>
				</div>
			</TabsContent>

			<TabsContent value="charts">
				<div className="space-y-12">
					<div>
						<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
							Analytics Charts
						</h3>
						<p className="text-slate-600 dark:text-slate-400 mb-4">
							Configuration for analytics chart components in Craft.js.
						</p>
						<CodeBlock
							language="typescript"
							code={`// Chart Component Configuration
const LineChart = {
  displayName: 'Line Chart',
  props: {
    data: {
      type: 'array',
      defaultValue: []
    },
    title: {
      type: 'string',
      defaultValue: 'Time Tracking'
    },
    height: {
      type: 'number',
      defaultValue: 300
    },
    showLegend: {
      type: 'boolean',
      defaultValue: true
    }
  }
};

LineChart.craft = {
  related: {
    settings: ChartSettings
  }
};`}
						/>
					</div>
				</div>
			</TabsContent>

			<TabsContent value="settings">
				<div className="space-y-12">
					<div>
						<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
							Settings Panel API
						</h3>
						<p className="text-slate-600 dark:text-slate-400 mb-4">
							API reference for creating custom settings panels in Craft.js.
						</p>
						<CodeBlock
							language="typescript"
							code={`import { useNode } from '@craftjs/core';

const CustomSettings = () => {
  const {
    actions: { setProp },
    propName,
    nodeName
  } = useNode((node) => ({
    propName: node.data.props.name,
    nodeName: node.data.displayName
  }));

  return (
    <div className="settings-panel">
      {/* Your settings UI */}
    </div>
  );
};

// Register settings panel
YourComponent.craft = {
  related: {
    settings: CustomSettings
  }
};`}
						/>
					</div>
				</div>
			</TabsContent>
		</Tabs>
	</div>
);

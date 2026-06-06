import { CodeBlock } from '../../ui/CodeBlock';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ever-teams/toolkit-ui';

export const ApiReference = () => (
	<div className="mb-32">
		<h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-slate-100">API Reference</h2>

		<Tabs defaultValue="timer" className="w-full">
			<TabsList className="mb-6">
				<TabsTrigger value="timer">Timer Components</TabsTrigger>
				<TabsTrigger value="charts">Charts</TabsTrigger>
				<TabsTrigger value="hooks">Custom Hooks</TabsTrigger>
			</TabsList>

			<TabsContent value="timer">
				<div className="space-y-12">
					<div>
						<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Modern Timer</h3>
						<p className="text-slate-600 dark:text-slate-400 mb-4">
							Configuration options for the Modern Timer component in GrapesJS.
						</p>
						<CodeBlock
							language="typescript"
							code={`// Modern Timer Component Registration
editor.DomComponents.addType('modern-timer', {
  model: {
    defaults: {
      tagName: 'div',
      droppable: true,
      traits: [
        {
          type: 'select',
          name: 'variant',
          label: 'Variant',
          options: [
            { value: 'default', name: 'Default' },
            { value: 'bordered', name: 'Bordered' }
          ]
        },
        {
          type: 'select',
          name: 'size',
          label: 'Size',
          options: [
            { value: 'default', name: 'Default' },
            { value: 'sm', name: 'Small' }
          ]
        },
        {
          type: 'checkbox',
          name: 'expandable',
          label: 'Expandable'
        },
        {
          type: 'checkbox',
          name: 'showProgress',
          label: 'Show Progress'
        }
      ]
    }
  }
});`}
						/>
					</div>
				</div>
			</TabsContent>

			<TabsContent value="charts">
				<div className="space-y-12">
					<div>
						<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Line Chart</h3>
						<p className="text-slate-600 dark:text-slate-400 mb-4">
							Configuration for the Line Chart component in GrapesJS.
						</p>
						<CodeBlock
							language="typescript"
							code={`// Line Chart Component Registration
editor.DomComponents.addType('basic-line-chart', {
  model: {
    defaults: {
      tagName: 'div',
      droppable: false,
      traits: [
        {
          type: 'text',
          name: 'title',
          label: 'Chart Title'
        },
        {
          type: 'number',
          name: 'height',
          label: 'Height',
          default: 300
        },
        {
          type: 'json',
          name: 'data',
          label: 'Chart Data',
          default: [
            { label: 'Mon', value: 5 },
            { label: 'Tue', value: 8 },
            { label: 'Wed', value: 12 }
          ]
        }
      ]
    }
  }
});`}
						/>
					</div>
				</div>
			</TabsContent>

			<TabsContent value="hooks">
				<div className="space-y-12">
					<div>
						<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
							useGrapesJS Hook
						</h3>
						<p className="text-slate-600 dark:text-slate-400 mb-4">
							Core hook for initializing and configuring GrapesJS with Teams components.
						</p>
						<CodeBlock
							language="typescript"
							code={`interface UseGrapesJSOptions {
  containerId: string;
  blockComponents?: Array<{
    id: string;
    label: string;
    content: string;
    category: string;
    image?: string;
  }>;
  config?: {
    canvas?: {
      styles?: string[];
    };
    plugins?: string[];
  };
}

function useGrapesJS({
  containerId,
  blockComponents = [],
  config = {}
}: UseGrapesJSOptions) {
  // Hook implementation
  return {
    editor,
    blocks,
    components
  };
}`}
						/>
					</div>
				</div>
			</TabsContent>
		</Tabs>
	</div>
);

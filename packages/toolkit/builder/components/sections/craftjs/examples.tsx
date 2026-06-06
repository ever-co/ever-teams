import { CodeBlock } from '../../ui/CodeBlock';
import { TeamsModernTimer } from '@ever-teams/atoms';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ever-teams/toolkit-ui';
import { CtaButton } from '../../ui/CTAButton';
import { ComponentExample } from '../../ui/ComponentExample';

export const Examples = () => {
	const timerVariants = [
		{
			id: 'default',
			title: 'Default Timer',
			description:
				'A clean, minimal timer component with a modern design. Perfect for applications requiring a straightforward countdown display without additional visual elements. Supports basic timer functionality with start, pause, and reset controls.',
			code: `import { TeamsModernTimer } from '@ever-teams/atoms';

  <TeamsModernTimer
    variant="default"
    size="default"
    expandable={true}
    showProgress={false}
  />`,
			component: <TeamsModernTimer variant="default" size="default" expandable={true} showProgress={false} />
		},
		{
			id: 'bordered',
			title: 'Border Timer',
			description:
				"Enhanced visibility with a subtle border outline. Ideal for interfaces where the timer needs to stand out from the background while maintaining a professional appearance. The border helps define the component's boundaries clearly.",
			code: `import { TeamsModernTimer } from '@ever-teams/atoms';

  <TeamsModernTimer
    variant="bordered"
    expandable={true}
    showProgress={false}
  />`,
			component: <TeamsModernTimer variant="bordered" expandable={true} showProgress={false} />
		},
		{
			id: 'expandable',
			title: 'Expandable Timer',
			description:
				'A timer with the ability to expand and show additional controls and information. Suitable for applications where timer manipulation is a primary function. Users can expand/collapse the form with project/task selectors.',
			code: `import { TeamsModernTimer } from '@ever-teams/atoms';

  <TeamsModernTimer
    variant="default"
    size="sm"
    expandable={true}
    showProgress={false}
  />`,
			component: <TeamsModernTimer variant="default" size="default" expandable={true} showProgress={false} />
		}
	];

	return (
		<div className="mb-32">
			<h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-slate-100">Examples</h2>

			<div className="mb-8">
				<Tabs defaultValue="components" className="w-full">
					<TabsList className="mb-6">
						<TabsTrigger value="components">Components</TabsTrigger>
						<TabsTrigger value="hooks">Custom Hooks</TabsTrigger>
					</TabsList>

					<TabsContent value="components">
						<div className="space-y-12">
							<div className="prose dark:prose-invert max-w-none mb-8">
								<p className="text-lg text-slate-600 dark:text-slate-400">
									Explore how to integrate and customize Teams components within CraftJS. Each
									component can be easily configured through the CraftJS traits panel.
								</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
								{timerVariants.map((variant) => (
									<ComponentExample
										key={variant.id}
										title={variant.title}
										description={variant.description}
										code={variant.code}
									>
										{variant.component}
									</ComponentExample>
								))}
							</div>
						</div>
					</TabsContent>

					<TabsContent value="hooks">
						<div>
							<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
								Custom Hook Integration
							</h3>
							<CodeBlock
								language="typescript"
								code={`import { useCraftJS } from './hooks';
import { useModernTimer, useLineChart } from './components';

export default function Editor() {
  const { editor } = useCraftJS({
    containerId: 'gjs',
    blockComponents: [
      {
        id: 'modern-timer',
        label: 'Modern Timer',
        content: '<div data-gjs-type="modern-timer"></div>',
        category: 'Timer'
      },
      {
        id: 'line-chart',
        label: 'Line Chart',
        content: '<div data-gjs-type="basic-line-chart"></div>',
        category: 'Charts'
      }
    ]
  });

  // Register components using hooks
  useModernTimer({ editor });
  useLineChart({ editor });

  return <div id="gjs" className="h-screen" />;
}`}
							/>
						</div>
					</TabsContent>
				</Tabs>
			</div>

			<div className="mt-24 text-center">
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
					Ready to Build with CraftJS?
				</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
					Start creating custom time tracking interfaces with CraftJS&apos;s visual editor and Teams&apos;s
					components.
				</p>
				<CtaButton href="/craft" className="mx-auto">
					Try Teams on CraftJS
				</CtaButton>
			</div>
		</div>
	);
};

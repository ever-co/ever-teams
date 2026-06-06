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
				<Tabs defaultValue="timer" className="w-full">
					<TabsList className="mb-6">
						<TabsTrigger value="timer">Timer Components</TabsTrigger>
						<TabsTrigger value="auth">Authentication</TabsTrigger>
					</TabsList>

					<TabsContent value="timer">
						<div className="space-y-12">
							<div className="prose dark:prose-invert max-w-none mb-8">
								<p className="text-lg text-slate-600 dark:text-slate-400">
									Explore different variants of our Modern Timer component. Each variant is designed
									for specific use cases and can be customized further.
								</p>
							</div>

							{/* <div className="flex items-center justify-between mb-8">
                <div className="flex flex-wrap gap-4">
                  {timerVariants.map(variant => (
                    <a
                      key={variant.id}
                      href={`#${variant.id}-timer`}
                      className="px-4 py-2 text-sm rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      {variant.title}
                    </a>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Toggle theme:</span>
                  <TeamsThemeToggle />
                </div>
              </div> */}

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

					<TabsContent value="auth">
						<div>
							<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
								Authentication Integration
							</h3>
							<CodeBlock
								language="typescript"
								code={`import { TeamsLoginForm } from '@ever-teams/atoms';

export default function AuthExample() {
  return (
    <TeamsLoginForm
      source="storybook"
      className="custom-auth-form"
    />
  );
}`}
							/>
						</div>
					</TabsContent>
				</Tabs>
			</div>

			<div className="mt-24 text-center">
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
					Ready to Build Your Custom Timer?
				</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
					Jump into Plasmic&apos;s visual builder and start customizing Teams components for your specific
					needs. No coding required.
				</p>
				<CtaButton href="/plasmic/plasmic-host" className="mx-auto">
					Try Teams on Plasmic Now
				</CtaButton>
			</div>
		</div>
	);
};

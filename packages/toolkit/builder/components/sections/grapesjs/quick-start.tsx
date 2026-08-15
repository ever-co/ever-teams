import { CodeBlock } from '../../ui/CodeBlock';

export const QuickStart = () => (
	<div className="mb-32">
		<h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-slate-100">Quick Start</h2>
		<div className="space-y-8">
			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
					1. Install Dependencies
				</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-4">
					First, install the required packages for GrapesJS integration with Teams components.
				</p>
				<CodeBlock
					language="bash"
					code="npm install @ever-teams/atoms grapesjs grapesjs-preset-webpage grapesjs-tailwind"
				/>
			</div>

			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
					2. Setup GrapesJS Editor
				</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-4">
					Initialize GrapesJS with Teams components and configure the editor.
				</p>
				<CodeBlock
					language="typescript"
					code={`import { useEffect } from 'react';
import grapesjs from 'grapesjs';
import { TeamsProvider, TeamsModernTimer, TeamsProgress } from '@ever-teams/atoms';

export default function Editor() {
  useEffect(() => {
    const editor = grapesjs.init({
      container: '#gjs',
      plugins: ['grapesjs-preset-webpage', 'grapesjs-tailwind'],
      canvas: {
        styles: ['@ever-teams/atoms/styles.css']
      }
    });

    // Register Teams components
    editor.DomComponents.addType('modern-timer', {
      model: {
        defaults: {
          tagName: 'div',
          draggable: true,
          droppable: true,
          traits: [
            {
              type: 'checkbox',
              name: 'showProgress',
              label: 'Show Progress'
            }
          ]
        }
      }
    });
  }, []);

  return <div id="gjs" />;
}`}
				/>
			</div>

			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
					3. Add Component Blocks
				</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-4">
					Define blocks for your Teams components in the GrapesJS editor.
				</p>
				<CodeBlock
					language="typescript"
					code={`const blockComponents = [
  {
    id: 'modern-timer',
    label: 'Modern Timer',
    content: '<div data-gjs-type="modern-timer"></div>',
    category: 'Teams Components'
  },
  {
    id: 'progress-timer',
    label: 'Progress Timer',
    content: '<div data-gjs-type="progress-timer"></div>',
    category: 'Teams Components'
  }
];

editor.BlockManager.add(blockComponents);`}
				/>
			</div>
		</div>
	</div>
);

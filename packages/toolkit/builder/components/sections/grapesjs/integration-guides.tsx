import { CodeBlock } from "../../ui/CodeBlock";

export const IntegrationGuides = () => (
  <div className="mb-32">
    <h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-slate-100">Integration Guides</h2>
    <div className="space-y-12">
      <div>
        <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Basic Integration</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          The simplest way to integrate Teams components with GrapesJS is through component registration and hooks.
        </p>
        <CodeBlock
          language="typescript"
          code={`import { useGrapesjs } from './hooks';
import { useModernTimer, useProgressCircle } from './components';

const BLOCK_COMPONENTS = [
  {
    id: 'modern-timer',
    label: 'Modern Timer',
    content: '<div data-gjs-type="modern-timer"></div>',
    category: 'Timer',
    image: '/img/timer.png'
  },
  {
    id: 'progress-circle',
    label: 'Progress Circle',
    content: '<div data-gjs-type="progress-circle"></div>',
    category: 'Progress',
    image: '/img/progress.png'
  }
];

export default function Editor() {
  const { editor } = useGrapesjs({ 
    containerId: 'gjs',
    blockComponents: BLOCK_COMPONENTS 
  });

  // Register components using hooks
  useModernTimer({ editor });
  useProgressCircle({ editor });

  return (
    <div id="gjs" className="h-screen" />
  );
}`}
        />
      </div>

      <div>
        <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Custom Theme Integration</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Customize the look and feel by configuring Teams&apos;s theme options within GrapesJS.
        </p>
        <CodeBlock
          language="typescript"
          code={`import { TeamsThemeProvider } from '@ever-teams/atoms';
import { useGrapesjs } from './hooks';

function Editor() {
  const { editor } = useGrapesjs({
    containerId: 'gjs',
    config: {
      canvas: {
        styles: [
          'https://cdn.jsdelivr.net/npm/@ever-teams/atoms/dist/styles.css'
        ]
      }
    }
  });

  return (
    <TeamsThemeProvider 
      theme={{
        colors: {
          primary: '#FF1CF7',
          secondary: '#00F0FF'
        }
      }}
    >
      <div id="gjs" className="h-screen" />
    </TeamsThemeProvider>
  );
}`}
        />
      </div>

      <div>
        <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Component Event Handling</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Handle component events and state changes in your GrapesJS editor.
        </p>
        <CodeBlock
          language="typescript"
          code={`import { useModernTimer } from './components';

export const useModernTimer = ({ editor }) => {
  editor.DomComponents.addType('modern-timer', {
    model: {
      defaults: {
        traits: [
          {
            type: 'checkbox',
            name: 'showProgress',
            label: 'Show Progress'
          },
          {
            type: 'select',
            name: 'variant',
            label: 'Variant',
            options: [
              { value: 'default', name: 'Default' },
              { value: 'bordered', name: 'Bordered' }
            ]
          }
        ],
        script: function() {
          const component = this;
          component.addEventListener('start', () => {
            // Handle timer start
          });
          component.addEventListener('pause', () => {
            // Handle timer pause
          });
          component.addEventListener('complete', () => {
            // Handle timer complete
          });
        }
      }
    }
  });
};`}
        />
      </div>
    </div>
  </div>
);
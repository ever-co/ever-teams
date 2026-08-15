'use client';

import {
  TeamsBasicTimer
} from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function ButtonVariants() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      <ComponentExample
        title="Default with Button"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer icon progress />`}
      >
        <TeamsBasicTimer icon progress />
      </ComponentExample>

      <ComponentExample
        title="Border with Button"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer border="thick" icon progress />`}
      >
        <TeamsBasicTimer border="thick" icon progress />
      </ComponentExample>

      <ComponentExample
        title="Border Rounded with Button"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer border="thick" icon progress rounded="small" />`}
      >
        <TeamsBasicTimer border="thick" icon progress rounded="small" />
      </ComponentExample>

      <ComponentExample
        title="Border Full Rounded with Button"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer border="thick" icon progress rounded="large" />`}
      >
        <TeamsBasicTimer border="thick" icon progress rounded="large" />
      </ComponentExample>

      <ComponentExample
        title="Gray with Button"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="secondary" icon progress />`}
      >
        <TeamsBasicTimer background="secondary" icon progress />
      </ComponentExample>

      <ComponentExample
        title="Gray Rounded with Button"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="secondary" icon progress rounded="small" />`}
      >
        <TeamsBasicTimer background="secondary" icon progress rounded="small" />
      </ComponentExample>

      <ComponentExample
        title="Gray Full Rounded with Button"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="secondary" icon progress rounded="large" />`}
      >
        <TeamsBasicTimer background="secondary" icon progress rounded="large" />
      </ComponentExample>

      <ComponentExample
        title="Contained with Button"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="primary" color="destructive" icon progress />`}
      >
        <TeamsBasicTimer background="primary" color="destructive" icon progress />
      </ComponentExample>

      <ComponentExample
        title="Contained Rounded with Button"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="primary" color="destructive" icon progress rounded="small" />`}
      >
        <TeamsBasicTimer background="primary" color="destructive" icon progress rounded="small" />
      </ComponentExample>

      <ComponentExample
        title="Contained Full Rounded with Button"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="primary" color="destructive" icon progress rounded="large" />`}
      >
        <TeamsBasicTimer background="primary" color="destructive" icon progress rounded="large" />
      </ComponentExample>
    </div>
  );
}
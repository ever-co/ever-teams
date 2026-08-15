'use client';

import {
  TeamsBasicTimer
} from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function IconVariants() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      <ComponentExample
        title="Default with Icon"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer icon readonly />`}
      >
        <TeamsBasicTimer icon readonly />
      </ComponentExample>

      <ComponentExample
        title="Border with Icon"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer border="thick" icon readonly />`}
      >
        <TeamsBasicTimer border="thick" icon readonly />
      </ComponentExample>

      <ComponentExample
        title="Border Rounded with Icon"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer border="thick" icon readonly rounded="small" />`}
      >
        <TeamsBasicTimer border="thick" icon readonly rounded="small" />
      </ComponentExample>

      <ComponentExample
        title="Border Full Rounded with Icon"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer border="thick" icon readonly rounded="large" />`}
      >
        <TeamsBasicTimer border="thick" icon readonly rounded="large" />
      </ComponentExample>

      <ComponentExample
        title="Gray with Icon"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="secondary" icon readonly />`}
      >
        <TeamsBasicTimer background="secondary" icon readonly />
      </ComponentExample>

      <ComponentExample
        title="Gray Rounded with Icon"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="secondary" icon readonly rounded="small" />`}
      >
        <TeamsBasicTimer background="secondary" icon readonly rounded="small" />
      </ComponentExample>

      <ComponentExample
        title="Gray Full Rounded with Icon"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="secondary" icon readonly rounded="large" />`}
      >
        <TeamsBasicTimer background="secondary" icon readonly rounded="large" />
      </ComponentExample>

      <ComponentExample
        title="Contained with Icon"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="primary" color="destructive" icon readonly />`}
      >
        <TeamsBasicTimer background="primary" color="destructive" icon readonly />
      </ComponentExample>

      <ComponentExample
        title="Contained Rounded with Icon"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="primary" color="destructive" icon readonly rounded="small" />`}
      >
        <TeamsBasicTimer background="primary" color="destructive" icon readonly rounded="small" />
      </ComponentExample>

      <ComponentExample
        title="Contained Full Rounded with Icon"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="primary" color="destructive" icon readonly rounded="large" />`}
      >
        <TeamsBasicTimer background="primary" color="destructive" icon readonly rounded="large" />
      </ComponentExample>
    </div>
  );
}
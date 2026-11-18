# Ever Teams timer in an Angular app

A standalone root component that holds `<ever-teams-timer>`, binds its `api-url` and `color-scheme`, and switches the
scheme with a checkbox. Angular's application builder (`@angular/build`) builds it, with TypeScript's `strict` and
Angular's `strictTemplates`.

## Run it

`@ever-teams/embed` is not on npm yet: `package.json` takes it from this repository (`"@ever-teams/embed": "file:../.."`,
the package's folder), whose entry is the built `dist/ever-teams-embed.js`. Build the element first:

```bash
# from packages/toolkit/embed, after the @ever-teams/atoms build
yarn build

cd examples/angular
npm install
npm start          # http://localhost:4200
npm run build      # writes dist/timer/browser/
```

Once the package is on npm, replace `file:../..` with its version. Point `apiUrl` in `src/app/app.ts` at your own
server, ending in `/api`.

## What the component does

- `schemas: [CUSTOM_ELEMENTS_SCHEMA]` lets its template hold a tag Angular does not know.
- `[attr.api-url]` and `[attr.color-scheme]` set attributes, which the element reads. `[color-scheme]="..."` or
  `color-scheme="{{ ... }}"` would set a property of that name, which the element ignores.
- `afterNextRender(() => import('@ever-teams/embed'))` loads the element in the browser only: a server that renders the
  component (Angular's server rendering) has no `HTMLElement` for the element to extend. The element's code also stays
  out of the app's first bundle.
- The element dispatches no events, so the component listens to none.

The package's types come with it: the import compiles under `strict`, and a template reference such as `#timer` gets
the element's type. Angular's template checker does not check the values given to attributes, on any element.

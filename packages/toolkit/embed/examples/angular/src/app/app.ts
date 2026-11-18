import { afterNextRender, Component, computed, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';

type ColorScheme = 'light' | 'dark';

@Component({
	selector: 'app-root',
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	template: `
		<label><input type="checkbox" [checked]="dark()" (change)="toggleScheme()" /> Dark timer</label>
		<ever-teams-timer [attr.api-url]="apiUrl" [attr.color-scheme]="colorScheme()"></ever-teams-timer>
	`
})
export class App {
	// The Ever Teams API address, ending in /api.
	protected readonly apiUrl = 'https://api.ever.team/api';
	protected readonly dark = signal(false);
	protected readonly colorScheme = computed<ColorScheme>(() => {
		if (this.dark()) {
			return 'dark';
		}
		return 'light';
	});

	constructor() {
		// In the browser only: a server that renders this component has no HTMLElement for the element to extend.
		afterNextRender(() => import('@ever-teams/embed'));
	}

	protected toggleScheme() {
		this.dark.update((dark) => !dark);
	}
}

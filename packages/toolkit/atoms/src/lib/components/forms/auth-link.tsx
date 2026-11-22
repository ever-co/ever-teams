// A .tsx module: the kit's stylesheet build reads its classes from the .tsx files only (tailwind.config.js).
import { cn } from '@ever-teams/toolkit-ui';

// The links of the sign-in and registration forms: the theme's primary, lighter in dark mode to stay readable there.
export const AUTH_LINK =
	'cursor-pointer font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none dark:text-primary-xlight';
// The same link on a button, for the switch between the two forms.
export const AUTH_LINK_BUTTON = cn('border-none bg-transparent p-0 font-inherit', AUTH_LINK);

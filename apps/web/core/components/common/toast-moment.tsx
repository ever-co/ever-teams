'use client';

import type { ReactNode } from 'react';
import { type ExternalToast, toast } from 'sonner';

type MomentOptions = Omit<ExternalToast, 'description'> & { description?: ReactNode };

/** A milestone stays a little longer than an ordinary confirmation. */
const MOMENT_DURATION_MS = 6000;

function MomentBody({ description, glyph }: Readonly<{ description?: ReactNode; glyph: ReactNode }>) {
	return (
		<>
			{description}
			<span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
				<span className="absolute -bottom-5 right-5 size-20 -rotate-6 text-(--toast-tone) opacity-[0.14] dark:opacity-[0.18] [&_svg]:size-full [&_svg]:stroke-[1.25]">
					{glyph}
				</span>
			</span>
		</>
	);
}

/**
 * The success toast of a milestone (an invitation sent, a team, a project or a plan created): the usual card with a
 * large glyph of the moment cropped in its lower corner, in the tone's hue. Kept for moments, never for routine saves.
 */
export function toastMoment(title: string, glyph: ReactNode, options: MomentOptions = {}) {
	const { description, ...rest } = options;

	return toast.success(title, {
		duration: MOMENT_DURATION_MS,
		...rest,
		description: <MomentBody description={description} glyph={glyph} />
	});
}

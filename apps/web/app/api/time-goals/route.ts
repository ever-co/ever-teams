import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twins of the platform's `/time-goals` (GET, POST; ever-co/ever-gauzy#11918). The platform decides who
 * reads and sets which goal (a member their own, a team manager those of their members and of their team), and
 * answers its own refusal.
 */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/time-goals');
}

export async function POST(req: Request) {
	return forwardToGauzy(req, '/time-goals');
}

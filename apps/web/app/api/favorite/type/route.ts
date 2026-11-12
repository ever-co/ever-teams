import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getFavoriteDetailsRequest } from '@/core/services/server/requests/favorite';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { NextResponse } from 'next/server';

/** The kinds the app reads through `/favorite/type`: tasks of every team (#5017). Pages never go this way. */
const READABLE_KINDS: ReadonlySet<string> = new Set([EBaseEntityEnum.Task]);

/** The proxy-mode twin of Gauzy's `GET /favorite/type`: the person's favourite tasks themselves. */
export async function GET(req: Request) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	// The guard's own status: 401 for a refused session, 503 when Gauzy could not answer (no logout then)
	if (!user) return $res('Unauthorized');

	const search = new URL(req.url).searchParams;
	if (!READABLE_KINDS.has(search.get('where[entity]') ?? '')) {
		return NextResponse.json({ error: 'Only favourite tasks are read here' }, { status: 400 });
	}

	const { data } = await getFavoriteDetailsRequest({
		query: search.toString(),
		bearer_token: access_token,
		tenantId
	});

	return $res(data);
}

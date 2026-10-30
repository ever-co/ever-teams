import { GAUZY_API_SERVER_ORIGIN } from '@/core/constants/config/constants';
import { proxyGauzyImage } from '@/core/lib/helpers/proxy-gauzy-image';
import { NextResponse } from 'next/server';

/**
 * Streams a Gauzy placeholder PNG (`GET /api/placeholder/:size/:background?text=`) through this app.
 *
 * A deployment that publishes no API origin to the browser (NEXT_PUBLIC_GAUZY_API_SERVER_URL unset) has
 * no URL the browser can load Gauzy's placeholder from, so getPlaceholderImageUrl() points at this
 * route instead. The upstream origin is server configuration, never a request value, and every
 * parameter is validated against the shape Gauzy accepts, so no request can reach another host or path.
 */

const SIZE = /^\d{1,4}x\d{1,4}$/;
const BACKGROUND = /^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const TEXT = /^[A-Za-z0-9]{0,4}$/;

const notFound = () => new NextResponse(null, { status: 404 });

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ size: string; background: string }> }
) {
	const { size, background } = await params;
	const text = new URL(request.url).searchParams.get('text') ?? '';

	if (!SIZE.test(size) || !BACKGROUND.test(background) || !TEXT.test(text)) return notFound();

	const query = text ? `?text=${text}` : '';
	let origin: string = GAUZY_API_SERVER_ORIGIN;
	while (origin.endsWith('/')) origin = origin.slice(0, -1);

	return proxyGauzyImage('placeholder', `${origin}/api/placeholder/${size}/${background}${query}`, 'image/png');
}

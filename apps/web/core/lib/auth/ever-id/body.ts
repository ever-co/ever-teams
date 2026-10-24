/**
 * Request bodies of the public Ever ID routes, read with a size cap: the cap applies while reading, so a body
 * sent without Content-Length (chunked) is cut off as soon as it passes it instead of being buffered whole.
 */

/** The body as text, or `null` when it is larger than `maxBytes` or cannot be read. */
export async function readCappedText(req: Request, maxBytes: number): Promise<string | null> {
	const declared = Number(req.headers.get('content-length') ?? '');
	if (Number.isFinite(declared) && declared > maxBytes) return null;
	if (!req.body) return '';
	const reader = req.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > maxBytes) {
				await reader.cancel().catch(() => undefined);
				return null;
			}
			chunks.push(value);
		}
	} catch {
		return null;
	}
	return new TextDecoder().decode(Buffer.concat(chunks));
}

/**
 * A JSON object body of at most `maxBytes` bytes sent as `application/json`, or `null`. Requiring the JSON
 * content type also keeps plain cross-site form posts out.
 */
export async function readCappedJsonObject(req: Request, maxBytes: number): Promise<Record<string, unknown> | null> {
	if (!/^application\/json\b/i.test(req.headers.get('content-type') ?? '')) return null;
	const text = await readCappedText(req, maxBytes);
	if (!text) return null;
	try {
		const value: unknown = JSON.parse(text);
		return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

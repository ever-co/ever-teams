const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;

const HOST_WITH_PORT_PATTERN = /^[a-z][a-z\d.-]*:\d+(?:[/?#]|$)/i;

/** `localhost:3000` and `example.com:8080` start like a scheme but are a host and its port. */
export function hasUrlScheme(value: string): boolean {
	const startsLikeScheme = SCHEME_PATTERN.test(value);
	if (!startsLikeScheme) {
		return false;
	}
	const isHostWithPort = HOST_WITH_PORT_PATTERN.test(value);
	return !isHostWithPort;
}

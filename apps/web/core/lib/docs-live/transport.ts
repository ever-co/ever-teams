import { REALTIME_PING_INTERVAL_MS } from '@/core/lib/realtime/config';
import { GraphqlWsConnection, isFatalCloseCode, type SocketFactory } from '@/core/lib/realtime/graphql-ws';
import type { RealtimeCredentials } from '@/core/lib/realtime/client';
import type { DocsLiveSink, DocsLiveTransport } from './binding';
import { DOCUMENT_LIVE_SUBSCRIPTION, type DocsLiveFrame, type DocsLiveStatus } from './protocol';

/** The platform's live routes, through the app's own HTTP client (both transports, the proxy or the platform). */
interface DocsLiveHttp {
	status(): Promise<DocsLiveStatus>;
	sendUpdate(documentId: string, input: { connectionId: string; update: string }): Promise<unknown>;
	sendAwareness(documentId: string, input: { connectionId: string; awareness: string }): Promise<unknown>;
}

interface DocsLiveTransportOptions {
	/** The platform's GraphQL socket, the one `collaborationEvents` uses (`realtimeSocketUrl`). */
	socketUrl: string;
	/** The credential and scope the real-time client presents; `null` when signed out. */
	credentials: () => RealtimeCredentials | null;
	http: DocsLiveHttp;
	createSocket?: SocketFactory;
	pingIntervalMs?: number;
}

/**
 * The transport of one page view's live session: a socket of its own on the platform's GraphQL endpoint, opened
 * when the session is and closed with it, presenting the credential the real-time client presents; edits and
 * cursors go over HTTP.
 *
 * A socket that closes ends the subscription (`complete`), and the binding opens it again; a socket the platform
 * refused (a credential it does not accept) ends it with an error, and the page gives way to the autosave.
 */
export function createDocsLiveTransport(options: DocsLiveTransportOptions): DocsLiveTransport {
	let connection: GraphqlWsConnection | null = null;
	let lastCloseCode: number | null = null;
	let disposed = false;

	const connect = (): GraphqlWsConnection | null => {
		if (connection && !disposed) return connection;
		const credentials = options.credentials();
		if (!credentials?.accessToken || disposed) return null;
		const opened: GraphqlWsConnection = new GraphqlWsConnection({
			url: options.socketUrl,
			connectionParams: () => ({
				authorization: `Bearer ${credentials.accessToken}`,
				...(credentials.tenantId ? { 'tenant-id': credentials.tenantId } : {}),
				...(credentials.organizationId ? { 'organization-id': credentials.organizationId } : {})
			}),
			createSocket: options.createSocket,
			pingIntervalMs: options.pingIntervalMs ?? REALTIME_PING_INTERVAL_MS,
			onClose: (code) => {
				lastCloseCode = code;
				if (connection === opened) connection = null;
			}
		});
		connection = opened;
		return opened;
	};

	return {
		open(documentId: string, connectionId: string, sink: DocsLiveSink): () => void {
			let stopped = false;
			let unsubscribe: (() => void) | null = null;
			const socket = connect();
			if (!socket) {
				// Signed out: there is no session to open.
				void Promise.resolve().then(() => {
					if (!stopped) sink.error({ code: 'DOCS_LIVE_UNAUTHENTICATED' });
				});
				return () => {
					stopped = true;
				};
			}
			socket.ready.then(
				() => {
					if (stopped) return;
					try {
						unsubscribe = socket.subscribe<{ documentLive?: DocsLiveFrame }>(
							{
								query: DOCUMENT_LIVE_SUBSCRIPTION,
								variables: { documentId, connectionId },
								operationName: 'DocumentLive'
							},
							{
								next: (data) => {
									const frame = data?.documentLive;
									if (frame && !stopped) sink.next(frame);
								},
								error: (errors) => {
									if (!stopped) sink.error(errors);
								},
								complete: () => {
									if (!stopped) sink.complete();
								}
							}
						);
					} catch {
						if (!stopped) sink.complete();
					}
				},
				() => {
					if (stopped) return;
					// A refused credential will not be accepted on the next try either.
					if (lastCloseCode !== null && isFatalCloseCode(lastCloseCode))
						sink.error({ closeCode: lastCloseCode });
					else sink.complete();
				}
			);
			return () => {
				stopped = true;
				unsubscribe?.();
				unsubscribe = null;
			};
		},
		sendUpdate: (documentId, connectionId, update) => options.http.sendUpdate(documentId, { connectionId, update }),
		sendAwareness: (documentId, connectionId, awareness) =>
			options.http.sendAwareness(documentId, { connectionId, awareness }),
		status: () => options.http.status(),
		dispose() {
			disposed = true;
			const open = connection;
			connection = null;
			open?.close(1000, 'page left');
		}
	};
}

import { matchesAnyEventName, RealtimeEnvelope } from './events';

type EventHandler = (envelope: RealtimeEnvelope) => void;
type ResyncHandler = () => void;

/**
 * The in-tab fan-out of the shared connection: features subscribe here (through `useRealtimeEvent`) and never
 * open a socket of their own. The connection hook publishes every event it applies; a resync tells every
 * feature to refetch.
 */
class RealtimeBus {
	private readonly handlers = new Set<{ names: readonly string[] | null; handler: EventHandler }>();
	private readonly resyncHandlers = new Set<ResyncHandler>();

	/**
	 * Listens to the events of some names (`null` for all).
	 *
	 * @returns The function that stops listening.
	 */
	on(names: readonly string[] | null, handler: EventHandler): () => void {
		const entry = { names, handler };
		this.handlers.add(entry);
		return () => void this.handlers.delete(entry);
	}

	onResync(handler: ResyncHandler): () => void {
		this.resyncHandlers.add(handler);
		return () => void this.resyncHandlers.delete(handler);
	}

	emit(envelope: RealtimeEnvelope): void {
		for (const { names, handler } of this.handlers) {
			if (names && !matchesAnyEventName(names, envelope.eventName)) continue;
			try {
				handler(envelope);
			} catch {
				// A listener's failure is its own.
			}
		}
	}

	emitResync(): void {
		for (const handler of this.resyncHandlers) {
			try {
				handler();
			} catch {
				// A listener's failure is its own.
			}
		}
	}
}

export const realtimeBus = new RealtimeBus();

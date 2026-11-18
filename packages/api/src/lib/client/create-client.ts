import { createIdentity } from './identity';
import { createTimer, TimerResource } from './timer';
import { createTransport } from './transport';
import { EverTeamsClientOptions } from './types';

export type { TimerResource, TimerStartOptions } from './timer';

export interface EverTeamsClient {
	readonly timer: TimerResource;
}

/**
 * A client of an Ever Teams API with its own address, token and fetch: two clients never share them. Its methods
 * answer the API's data and throw an `EverTeamsError` (or one of its subclasses) that says what to do next.
 */
export function createClient(options: EverTeamsClientOptions): EverTeamsClient {
	const transport = createTransport(options);
	const identity = createIdentity(transport, options);
	return {
		timer: createTimer(transport, identity)
	};
}

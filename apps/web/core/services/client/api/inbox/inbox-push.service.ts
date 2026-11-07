import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

/** One of my devices that receives inbox notifications. */
export interface IInboxPushDevice {
	id: string;
	endpoint: string;
	userAgent?: string | null;
	lastUsedAt?: string | null;
	createdAt?: string | null;
}

/** `POST /inbox/push-subscriptions`: the browser's `PushSubscription.toJSON()`, and the device's name. */
export interface IInboxPushDeviceInput {
	endpoint: string;
	keys: { p256dh: string; auth: string };
	expirationTime?: number | null;
	userAgent?: string | null;
}

/**
 * Client of the platform's web push devices (`/inbox/push-subscriptions`): the VAPID public key a browser subscribes
 * with, and the signed-in person's own devices. The routes answer 404 where web push is off. Both transports.
 */
class InboxPushService extends APIService {
	publicKey = async (): Promise<string> => {
		const response = await this.get<{ publicKey: string }>('/inbox/push-subscriptions/public-key');
		return response.data.publicKey;
	};

	devices = async (): Promise<IInboxPushDevice[]> => {
		const response = await this.get<IInboxPushDevice[]>('/inbox/push-subscriptions');
		return response.data ?? [];
	};

	/** Registers this browser, or refreshes it (the same endpoint is one device). */
	register = async (input: IInboxPushDeviceInput): Promise<IInboxPushDevice> => {
		const response = await this.post<IInboxPushDevice>('/inbox/push-subscriptions', { ...input }, undefined, false);
		return response.data;
	};

	remove = async (id: string): Promise<void> => {
		await this.delete(`/inbox/push-subscriptions/${encodeURIComponent(id)}`);
	};
}

export const inboxPushService = new InboxPushService(GAUZY_API_BASE_SERVER_URL.value);

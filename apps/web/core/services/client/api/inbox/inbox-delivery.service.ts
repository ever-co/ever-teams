import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

/** One delivery channel: on for the platform, and able to deliver for the organization right now. */
export interface IInboxDeliveryChannelStatus {
	enabled: boolean;
	available: boolean;
}

/** `GET /inbox/delivery/status`: which channels the Inbox can deliver through for the caller's organization. */
export interface IInboxDeliveryStatus {
	email: IInboxDeliveryChannelStatus;
	push: IInboxDeliveryChannelStatus;
	checkedAt: string;
}

/** Whether an answer has the shape of a delivery status (an older platform, or a proxy page, answers something else). */
export function isInboxDeliveryStatus(answer: unknown): answer is IInboxDeliveryStatus {
	if (!answer || typeof answer !== 'object') {
		return false;
	}
	const email = (answer as { email?: unknown }).email;
	if (!email || typeof email !== 'object') {
		return false;
	}
	const { enabled, available } = email as { enabled?: unknown; available?: unknown };
	return typeof enabled === 'boolean' && typeof available === 'boolean';
}

/**
 * Client of the platform's delivery status. The route exists only where the platform loads the Inbox's delivery
 * plugin; a 404, a failed read or an answer of another shape is `null`, which changes nothing on the page. Both
 * transports.
 */
class InboxDeliveryService extends APIService {
	status = async (): Promise<IInboxDeliveryStatus | null> => {
		try {
			const response = await this.get<unknown>('/inbox/delivery/status');
			return isInboxDeliveryStatus(response.data) ? response.data : null;
		} catch {
			return null;
		}
	};
}

export const inboxDeliveryService = new InboxDeliveryService(GAUZY_API_BASE_SERVER_URL.value);

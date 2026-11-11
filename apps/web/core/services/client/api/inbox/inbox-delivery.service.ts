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

function isChannelStatus(channel: unknown): channel is IInboxDeliveryChannelStatus {
	if (!channel || typeof channel !== 'object') {
		return false;
	}
	const { enabled, available } = channel as { enabled?: unknown; available?: unknown };
	return typeof enabled === 'boolean' && typeof available === 'boolean';
}

/**
 * Whether an answer is a whole delivery status: both channels with both fields, and the check time. An older platform,
 * a proxy page or a partial answer is not one.
 */
export function isInboxDeliveryStatus(answer: unknown): answer is IInboxDeliveryStatus {
	if (!answer || typeof answer !== 'object') {
		return false;
	}
	const { email, push, checkedAt } = answer as { email?: unknown; push?: unknown; checkedAt?: unknown };
	return isChannelStatus(email) && isChannelStatus(push) && typeof checkedAt === 'string';
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

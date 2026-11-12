import { APP_NAME } from '@/core/constants/config/constants';
import { NEWSLETTER_UI_PREFERENCE, type NewsletterSubscription } from '@/core/lib/utils/newsletter-subscription';
import { authenticatedGuard, sessionChecks } from '@/core/services/server/guards/authenticated-guard-app';
import { setUserUiPreferenceRequest } from '@/core/services/server/requests/user';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const subscribeSchema = z.object({ email_address: z.email() });

/**
 * The tags a newsletter sign-up from the app carries. Set here, not by the caller: tags can start Mailchimp
 * automations.
 */
const subscriberTags = () => [`${APP_NAME}, ${APP_NAME} App`, 'Open', 'Cloud'];

/** Mailchimp's answer to an address it already holds: the person is on the list, which counts as subscribed. */
const MEMBER_EXISTS = 'Member Exists';

/**
 * Keeps the subscription on the user (their UI preferences on the platform), so the opt-in card stays away on every
 * browser and device (#5097). Written here, once Mailchimp took the address, so a client that closes early cannot
 * skip it. A failure leaves the address on the list, so the answer is still a subscription: it is logged.
 */
async function rememberSubscription(
	status: NewsletterSubscription['status'],
	bearer_token: string | undefined,
	tenantId: string | undefined
): Promise<NewsletterSubscription> {
	const newsletter: NewsletterSubscription = { subscribedAt: new Date().toISOString(), status };
	if (!bearer_token) {
		return newsletter;
	}
	try {
		await setUserUiPreferenceRequest({
			feature: NEWSLETTER_UI_PREFERENCE,
			value: newsletter,
			bearer_token,
			tenantId
		});
		// The session check this server keeps for a few seconds holds the user as they were: a reload within them
		// would read the user without the subscription and keep it for the user query's whole staleness
		sessionChecks.drop(bearer_token);
	} catch (error) {
		console.error('The newsletter subscription could not be kept on the user', error);
	}
	return newsletter;
}

/**
 * Adds an address to the newsletter list (the opt-in box at the foot of the sidebar).
 *
 * The route was open to anyone, never checked the captcha it asked for, and put any address straight on the list as
 * `subscribed` with tags of the caller's choosing: anyone could sign third parties up to the operator's list, which
 * is what gets a Mailchimp account suspended. It now needs a signed-in user. The user's own address (which the
 * account has verified) is subscribed outright; any other address is `pending`, so Mailchimp asks its owner to
 * confirm before anything is sent.
 */
export const POST = async (req: NextRequest) => {
	const { user, status, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());
	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });
	}

	const parsed = subscribeSchema.safeParse(await req.json().catch(() => null));
	if (!parsed.success) {
		return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
	}
	const email = parsed.data.email_address;
	// Registration signs the user in before the address is confirmed: only a verified address counts as the user's own
	const isOwnAddress =
		user.isEmailVerified === true &&
		typeof user.email === 'string' &&
		email.toLowerCase() === user.email.toLowerCase();

	try {
		const LIST_ID = process.env.MAILCHIMP_LIST_ID;
		const API_KEY = process.env.MAILCHIMP_API_KEY ? process.env.MAILCHIMP_API_KEY : '';
		if (!LIST_ID || !API_KEY) {
			throw new Error('Missing Mailchimp environment variables');
		}
		// API keys are in the form <key>-us3.
		const DATACENTER = API_KEY.split('-')[1];
		const mailchimpData = {
			email_address: email,
			status: isOwnAddress ? 'subscribed' : 'pending',
			tags: subscriberTags()
		};
		const response = await fetch(`https://${DATACENTER}.api.mailchimp.com/3.0/lists/${LIST_ID}/members`, {
			body: JSON.stringify(mailchimpData),
			headers: {
				Authorization: `apikey ${API_KEY}`,
				'Content-Type': 'application/json'
			},
			method: 'POST'
		});
		let listStatus: NewsletterSubscription['status'] = isOwnAddress ? 'subscribed' : 'pending';
		// Swallow any errors from Mailchimp and return a better error message.
		if (response.status >= 400) {
			const errorResponse = await response.json().catch(() => ({}));
			const isOnTheListAlready = errorResponse?.title === MEMBER_EXISTS;
			if (!isOnTheListAlready) {
				return NextResponse.json(
					{
						error: `There was an error subscribing to the newsletter: ${errorResponse?.detail}`
					},
					{ status: 400 }
				);
			}
			listStatus = 'subscribed';
		}

		const newsletter = await rememberSubscription(listStatus, access_token, tenantId);
		return NextResponse.json({ error: '', status: listStatus, newsletter }, { status: 201 });
	} catch (error) {
		return NextResponse.json(
			{
				error: (error as Error).message || (error as Error).toString(),
				resp: null
			},
			{ status: 500 }
		);
	}
};

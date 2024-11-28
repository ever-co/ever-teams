import { NextRequest, NextResponse } from 'next/server';

export const POST = async (req: NextRequest) => {
	// 1. Destructure the email address from the request body.
	const reqData = (await req.json()) as {
		email_address: string;
		tags: string[];
		captcha?: string;
	};

	if (!reqData.email_address) {
		// 2. Throw an error if an email wasn't provided.
		return NextResponse.json({ error: 'Email is required' }, { status: 400 });
	}

	if (!reqData.captcha) {
		// 2. Display an error if the captcha code wasn't provided.
		console.error('ERROR: Please provide required fields', 'STATUS: 400');
	}

	try {
		// 3. Fetch the environment variables.
		const LIST_ID = process.env.MAILCHIMP_LIST_ID;
		const API_KEY = process.env.MAILCHIMP_API_KEY ? process.env.MAILCHIMP_API_KEY : '';
		if (!LIST_ID || !API_KEY) {
			throw new Error('Missing Mailchimp environment variables');
		}
		// 4. API keys are in the form <key>-us3.
		const DATACENTER = API_KEY.split('-')[1];
		const mailchimpData = {
			email_address: reqData.email_address,
			status: 'subscribed',
			tags: reqData.tags ? [...reqData.tags] : ['Ever Teams']
		};
		// 5. Send a POST request to Mailchimp.
		const response = await fetch(`https://${DATACENTER}.api.mailchimp.com/3.0/lists/${LIST_ID}/members`, {
			body: JSON.stringify(mailchimpData),
			headers: {
				Authorization: `apikey ${API_KEY}`,
				'Content-Type': 'application/json'
			},
			method: 'POST'
		});
		console.log(response);
		// 6. Swallow any errors from Mailchimp and return a better error message.
		if (response.status >= 400) {
			const errorResponse = await response.json();
			return NextResponse.json(
				{
					error: `There was an error subscribing to the newsletter: ${errorResponse.detail}`
				},
				{ status: 400 }
			);
		}

		// 7. If we made it this far, it was a success! 🎉
		return NextResponse.json({ error: '', resp: response }, { status: 201 });
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

export enum EProvider {
	GITHUB = 'github',
	GOOGLE = 'google',
	FACEBOOK = 'facebook',
	TWITTER = 'twitter',
	// OpenID Connect sign-in through Ever ID; exchanged with the Gauzy API like the providers above, but by ID token
	EVER_ID = 'ever-id'
}

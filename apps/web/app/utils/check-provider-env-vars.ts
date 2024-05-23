/**
 * Check if next-auth provider has needed .env variables
 *
 * @description In order to display only the social logins that are correctly configured, we need to check first for each if all required environnement variables are passed
 * @param {string[]} vars the required environnement variables for each provider
 * @returns a boolean that approve if all variables are availables
 */
export function checkEnVars(vars: string[]) {
	return vars.every((envVar) => process.env[envVar]);
}

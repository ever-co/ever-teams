/**
 * The header a proxied request of a tab names the tab's team with while the tab works in its own organization and the
 * cookies, shared by every tab, name another one (tab-organization.ts, #5134). Sent to this app's own routes only
 * (authenticated-guard-app.ts), never to the API.
 */
export const TAB_TEAM_HEADER = 'x-tab-team-id';

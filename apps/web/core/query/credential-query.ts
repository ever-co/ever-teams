/** Non-secret marker for reads whose query functions capture a pinned access token. */
export const CREDENTIAL_SCOPED_QUERY_META = Object.freeze({ credentialScoped: true as const });

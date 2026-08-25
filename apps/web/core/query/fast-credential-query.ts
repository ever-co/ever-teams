/** Non-secret marker for reads whose query functions capture a pinned access token. */
export const FAST_CREDENTIAL_QUERY_META = Object.freeze({ fastCredentialScoped: true as const });

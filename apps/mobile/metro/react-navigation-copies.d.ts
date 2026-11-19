// Types of react-navigation-copies.js, which metro.config.js requires in plain Node when Metro starts, before any
// TypeScript transform: the resolver itself stays JavaScript, like metro.config.js.

/** What Metro hands a resolver: here, its own resolveRequest, which resolves a module name the default way. */
export interface ResolutionContext {
	resolveRequest: CustomResolver;
}

export type CustomResolver = (context: ResolutionContext, moduleName: string, platform: string | null) => unknown;

/** Expo Router's copy of a React Navigation package, or undefined for any other module. */
export function expoRouterCopyOf(moduleName: string): string | undefined;

/** A Metro resolver that sends React Navigation's packages to Expo Router's copy, and every other module on. */
export function withReactNavigationFromExpoRouter(resolveRequest: CustomResolver | null | undefined): CustomResolver;

import { configure } from '@testing-library/dom';

/**
 * In CI the in-cluster build pods share loaded nodes: a jsdom render and its effects can take several times longer
 * than on a laptop, and Testing Library's default 1 s for `waitFor` / `findBy*` then fails tests that pass locally
 * (meet, timer, settings and auth suites flaked this way on the stage promotions of 2026-11-15). Under CI the async
 * assertions wait up to 5 s; locally the default stays, so a slow test still shows up while it is being written.
 */
if (process.env.CI) {
	configure({ asyncUtilTimeout: 5_000 });
}

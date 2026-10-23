/**
 * @jest-environment node
 */
const stored = new Map<string, unknown>();

jest.mock(
  'electron-store',
  () =>
    class {
      get(key: string) {
        return stored.get(key);
      }
      set(key: string, value: unknown) {
        stored.set(key, value);
      }
    },
  { virtual: true }
);

import { LocalStore } from '../main/helpers/services/libs/desktop-store';
import { redactSecrets } from '../main/util';

/**
 * The web server's AUTH_SECRET (the key of the next-auth session and of the Ever ID hand-off cookie) was one constant,
 * `development_auth_secret`, baked into every build, and the server task logged it, with the rest of the server's
 * environment, to the electron-log file.
 */
describe("the web server's AUTH_SECRET", () => {
  beforeEach(() => stored.clear());

  it('is generated for this install, and kept', () => {
    const secret = LocalStore.getInstallSecret('authSecret');

    expect(secret).not.toBe('development_auth_secret');
    expect(Buffer.from(secret, 'base64')).toHaveLength(32);
    expect(LocalStore.getInstallSecret('authSecret')).toBe(secret);
  });

  it('differs from one install to the next', () => {
    const first = LocalStore.getInstallSecret('authSecret');
    stored.clear();

    expect(LocalStore.getInstallSecret('authSecret')).not.toBe(first);
  });

  it('replaces a stored value too short to be one', () => {
    stored.set('secrets.authSecret', 'short');

    expect(LocalStore.getInstallSecret('authSecret')).not.toBe('short');
  });

  it('is not logged with the server arguments', () => {
    const args = { PORT: 3002, AUTH_SECRET: 'the-secret', GAUZY_API_SERVER_URL: 'https://api.ever.team' };

    expect(redactSecrets(args)).toEqual({
      PORT: 3002,
      AUTH_SECRET: '[redacted]',
      GAUZY_API_SERVER_URL: 'https://api.ever.team'
    });
    expect(args.AUTH_SECRET).toBe('the-secret');
  });
});

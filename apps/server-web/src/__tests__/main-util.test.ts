/**
 * @jest-environment node
 */
import path from 'path';
import url from 'url';
import { isAppPage, isExternalLink, pickServerSettings } from '../main/util';

/**
 * Every window of the desktop wrapper has the preload, which reaches the main process (settings, server restart, file
 * dialog), and no window handled navigation. The server settings it stores are spread into the web server's
 * environment as they come.
 */
describe('the pages a desktop window may show', () => {
  const ownPage = url.format({
    pathname: path.resolve(__dirname, '../main', '../renderer/', 'index.html'),
    protocol: 'file:',
    slashes: true
  });

  it("is the app's bundled page, whatever its hash route", () => {
    expect(isAppPage(`${ownPage}#/setting`)).toBe(true);
    expect(isAppPage(`${ownPage}#/server`)).toBe(true);
  });

  it('is never another file, an SMB share, or a web page', () => {
    expect(isAppPage('file:///tmp/evil.html')).toBe(false);
    expect(isAppPage(ownPage.replace('file:///', 'file://attacker-host/'))).toBe(false);
    expect(isAppPage('https://evil.example/index.html')).toBe(false);
    expect(isAppPage('not a url')).toBe(false);
  });

  it('hands only http(s) and mailto links to the browser', () => {
    expect(isExternalLink('https://ever.team/terms')).toBe(true);
    expect(isExternalLink('mailto:support@ever.co')).toBe(true);
    expect(isExternalLink('file:///etc/passwd')).toBe(false);
    expect(isExternalLink('smb://attacker/share')).toBe(false);
    expect(isExternalLink('javascript:alert(1)')).toBe(false);
  });
});

describe('the server settings passed on to the web server', () => {
  it('keeps the settings the forms write, and nothing else', () => {
    const settings = {
      PORT: 3002,
      GAUZY_API_SERVER_URL: 'https://api.ever.team',
      NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'https://api.ever.team',
      DESKTOP_WEB_SERVER_HOSTNAME: '127.0.0.1',
      useSsl: true,
      sslKey: '/certs/key.pem',
      sslSecret: '/certs/cert.pem',
      NODE_OPTIONS: '--require /tmp/payload.js',
      ELECTRON_RUN_AS_NODE: '1'
    };

    expect(pickServerSettings(settings)).toEqual({
      PORT: 3002,
      GAUZY_API_SERVER_URL: 'https://api.ever.team',
      NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'https://api.ever.team',
      DESKTOP_WEB_SERVER_HOSTNAME: '127.0.0.1',
      useSsl: true,
      sslKey: '/certs/key.pem',
      sslSecret: '/certs/cert.pem'
    });
  });

  it('answers nothing for no settings', () => {
    expect(pickServerSettings(undefined)).toEqual({});
    expect(pickServerSettings(null)).toEqual({});
  });
});

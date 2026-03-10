import { createServer } from 'https';
import * as http from 'node:http';
import * as net from 'node:net';
import httpProxy from 'http-proxy';
import fs from 'node:fs';

type HttpProxyServer = ReturnType<typeof httpProxy.createProxyServer>;
type HttpsServer = ReturnType<typeof createServer>;

export interface ProxyConfig {
  port: number;
  host: string;
  sslKey: string;
  sslSecret: string;
  nextPort: number;
}

export class ServerProxy {
  static instance: ServerProxy;
  private port: number;
  private sslKey: string;
  private sslSecret: string;
  private nextPort: number;
  private host: string;
  private proxy: HttpProxyServer | null;
  private httpsServer: HttpsServer | null;

  constructor({ port, sslKey, sslSecret, nextPort, host }: ProxyConfig) {
    this.sslSecret = sslSecret;
    this.sslKey = sslKey;
    this.port = port;
    this.nextPort = nextPort;
    this.proxy = null;
    this.httpsServer = null;
    this.host = host;
  }

  public static getInstance(proxyConfig: ProxyConfig) {
    if (
      !ServerProxy.instance ||
      ServerProxy.instance.port !== proxyConfig.port ||
      ServerProxy.instance.sslKey !== proxyConfig.sslKey ||
      ServerProxy.instance.sslSecret !== proxyConfig.sslSecret ||
      ServerProxy.instance.nextPort !== proxyConfig.nextPort ||
      ServerProxy.instance.host !== proxyConfig.host
    ) {
      ServerProxy.instance?.stopServer();
      ServerProxy.instance = new ServerProxy(proxyConfig);
    }
    return ServerProxy.instance;
  }

  public createServerProxy() {
    if (this.httpsServer?.listening) {
      return;
    }

    if (!fs.existsSync(this.sslKey) || !fs.existsSync(this.sslSecret)) {
      return;
    }
    const keepAliveAgent = new http.Agent({
      keepAlive: true,
      maxSockets: 100, // Allow up to 100 simultaneous open pipes
      keepAliveMsecs: 1000,
    });
    this.proxy = httpProxy.createProxyServer<
      http.IncomingMessage,
      http.ServerResponse
    >({
      target: `http://${this.host}:${this.nextPort}`,
      ws: true,
      xfwd: true,
      changeOrigin: true,
      agent: keepAliveAgent
    });
    const errorCallback: (
      err: Error,
      req: http.IncomingMessage,
      res: http.ServerResponse | net.Socket,
      target?: string,
    ) => void = (error) => {
      console.log('Proxy server error', error);
    };
    this.proxy.on('error', errorCallback as never);

    const httpsOptions = {
      key: fs.readFileSync(this.sslKey),
      cert: fs.readFileSync(this.sslSecret),
    };

    this.httpsServer = createServer(httpsOptions, (req, res) => {
      req.headers['x-forwarded-proto'] = 'https';

      // 2. Tell Next.js to use the IP address the user actually typed in
      if (req.headers.host) {
        req.headers['x-forwarded-host'] = req.headers.host;
      }
      this.proxy?.web(req, res);
    });


    this.httpsServer.keepAliveTimeout = 60000;
    this.httpsServer.headersTimeout = 65000;
    this.httpsServer.on('upgrade', (req, socket, head) => {
      req.headers['x-forwarded-proto'] = 'https';

      // 2. Tell Next.js to use the IP address the user actually typed in
      if (req.headers.host) {
        req.headers['x-forwarded-host'] = req.headers.host;
      }
      this.proxy?.ws(req, socket, head);
    });

    this.httpsServer.listen(Number(this.port), this.host, () => {
      console.log(`> App exposed securely on https://${this.host}:${this.port}`);
    });
  }

  stopServer() {
    if (this.httpsServer) {
      this.httpsServer.close();
      this.httpsServer.removeAllListeners();
      this.httpsServer = null;
    }
    if (this.proxy) {
      this.proxy.close();
      this.proxy.removeAllListeners();
      this.proxy = null;
    }
  }
}

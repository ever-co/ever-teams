# Ever Teams ChatGPT Application

A middleware server that connects OpenAI ChatGPT to the Ever Teams platform via the existing Ever Teams MCP (Model Context Protocol) infrastructure.

## 🎯 Overview

The ChatGPT App acts as an intelligent proxy between ChatGPT and the existing Ever Teams MCP server infrastructure:

```
ChatGPT → ChatGPT App (this) → mcp.ever.team → Ever Teams API
                              ↓
                        mcpauth.ever.team (OAuth)
```

### Key Features

- **🔄 Transparent Proxy**: Forwards all MCP requests to your existing `mcp.ever.team` server
- **🎨 Smart Enhancement**: Adds ChatGPT-specific UI metadata (`_meta` fields) only for ChatGPT clients
- **🔐 OAuth Integration**: Reuses your existing OAuth infrastructure at `mcpauth.ever.team`
- **🚀 Zero MCP Changes**: Your existing MCP server remains completely unchanged
- **📊 Client Detection**: Automatically detects ChatGPT vs other MCP clients
- **🌍 Localization**: Supports multi-language based on user's locale

## 🏗️ Architecture

### Components

1. **MCP Proxy** (`src/server/mcp-proxy.ts`)
   - Forwards requests to `mcp.ever.team`
   - Handles authentication tokens
   - Provides error handling and retry logic

2. **Client Detector** (`src/middleware/client-detector.ts`)
   - Identifies ChatGPT requests via User-Agent, headers, and origin
   - Extracts locale and client information

3. **Metadata Enhancer** (`src/middleware/meta-enhancer.ts`)
   - Adds `_meta` fields for ChatGPT UI rendering
   - Links tools to UI components
   - Provides tool invocation status messages

4. **ChatGPT App Server** (`src/server/chatgpt-app-server.ts`)
   - Express server handling all requests
   - Coordinates proxy, detection, and enhancement
   - Provides health checks and OAuth endpoints

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and Yarn
- Access to `mcp.ever.team` (MCP server)
- Access to `mcpauth.ever.team` (MCP OAuth server)

### Installation

```bash
# Navigate to the app directory
cd apps/chatgpt

# Install dependencies
yarn install

# Copy environment template
cp .env.example .env.local

# Edit configuration
nano .env.local
```

### Configuration

Edit `.env.local`:

```bash
# Server configuration
CHATGPT_APP_PORT=3004
CHATGPT_APP_HOST=0.0.0.0

# Existing infrastructure (no changes needed)
MCP_SERVER_URL=https://mcp.ever.team
OAUTH_SERVER_URL=https://mcpauth.ever.team

# ChatGPT App credentials (get from OpenAI Developer Platform)
CHATGPT_APP_ID=your-app-id-from-openai
CHATGPT_APP_SECRET=your-app-secret-from-openai

# Security
ALLOWED_ORIGINS=https://chat.openai.com,https://chatgpt.com
SESSION_SECRET=your-secure-random-secret

# Environment
NODE_ENV=development
LOG_LEVEL=info
```

### Development

```bash
# Development mode with auto-reload
yarn dev

# Build for production
yarn build

# Start production server
yarn start
```

### Testing

```bash
# Test health endpoint
curl http://localhost:3004/health

# Test MCP proxy (as ChatGPT)
curl -X POST http://localhost:3004/mcp \
  -H "Content-Type: application/json" \
  -H "User-Agent: ChatGPT/1.0" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'

# Test with authentication
curl -X POST http://localhost:3004/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "timer_status",
      "arguments": {}
    }
  }'
```

## 📡 API Endpoints

### Health Check
```
GET /health
```
Returns server status and MCP server health.

### MCP Proxy
```
POST /mcp
Content-Type: application/json
Authorization: Bearer <token> (optional)

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```
Proxies MCP requests to `mcp.ever.team` with optional metadata enhancement.

### OAuth Authorization
```
GET /oauth/authorize?client_id=...&redirect_uri=...
```
Redirects to `mcpauth.ever.team` for OAuth authorization.

### OAuth Callback
```
GET /oauth/callback?code=...&state=...
```
Handles OAuth callback from the authorization server.

### Server Info
```
GET /info
```
Returns server information and configuration.

## 🎨 Metadata Enhancement

The app automatically enhances responses for ChatGPT with `_meta` fields:

### Base Metadata (all tools)
```typescript
{
  _meta: {
    "openai/widgetPrefersBorder": true,
    "openai/widgetDomain": "ever.team",
    "openai/widgetCSP": "...",
    "openai/locale": "en-US"  // User's locale
  }
}
```

### Tool-Specific Metadata

**Timer Tools** (`start_timer`, `stop_timer`, `timer_status`):
```typescript
{
  _meta: {
    "openai/outputTemplate": "component://timerWidget",
    "openai/toolInvocation/invoking": "Starting timer...",
    "openai/toolInvocation/invoked": "Timer started successfully"
  }
}
```

**Project Tools** (`create_project`, `get_projects`):
```typescript
{
  _meta: {
    "openai/outputTemplate": "component://projectCard",
    "openai/toolInvocation/invoking": "Processing project...",
    "openai/toolInvocation/invoked": "Project created successfully"
  }
}
```

## 🔐 Authentication Flow

1. ChatGPT user triggers app
2. ChatGPT App checks for valid Bearer token
3. If no token:
   - Redirects to `mcpauth.ever.team/oauth2/authorize`
   - User authorizes
   - Receives authorization code
   - Exchanges for an access token
4. Token included in all subsequent MCP requests

## 🚢 Deployment

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --production

COPY dist/ ./dist/

EXPOSE 3004

CMD ["node", "dist/index.js"]
```

```bash
# Build Docker image
docker build -t ever-teams-chatgpt-app .

# Run container
docker run -d \
  -p 3004:3004 \
  -e MCP_SERVER_URL=https://mcp.ever.team \
  -e OAUTH_SERVER_URL=https://mcpauth.ever.team \
  --name chatgpt-app \
  ever-teams-chatgpt-app
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure `SESSION_SECRET` with a strong random value
- [ ] Set up HTTPS/TLS (use reverse proxy like Nginx)
- [ ] Configure CORS with specific allowed origins
- [ ] Set up logging and monitoring
- [ ] Configure rate limiting
- [ ] Set up health checks and auto-restart

## 🔧 Troubleshooting

### MCP Server Connection Failed
```bash
# Check if MCP server is accessible
curl https://mcp.ever.team/health

# Check server logs
tail -f logs/combined.log
```

### OAuth Authorization Failed
```bash
# Verify OAuth server is accessible
curl https://mcpauth.ever.team/.well-known/oauth-authorization-server

# Check OAuth configuration in .env.local
```

### ChatGPT Not Detecting App
- Verify app is registered in OpenAI Developer Platform
- Check MCP endpoint URL is correct: `https://chatgpt.ever.team/mcp`
- Ensure server is publicly accessible (use ngrok for testing)

## 📊 Monitoring

The app uses Pino for logging. Logs are written to:
- Console (colorized, formatted)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

### Log Levels
- `error`: Errors and exceptions
- `warn`: Warnings
- `info`: General information
- `debug`: Detailed debugging (set `LOG_LEVEL=debug`)

## 🤝 Integration with OpenAI

### Register App in OpenAI Developer Platform

1. Go to [OpenAI Developer Platform](https://platform.openai.com/)
2. Navigate to "ChatGPT Apps"
3. Create a new app with:
   - **Name**: "Ever Teams Time Tracking"
   - **Description**: "Track time, manage projects, and view productivity insights"
   - **MCP URL**: format like `https://chatgpt.ever.team/mcp`,
   - **OAuth Authorization**:
      - Client ID: `your-client-id`
      - Client Secret: `your-client-secret`
4. Copy App ID and Secret to `.env.local`

## 🔄 Request Flow Example

### User: "Start a timer for Project X"

1. **ChatGPT** → `POST /mcp` (with `User-Agent: ChatGPT/1.0`)
   ```json
   {
     "method": "tools/call",
     "params": {
       "name": "start_timer",
       "arguments": { "projectId": "..." }
     }
   }
   ```

2. **Client Detector** identifies ChatGPT request

3. **MCP Proxy** → `POST https://mcp.gauzy.co/sse`
   ```json
   {
     "method": "tools/call",
     "params": {
       "name": "start_timer",
       "arguments": { "projectId": "..." }
     }
   }
   ```

4. **MCP Server** → Gauzy API creates time entry

5. **MCP Server** → Returns standard response
   ```json
   {
     "content": [{ "type": "text", "text": "{...}" }]
   }
   ```

6. **Metadata Enhancer** adds `_meta` fields
   ```json
   {
     "content": [...],
     "_meta": {
       "openai/outputTemplate": "component://timerWidget",
       "openai/toolInvocation/invoked": "Timer started successfully"
     }
   }
   ```

7. **ChatGPT** renders TimerWidget UI component

## 📚 Related Documentation

- [OpenAI Apps SDK](https://developers.openai.com/apps-sdk)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Ever Teams Platform](https://ever.team)
- [MCP Server README](https://github.com/ever-co/ever-gauzy/blob/develop/apps/mcp/README.md)
- [OAuth Server README](https://github.com/ever-co/ever-gauzy/blob/develop/apps/mcp-auth/README.md)

## 🐛 Support

For issues and questions:
- GitHub Issues: [https://github.com/teams-co/ever-teams/issues](https://github.com/ever-co/ever-teams/issues)
- Email: support@ever.co

## 📄 License

AGPL-3.0 - See LICENSE file for details.

---

**Built with ❤️ by Ever Co. LTD**

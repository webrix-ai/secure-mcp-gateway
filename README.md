<p align="center">
  <a href="https://www.mcp-s.com" target="_blank"><img height="96px" src="https://www.mcp-s.com/logo.png" alt="mcp-gateway logo" /></a>
  <h1 align="center">MCP-S: MCP Gateway</h1>
</p>
<p align="center">
  Gateway and integration layer for MCP (Model Context Protocol).
</p>
<p align="center">
  <a href="https://github.com/webrix-ai/mcp-gateway/blob/main/LICENSE"><img src="https://img.shields.io/github/license/webrix-ai/mcp-gateway?style=flat-square&color=green" alt="MCP Gateway is released under the MIT license" /></a>
  <a href="https://www.npmjs.com/package/@mcp-s/mcp"><img src="https://img.shields.io/npm/v/@mcp-s/mcp?style=flat-square&label=latest&color=purple" alt="npm latest release" /></a>
  <a href="https://www.npmtrends.com/@mcp-s/mcp"><img src="https://img.shields.io/npm/dm/@mcp-s/mcp?style=flat-square&color=cyan" alt="Downloads" /></a>
  <a href="https://github.com/webrix-ai/mcp-gateway/stargazers"><img src="https://img.shields.io/github/stars/webrix-ai/mcp-gateway?style=flat-square&color=orange" alt="GitHub Stars" /></a>
</p>

---

### MCP-S Gateway

**mcp-gateway** is a secure gateway and integration layer for the **Model Context Protocol (MCP)**. It provides a unified, enterprise-ready interface for connecting, managing, and extending MCP modules and services, with a focus on security and seamless integration.

### Features

- **Self-Hosted Gateway**: Deploy within your own infrastructure for maximum control
- **OAuth Authentication**: Secure authentication with any OAuth provider via [Auth.js](https://authjs.dev)
- **TypeScript Support**: Fully typed for robust development
- **Open Source**: MIT licensed and community-driven

**Supports all MCP Connection Types:**
- **STDIO**: Standard input/output MCP servers
- **SSE**: Server-Sent Events for real-time communication
- **StreamableHTTP**: HTTP-based streaming connections

### How To Use

1. **Start the gateway**:
   ```bash
   npm install && npm run start
   ```

2. **Configure your MCP servers** - Create `mcp.json` file in your project:
   ```json
   {
     "mcpServers": {
       "your-server": {
         "command": "npx",
         "args": ["-y", "@your-mcp-server"],
         "env": {
           "API_KEY": "your-api-key"
         }
       }
     }
   }
   ```

3. **Add to your MCP configuration**:
   
   **For Cursor/Claude Desktop/VS Code** - Add this to your MCP settings:
   ```json
   {
     "mcpServers": {
       "mcp-gateway": {
         "command": "npx",
         "args": ["-y", "@mcp-s/mcp"],
         "env": {
           "BASE_URL": "http://localhost:3000"
         }
       }
     }
   }
   ```

### Deploy

The deployment process is the same as local usage:

1. Set up your environment variables (see [Advanced Configuration](#advanced-configuration))
2. Create your `mcp.json` configuration file
3. Run `npm run start`

For production deployments, consider using:
- Process managers like PM2
- Container orchestration (Docker, Kubernetes)
- Cloud platforms (Heroku, Railway, Render)

### Authentication Setup

<a href="https://authjs.dev" target="_blank"><img width="32px" style="vertical-align:middle; margin-right:8px;" src="https://authjs.dev/img/logo-sm.png" alt="Auth.js logo" /></a>

mcp-gateway supports authentication with **any OAuth provider** using [Auth.js](https://authjs.dev). Simply set the `AUTH_PROVIDER` environment variable and provide the required credentials for your provider.

<details>
<summary>Google OAuth Setup</summary>

**Documentation**: [Auth.js Google Provider](https://authjs.dev/reference/core/providers/google)

```env
AUTH_SECRET=your-random-secret
AUTH_PROVIDER=google
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

</details>

<details>
<summary>Okta OAuth Setup</summary>

**Documentation**: [Auth.js Okta Provider](https://authjs.dev/reference/core/providers/okta)

```env
AUTH_SECRET=your-random-secret
AUTH_PROVIDER=okta
AUTH_OKTA_ID=your-okta-client-id
AUTH_OKTA_SECRET=your-okta-client-secret
AUTH_OKTA_ISSUER=https://your-okta-domain.okta.com/oauth2/default
```

</details>

<details>
<summary>Azure AD OAuth Setup</summary>

**Documentation**: [Auth.js Azure AD Provider](https://authjs.dev/reference/core/providers/azure-ad)

```env
AUTH_SECRET=your-random-secret
AUTH_PROVIDER=azure-ad
AUTH_AZURE_AD_ID=your-azure-client-id
AUTH_AZURE_AD_SECRET=your-azure-client-secret
AUTH_AZURE_AD_TENANT_ID=your-tenant-id-or-common
```

</details>

> For other providers, see the [Auth.js Providers documentation](https://authjs.dev/reference/core/providers/).

### Advanced Configuration

| Environment Variable | Description | Default Value | Required |
|---------------------|-------------|---------------|----------|
| `PORT` | Server port | `3000` | No |
| `BASE_URL` | Base URL for the gateway | `http://localhost:3000` | No |
| `AUTH_SECRET` | Secret for signing/encrypting tokens (generate with `openssl rand -base64 33`) | - | Yes |
| `AUTH_PROVIDER` | OAuth provider name | `google` | No |
| `TOKEN_EXPIRATION_TIME` | Token expiration time in milliseconds | `86400000` (24h) | No |
| `DB_PATH` | SQLite database file path | `./mcp.sqlite` | No |
| `AUTH_[Provider]_ID` | OAuth client ID for your provider | - | Yes |
| `AUTH_[Provider]_SECRET` | OAuth client secret for your provider | - | Yes |
| `AUTH_[Provider]_*` | Additional provider-specific variables (see [Auth.js documentation](https://authjs.dev/reference/core/providers/)) | - | Varies |

### Hosted Solution

Visit **[mcp-s.com](https://www.mcp-s.com)** for our fully managed hosting solution with advanced features:

- **Zero Configuration**: Get started in seconds without any setup
- **Enterprise-grade Security**: Advanced SSO authentication for all MCP interactions
- **20+ Pre-built Connectors**: Fast plug-and-play integration with hundreds of tools
- **Roles & Permissions**: Granular access control with custom role definitions
- **Monitoring & Analytics**: Real-time insights into your MCP usage
- **High Availability**: 99.9% uptime SLA with global CDN
- **Premium Support**: Direct access to our engineering team
- **Custom Integrations**: Build and deploy custom MCP connectors

### License

[MIT](./LICENSE)

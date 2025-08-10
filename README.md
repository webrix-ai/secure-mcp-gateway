<p align="center">
  <a href="https://www.mcp-s.com?utm_source=github&utm_medium=readme&utm_campaign=mcp-gateway&utm_content=header_logo" target="_blank"><img height="96px" src="https://www.mcp-s.com/logo.png" alt="mcp-gateway logo" /></a>
  <h1 align="center">MCP-S Gateway<br/>
A secure, open-source OAuth gateway for MCP authentication</h1>
</p>
<p align="center">
  Gateway + integration layer for the <strong>Model Context Protocol (MCP)</strong> 
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

<p align="center">
  <img src="docs/assets/finalmov.webp" alt="MCP Gateway Demo" />
</p>

### Quick Start

**1. Configure your MCP servers** - Create `mcp.json` file in your project:

```json
{
  "mcpServers": {
    "your-server": {
      "command": "npx",
      "args": ["-y", "@your-mcp-server"],
      "env": {
        "API_KEY": "your-api-key"
      }
    },
    "octocode": {
      "command": "npx",
      "args": ["octocode-mcp"]
    }
  }
}
```

**2. Use the `.env.example` file as a base, and override as needed:**

**3. Start with npx (Recommended):**

```bash
# Default (uses ./mcp.json and ./.env)
npx @mcp-s/secure-mcp-gateway

# Custom configuration paths
npx @mcp-s/secure-mcp-gateway --mcp-config ./custom/mcp.json --envfile ./custom/.env
```

Or clone:

```bash
git clone https://github.com/mcp-s-ai/secure-mcp-gateway.git && cd secure-mcp-gateway
npm install && npm run start
```

**4. Add to your MCP configuration**:

stdio:

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

Streamable HTTP Configuration:

```json
{
  "mcpServers": {
    "mcp-gateway": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Features

- **Self-Hosted Gateway**: Deploy within your own infrastructure for maximum control
- **OAuth Authentication**: Secure authentication with any OAuth provider via [Auth.js](https://authjs.dev)
- **TypeScript Support**: Fully typed for robust development

<!-- <video src="https://github.com/user-attachments/assets/2c3afaf9-6c08-436e-9efd-db8710554430"></video> TODO: ADD OUR VIDEO -->

**Supports all MCP Connection Types:**

- **STDIO**: Standard input/output MCP servers
- **StreamableHTTP**: HTTP-based streaming connections via `http://localhost:3000/mcp` (or `https://<your-domain>/mcp` for hosted deployments)

  > **Server Selection**: You can connect to a specific MCP server by adding the `?server_name=XXX` query parameter, where `XXX` is the name of the server from your `mcp.json` configuration. For example: `http://localhost:3000/mcp?server_name=your-server`

  **Connect with your preferred AI client:**

  | Client                                                                                                                                                                  | Link                                                    |
  | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
  | <img src="https://claude.ai/favicon.ico" alt="Claude" width="14" height="14"> **Claude**                                                                                | [claude.ai](https://claude.ai)                          |
  | <img src="https://www.cursor.com/favicon.ico" alt="Cursor"  width="14" height="14"> **Cursor**                                                                          | [cursor.com](https://cursor.com)                        |
  | <img src="https://codeium.com/favicon.ico" alt="Windsurf"  width="14" height="14"> **Windsurf**                                                                         | [codeium.com/windsurf](https://codeium.com/windsurf)    |
  | <img src="https://code.visualstudio.com/assets/favicon.ico" alt="VSCode" width="14" height="14"> **VSCode**                                                             | [code.visualstudio.com](https://code.visualstudio.com/) |
  | <img src="https://cline.bot/assets/icons/favicon-256x256.png" alt="Cline"  width="14" height="14"> **Cline**                                                            | [cline.tools](https://cline.tools)                      |
  | <img src="https://highlightai.com/favicon.ico" alt="Highlight AI"  width="14" height="14"> **Highlight AI**                                                             | [highlightai.com](https://highlightai.com)              |
  | <img src="https://cdn.prod.website-files.com/66d76c2202b335e39ad2b5e8/66f302d663108ca67c19ddbc_Favicon.png" alt="Augment Code" width="14" height="14"> **Augment Code** | [augmentcode.com](https://augmentcode.com)              |

### Deploy

Deploy the mcp-s gateway using npx:

1. Set up your environment variables (see [Advanced Configuration](#advanced-configuration))
2. Create your `mcp.json` configuration file
3. Run `npx @mcp-s/secure-mcp-gateway`

For production deployments, consider using:

- Process managers like PM2: `pm2 start "npx @mcp-s/secure-mcp-gateway" --name mcp-gateway`
- Container orchestration (Docker, Kubernetes)
- Cloud platforms (Heroku, Railway, Render)

### Authentication Setup

<a href="https://authjs.dev" target="_blank"><img width="32px" style="vertical-align:middle; margin-right:8px;" src="https://authjs.dev/img/logo-sm.png" alt="Auth.js logo" /></a>

mcp-gateway leverages the power of [Auth.js](https://authjs.dev), which supports **80+ OAuth providers** out of the box. This makes Auth.js the perfect companion for an open-source project like mcp-gateway. Both libraries share the same commitment to flexibility, security, and developer experience. By integrating with Auth.js, we avoid reinventing authentication wheels and instead provide you with battle-tested, production-ready OAuth flows that work seamlessly across providers.

Simply set the `AUTH_PROVIDER` environment variable and provide the required credentials for your chosen provider - mcp-gateway handles the rest.

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

<details>
<summary>GitHub OAuth Setup</summary>

**Documentation**: [Auth.js GitHub Provider](https://authjs.dev/reference/core/providers/github)

GitHub OAuth is particularly useful for MCP servers that interact with GitHub repositories, such as Octocode. When using GitHub OAuth, you can specify scopes to control what permissions your MCP servers have access to.

```env
AUTH_SECRET=your-random-secret
AUTH_PROVIDER=github
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret
AUTH_GITHUB_SCOPES=repo
```

**Common GitHub Scopes:**
- `repo` - Full access to repositories (public and private)
- `public_repo` - Access to public repositories only
- `read:user` - Read access to user profile information
- `user:email` - Access to user email addresses

For Octocode and similar MCP servers that need repository access, the `repo` scope is typically required.

</details>

> For other providers, see the [Auth.js Providers documentation](https://authjs.dev/reference/core/providers/).

### Advanced Configuration

#### Command Line Options

| Option         | Description                            | Default Value | Example                              |
| -------------- | -------------------------------------- | ------------- | ------------------------------------ |
| `--mcp-config` | Path to MCP servers configuration file | `./mcp.json`  | `--mcp-config ./config/servers.json` |
| `--envfile`    | Path to environment variables file     | `./.env`      | `--envfile ./config/production.env`  |

#### Environment Variables

| Environment Variable     | Description                                                                                                        | Default Value           | Required |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------- |
| `PORT`                   | Server port                                                                                                        | `3000`                  | No       |
| `BASE_URL`               | Base URL for the gateway                                                                                           | `http://localhost:3000` | No       |
| `AUTH_SECRET`            | Secret for signing/encrypting tokens (generate with `openssl rand -base64 33`)                                     | -                       | Yes      |
| `AUTH_PROVIDER`          | OAuth provider name                                                                                                | `google`                | No       |
| `TOKEN_EXPIRATION_TIME`  | Token expiration time in milliseconds                                                                              | `86400000` (24h)        | No       |
| `DB_PATH`                | SQLite database file path                                                                                          | `./mcp.sqlite`          | No       |
| `AUTH_[Provider]_ID`     | OAuth client ID for your provider                                                                                  | -                       | Yes      |
| `AUTH_[Provider]_SECRET` | OAuth client secret for your provider                                                                              | -                       | Yes      |
| `AUTH_[Provider]_*`      | Additional provider-specific variables (see [Auth.js documentation](https://authjs.dev/reference/core/providers/)) | -                       | Varies   |

### Troubleshooting

<details>
<summary>StreamableHTTP with Cursor: Tools not appearing after login</summary>

**Issue**: When using StreamableHTTP configuration in Cursor, tools don't appear even after successful authentication.

**Solution**: Make sure you have only **one Cursor window open**. Multiple Cursor windows can interfere with the MCP connection establishment.

1. Close all Cursor windows
2. Open a single Cursor window
3. Retry the authentication process

</details>

<details>
<summary>Node.js SQLite module error</summary>

**Issue**: You see the following error:

```text
Error [ERR_UNKNOWN_BUILTIN_MODULE]: No such built-in module: node:sqlite
```

**Solution**: This error occurs when using an older version of Node.js. The `node:sqlite` module requires **Node.js version 22 or higher**.

**Fix**:

1. Update Node.js to version 22 or later
2. Verify your version: `node --version`
3. Restart the gateway: `npm run start`

**Installation options**:

- Using [nvm](https://github.com/nvm-sh/nvm): `nvm install 22 && nvm use 22`
- Download from [nodejs.org](https://nodejs.org/)

</details>

### Hosted Solution

Visit **[mcp-s.com](https://www.mcp-s.com?utm_source=github&utm_medium=readme&utm_campaign=mcp-gateway&utm_content=hosted_solution_link)** for our fully managed hosting solution with advanced features:

- **Zero Configuration**: Get started in seconds without any setup
- **Enterprise-grade Security**: Advanced SSO authentication for all MCP interactions
- **20+ Pre-built Connectors**: Fast plug-and-play integration with hundreds of tools
- **Roles & Permissions**: Granular access control with custom role definitions
- **Monitoring & Analytics**: Real-time insights into your MCP usage
- **High Availability**: 99.9% uptime SLA with global CDN
- **Premium Support**: Direct access to our engineering team
- **Custom Integrations**: Build and deploy custom MCP connectors

### Community

Have questions? Need help getting started? Want to share your MCP setup?

Join our Slack community where developers are actively helping each other with MCP gatway implementations, troubleshooting, and sharing best practices.

**💬 [Join our Slack community →](https://join.slack.com/t/mcp-s/shared_invite/zt-388bm69k5-dACbMA5AwLKhNkdg4GwzLQ)**

### License

Released under the [MIT](./LICENSE) License. Contributions welcome - star & fork!

<p align="center">
  <a href="https://www.mcp-s.com" target="_blank"><img height="96px" src="https://www.mcp-s.com/logo.png" alt="mcp-gateway logo" /></a>
  <h1 align="center">MCP-S: MCP Gateway</h1>
</p>
<p align="center">
  Gateway and integration layer for MCP (Model Context Protocol).
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@mcp-s/mcp"><img src="https://img.shields.io/npm/v/@mcp-s/mcp?style=flat-square&label=latest&color=purple" alt="npm latest release" /></a>
  <a href="https://www.npmtrends.com/@mcp-s/mcp"><img src="https://img.shields.io/npm/dm/@mcp-s/mcp?style=flat-square&color=cyan" alt="Downloads" /></a>
  <a href="https://github.com/webrix-ai/mcp-gateway/stargazers"><img src="https://img.shields.io/github/stars/webrix-ai/mcp-gateway?style=flat-square&color=orange" alt="GitHub Stars" /></a>
</p>

---

## Overview

**mcp-gateway** is a secure gateway and integration layer for the **Model Context Protocol (MCP)**. It provides a unified, enterprise-ready interface for connecting, managing, and extending MCP modules and services, with a focus on security and seamless integration.

## Features

- **Enterprise-grade Security**: Secure SSO authentication for all MCP interactions (works with any OAuth provider via [Auth.js](https://authjs.dev))
- **On-Premise Hosting**: Deploy within your own infrastructure for maximum control and compliance
- **20+ Pre-built Connectors**: Fast plug-and-play integration with hundreds of tools
- **Roles & Permissions**: Granular access control with custom role definitions
- **Custom Tools**: Build and integrate your own tools with a flexible API
- **API ➜ MCP**: Seamlessly build MCP tools from any API, maintaining a secure connection
- **TypeScript Support**: Fully typed for robust development
- **Scalable & Reliable**: Designed for enterprise and organizational use

## License

[MIT](./LICENSE)

---

## Authentication Setup

<a href="https://authjs.dev" target="_blank"><img width="32px" style="vertical-align:middle; margin-right:8px;" src="https://authjs.dev/img/logo-sm.png" alt="Auth.js logo" /></a>

mcp-gateway supports authentication with **any OAuth provider** using [Auth.js](https://authjs.dev). Simply set the `AUTH_PROVIDER` environment variable and provide the required credentials for your provider.

### Required Environment Variables

- `AUTH_SECRET` – A random string used to sign/encrypt tokens (generate with `openssl rand -base64 33`)
- `AUTH_PROVIDER` – The provider to use (e.g. `google`, `okta`, `azure-ad`, ...)
- Provider-specific variables (see below)

### Example: Google

```
AUTH_SECRET=your-random-secret
AUTH_PROVIDER=google
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

### Example: Okta

```
AUTH_SECRET=your-random-secret
AUTH_PROVIDER=okta
AUTH_OKTA_ID=your-okta-client-id
AUTH_OKTA_SECRET=your-okta-client-secret
AUTH_OKTA_ISSUER=https://your-okta-domain.okta.com/oauth2/default
```

### Example: Azure-AD

```
AUTH_SECRET=your-random-secret
AUTH_PROVIDER=azure-ad
AUTH_AZURE_AD_ID=your-azure-client-id
AUTH_AZURE_AD_SECRET=your-azure-client-secret
AUTH_AZURE_AD_TENANT_ID=your-tenant-id-or-common
```

> For other providers, see the [Auth.js Providers documentation](https://authjs.dev/reference/core/providers/).
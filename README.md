<p align="center">
  <a href="https://www.mcp-s.com" target="_blank"><img height="96" src="https://www.mcp-s.com/logo.png" alt="MCP-Gateway logo" /></a>
</p>
<h1 align="center">MCP-S Gateway<br/><small>secure, open-source MCP authentication &amp; OAuth gateway</small></h1>

<p align="center">
  Gateway + integration layer for the <strong>Model Context Protocol (MCP)</strong> – perfect for “<em>mcp auth open source github</em>” and “<em>mcp oauth example</em>” searches.
</p>

<p align="center">
  <a href="https://github.com/webrix-ai/mcp-gateway/blob/main/LICENSE"><img src="https://img.shields.io/github/license/webrix-ai/mcp-gateway?style=flat-square&color=green" alt="MIT license" /></a>
  <a href="https://www.npmjs.com/package/@mcp-s/mcp"><img src="https://img.shields.io/npm/v/@mcp-s/mcp?style=flat-square&label=npm&color=purple" alt="npm latest" /></a>
  <a href="https://www.npmtrends.com/@mcp-s/mcp"><img src="https://img.shields.io/npm/dm/@mcp-s/mcp?style=flat-square&color=cyan" alt="npm downloads" /></a>
  <a href="https://github.com/webrix-ai/mcp-gateway/stargazers"><img src="https://img.shields.io/github/stars/webrix-ai/mcp-gateway?style=flat-square&color=orange" alt="GitHub stars" /></a>
</p>

---

## Why MCP-S Gateway?

Searching for **“mcp gateway github”**, **“mcp sso open source example”**, or **“model context protocol sso”** usually leads developers to scattered scripts or closed-source proxies.  
**MCP-S Gateway** changes that: an MIT-licensed, TypeScript-first project that drops into any stack and provides a **self-hosted, OAuth-ready, SSO gateway** for every MCP server you run.

> **Quick facts**  
> • 100 % open source – no hidden paywalls  
> • Works with Auth.js (80+ OAuth providers) for true *MCP OAuth login*  
> • Ships as an npm script; deploy with PM2, Docker, Kubernetes, or plain `node`  

---

## Features <!-- mcp auth open source / mcp authentication keywords baked in -->

| Capability | Details |
|------------|---------|
| **Self-Hosted Gateway** | Keep data inside your infra – ideal for “mcp auth open source android / python” use cases. |
| **OAuth / SSO** | Plug in any provider from [Auth.js](https://authjs.dev) – Google, Okta, Azure AD, etc. |
| **TypeScript Types** | Fully typed API and config for safe DX. |
| **Supports All MCP Connection Types** | **STDIO**, **SSE**, **StreamableHTTP** – no extra adapters. |
| **MIT License** | Fork, extend, embed – zero restriction. |

---

## Quick Start – *“mcp oauth tutorial” style*

```bash
# 1 – install & run
npm install && npm run start   # ships with sensible defaults (PORT 3000)

# 2 – create mcp.json (register your own servers)
# see example below

mcp.json template (drop in root of your project):

{
  "mcpServers": {
    "my-secure-server": {
      "command": "npx",
      "args": ["-y", "@acme/mcp-server"],
      "env": { "API_KEY": "your-api-key" }
    }
  }
}

Connect IDEs / AI terminals

Cursor / Claude Desktop / VS Code:

{
  "mcpServers": {
    "mcp-gateway": {
      "command": "npx",
      "args": ["-y", "@mcp-s/mcp"],
      "env": { "BASE_URL": "http://localhost:3000" }
    }
  }
}

Now every tool behind mcp-gateway is reachable with single-sign-on.

⸻

Deployment Cheatsheet – great for “mcp gateway example”

Target	Command
PM2	pm2 start npm --name mcp-gateway -- run start
Docker	docker build -t mcp-gateway . && docker run -p 3000:3000 mcp-gateway
Kubernetes	Use the provided k8s/deployment.yaml manifest (edit secrets).
Heroku ∕ Railway ∕ Render	One-click import; set env vars in dashboard.


⸻

OAuth / SSO Setup

MCP-S Gateway relies on Auth.js – the de-facto open-source MCP OAuth library.

<details><summary>Google OAuth</summary>


AUTH_PROVIDER=google
AUTH_SECRET=change-me
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...

</details>


<details><summary>Okta OAuth</summary>


AUTH_PROVIDER=okta
AUTH_OKTA_ID=...
AUTH_OKTA_SECRET=...
AUTH_OKTA_ISSUER=https://your-domain.okta.com/oauth2/default

</details>


(Any Auth.js provider works – Facebook, GitHub, Azure AD, Keycloak, etc.)

⸻

Advanced Configuration

ENV	Description	Default
PORT	HTTP port	3000
BASE_URL	Public URL (used by OAuth callbacks)	http://localhost:3000
AUTH_SECRET	Token‐signing key	required
AUTH_PROVIDER	e.g. google, okta, azure-ad	google
DB_PATH	SQLite DB file	./mcp.sqlite
TOKEN_EXPIRATION_TIME	JWT TTL (ms)	86400000


⸻

Hosted Edition 

Prefer zero-ops? mcp-s.com runs MCP-S Gateway for you – click, connect, done.

⸻

Demo & Video
	•	Live Demo: coming soon (https://demo.mcp-s.com)
	•	5-Minute Tutorial Video: coming soon – watch a full “mcp oauth login” flow.

⸻

License

Released under the MIT License. Contributions welcome – star & fork!

⸻
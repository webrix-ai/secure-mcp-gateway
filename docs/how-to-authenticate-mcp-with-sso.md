# Secure Your MCP Servers with SSO: The Ultimate Guide to SSO Authentication for MCP (with Google Example)

Are you running Model Context Protocol (MCP) servers and worried about security, compliance, or user management? Want to connect your AI/LLM infrastructure to Single Sign-On (SSO) with your favorite Identity Provider (IDP)-like Google, Okta, or Azure AD? This guide is for you! Learn how to secure MCP with SSO using a free, open-source solution - **Secure MCP Gateway**, and why SSO is a must for modern AI teams.

---

## What is MCP, and Why Does Authentication Matter?

**Model Context Protocol (MCP)** is an open standard for connecting AI models, tools, and clients. It powers integrations between LLMs, developer tools, and custom AI workflows. But as your AI stack grows, so does the need for secure, centralized authentication; Especially if you're working in a team or enterprise environment.

### The Security Problem with Bare MCP Servers

- **No Authentication:** Anyone who finds your MCP endpoint can access your AI tools and data.
- **Weak Shared Secrets:** Hardcoded or shared passwords are easily leaked or forgotten.
- **No User Management:** Can't onboard/offboard users, set roles, or audit access.
- **Compliance Risks:** Fails requirements for SOC2, HIPAA, GDPR, and more.

> **Bottom line:** Unauthenticated MCP servers are a security and compliance risk. SSO solves this.

---

## Why SSO for MCP? (and What is SSO?)

**Single Sign-On (SSO)** lets users log in once with their organization or provider account (like Google, Okta, Azure AD) and access all authorized tools - no more juggling passwords.

### Benefits of SSO for MCP Authentication

- **Centralized Access Control:** Manage all users and permissions in your IDP.
- **Stronger Security:** Enforce MFA, password policies, and audit trails.
- **Better User Experience:** One login for all your tools.
- **Easy Onboarding/Offboarding:** Add or remove users instantly.
- **Compliance:** Meet enterprise security requirements.

---

## The Open-Source Solution: MCP Gateway

[Secure MCP Gateway](https://github.com/mcp-s-ai/secure-mcp-gateway) is a free, open-source, self-hosted SSO gateway for MCP authentication. It acts as a secure bridge between your MCP servers and any SSO provider, including Google, Okta, Azure AD, and 80+ others (thanks to [Auth.js](https://authjs.dev)).

- **Self-hosted:** Full control, no vendor lock-in
- **Open-source:** Transparent, auditable, and free
- **Flexible:** Works with any MCP client (Cursor, Claude, VSCode, Your own AI agents, etc.)

---

## Step-by-Step: Secure MCP with SSO (Google Example)

### 1. Set Up an OAuth App with Your Provider (Google Example)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to Credentials: From the left-hand menu, select "APIs & Services" and then "Credentials".
3. Create a new OAuth client ID: Click on "Create Credentials" and then select "OAuth client ID".
4. Configure the OAuth consent screen: If this is the first time you're creating an OAuth client ID, you'll be prompted to configure the consent screen. This involves providing your application's name, support email, and other relevant information.
5. Choose the application type: Web application
6. Configure authorized redirect URIs (for web applications): Should be http://localhost:3000 but Google doesn't let you enter an http so you can use [ngrok](https://ngrok.com/docs/agent/#example-usage) to tunnel with HTTPS (`ngrok http 8080`))
7. Create the client ID and secret: Click "Create" to generate the OAuth client ID and secret. You will need these values for next steps.

> For other providers, see the [Auth.js Providers documentation](https://authjs.dev/reference/core/providers/).

### 2. Configure MCP Gateway with Provider Credentials

Create a `.env` file in your project root:

```env
AUTH_SECRET=your-random-secret
AUTH_PROVIDER=google
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

> Generate `AUTH_SECRET` with: `openssl rand -base64 33`

### 3. Configure MCP Servers

Create an `mcp.json` file to define your MCP servers for your organization:

> These sensitive tokens are never exposed to your users

Example:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=<project-ref>"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "<personal-access-token>"
      }
    },
    "notionApi": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "OPENAPI_MCP_HEADERS": "{\"Authorization\": \"Bearer ntn_****\", \"Notion-Version\": \"2022-06-28\" }"
      }
    },
    "linear": {
      "command": "npx",
      "args": ["-y", "@tacticlaunch/mcp-linear"],
      "env": {
        "LINEAR_API_TOKEN": "<YOUR_TOKEN>"
      }
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

### 4. Start MCP Gateway and Test SSO Login

```bash
npx @mcp-s/secure-mcp-gateway --envfile .env --mcp-config ./mcp.json
```

Visit `http://localhost:3000` and sign in with Google SSO. You're now protected by SSO!

---

## How It Works (Under the Hood)

1. **User visits MCP Gateway** and clicks "Sign in with Google" (or your chosen provider).
2. **Provider authenticates the user** and redirects back to the gateway.
3. **MCP Gateway issues a secure session/token**.
4. **User accesses MCP servers** - all requests are authenticated!

Secure MCP Gateway handles token management, session security, and works with any MCP client (Cursor, Claude, VSCode, etc.).

---

## Beyond Google: Other Providers & Advanced Tips

- Supports Keycloak, Okta, Azure AD, and 80+ providers out of the box.
- Add custom providers via [Auth.js](https://authjs.dev/reference/core/providers/).
- Advanced: Use custom scopes, claims, or multi-provider setups.

---

## Why Open Source? (and Why It's Free)

- **Transparency:** Audit the code, trust the process.
- **Control:** Deploy anywhere—cloud, on-prem, or even air-gapped.
- **Community:** Join our [Slack](https://join.slack.com/t/mcp-s/shared_invite/zt-388bm69k5-dACbMA5AwLKhNkdg4GwzLQ) for support and ideas.

---

## Troubleshooting & FAQ

**Q: I get an error after SSO login!**

- Double-check your provider Client ID, Secret, and callback URL.
- Make sure your redirect URI matches in your provider and `.env`.

**Q: Can I use another SSO/IDP?**

- Yes! Just set `AUTH_PROVIDER` and the relevant variables for your provider.

**Q: Is this really free?**

- 100%. MIT-licensed, open-source, and community-driven.

---

## Conclusion & Next Steps

Securing your MCP servers with SSO is easier than ever—no more cobbling together custom auth flows or worrying about compliance. With MCP Gateway, you get a free, open-source, and enterprise-ready solution that just works.

- ⭐ [Star us on GitHub](https://github.com/mcp-s-ai/secure-mcp-gateway)
- 💬 [Join our Slack community](https://join.slack.com/t/mcp-s/shared_invite/zt-388bm69k5-dACbMA5AwLKhNkdg4GwzLQ)
- 🚀 [Get started now](https://github.com/mcp-s-ai/secure-mcp-gateway)

Happy authenticating!

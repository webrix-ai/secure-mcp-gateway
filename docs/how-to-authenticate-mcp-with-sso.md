# Secure Your MCP Servers with SSO: The Ultimate Guide to SSO Authentication for MCP (with GitHub Example)

Are you running Model Context Protocol (MCP) servers and worried about security, compliance, or user management? Want to connect your AI/LLM infrastructure to Single Sign-On (SSO) with your favorite Identity Provider (IDP)—like GitHub, Google, Okta, or Azure AD? This guide is for you! Learn how to secure MCP with SSO using a free, open-source solution—**MCP Gateway**—and why SSO is a must for modern AI teams.

---

## What is MCP, and Why Does Authentication Matter?

**Model Context Protocol (MCP)** is an open standard for connecting AI models, tools, and clients. It powers integrations between LLMs, developer tools, and custom AI workflows. But as your AI stack grows, so does the need for secure, centralized authentication—especially if you're working in a team or enterprise environment.

### The Security Problem with Bare MCP Servers

- **No Authentication:** Anyone who finds your MCP endpoint can access your AI tools and data.
- **Weak Shared Secrets:** Hardcoded or shared passwords are easily leaked or forgotten.
- **No User Management:** Can't onboard/offboard users, set roles, or audit access.
- **Compliance Risks:** Fails requirements for SOC2, HIPAA, GDPR, and more.

> **Bottom line:** Unauthenticated MCP servers are a security and compliance risk. SSO solves this.

---

## Why SSO for MCP? (and What is SSO?)

**Single Sign-On (SSO)** lets users log in once with their organization or provider account (like GitHub, Google, Okta, Azure AD) and access all authorized tools—no more juggling passwords.

### Benefits of SSO for MCP Authentication

- **Centralized Access Control:** Manage all users and permissions in your IDP.
- **Stronger Security:** Enforce MFA, password policies, and audit trails.
- **Better User Experience:** One login for all your tools.
- **Easy Onboarding/Offboarding:** Add or remove users instantly.
- **Compliance:** Meet enterprise security requirements.

> **Real-world risk:** Without SSO, ex-employees or outsiders may retain access to your AI stack!

---

## The Open-Source Solution: MCP Gateway

[MCP Gateway](https://github.com/webrix-ai/mcp-gateway) is a free, open-source, self-hosted OAuth gateway for MCP authentication. It acts as a secure bridge between your MCP servers and any OAuth provider—including GitHub, Google, Okta, Azure AD, and 80+ others (thanks to [Auth.js](https://authjs.dev)).

- **Self-hosted:** Full control, no vendor lock-in
- **Open-source:** Transparent, auditable, and free
- **Flexible:** Works with any MCP client (Cursor, Claude, VSCode, etc.)

---

## Step-by-Step: Secure MCP with SSO (GitHub Example)

### 1. Set Up an OAuth App with Your Provider (GitHub Example)

- Go to your [GitHub Developer Settings](https://github.com/settings/developers).
- Click "New OAuth App".
- Set the **Authorization callback URL** to your MCP Gateway (e.g., `http://localhost:3000/api/auth/callback/github`).
- Note your **Client ID** and **Client Secret**.

> For other providers, see the [Auth.js Providers documentation](https://authjs.dev/reference/core/providers/).

### 2. Configure MCP Gateway with Provider Credentials

Create a `.env` file in your project root:

```env
AUTH_SECRET=your-random-secret
AUTH_PROVIDER=github
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret
```

> Generate `AUTH_SECRET` with: `openssl rand -base64 33`

### 3. Configure MCP Servers

Create an `mcp.json` file to define your MCP servers:

```json
{
  "mcpServers": {
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

Visit `http://localhost:3000` and sign in with GitHub. You're now protected by SSO!

---

## How It Works (Under the Hood)

1. **User visits MCP Gateway** and clicks "Sign in with GitHub" (or your chosen provider).
2. **Provider authenticates the user** and redirects back to the gateway.
3. **MCP Gateway issues a secure session/token**.
4. **User accesses MCP servers**—all requests are authenticated!

MCP Gateway handles token management, session security, and works with any MCP client (Cursor, Claude, VSCode, etc.).

---

## Beyond GitHub: Other Providers & Advanced Tips

- Supports Google, Okta, Azure AD, and 80+ providers out of the box.
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

- ⭐ [Star us on GitHub](https://github.com/webrix-ai/mcp-gateway)
- 💬 [Join our Slack community](https://join.slack.com/t/mcp-s/shared_invite/zt-388bm69k5-dACbMA5AwLKhNkdg4GwzLQ)
- 🚀 [Get started now](https://github.com/webrix-ai/mcp-gateway)

Happy authenticating!

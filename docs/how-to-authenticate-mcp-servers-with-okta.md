# How to Authenticate MCP Servers with Okta: Complete SSO Integration Guide

## Table of Contents

- [What is MCP Authentication?](#what-is-mcp-authentication)
- [Why Use SSO for MCP Servers?](#why-use-sso-for-mcp-servers)
- [Prerequisites](#prerequisites)
- [Setting up Okta for MCP Authentication](#setting-up-okta-for-mcp-authentication)
- [Installing MCP-S Gateway](#installing-mcp-s-gateway)
- [Configuring Okta OAuth](#configuring-okta-oauth)
- [Testing Your Setup](#testing-your-setup)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)
- [Security Best Practices](#security-best-practices)

## What is MCP Authentication?

The **Model Context Protocol (MCP)** is a standardized protocol that enables AI applications to securely connect to external data sources and tools. However, by default, MCP servers often lack enterprise-grade authentication mechanisms. This is where **MCP authentication** becomes crucial.

**MCP-S Gateway** is a free, open-source SSO gateway that adds secure authentication to any MCP server, enabling you to:

- Connect your Identity Provider (IDP) to MCP servers
- Implement Single Sign-On (SSO) for all MCP interactions
- Maintain centralized access control and audit trails
- Ensure enterprise security compliance

## Why Use SSO for MCP Servers?

### Enterprise Security Benefits

- **Centralized Authentication**: Manage all MCP access through your existing Okta infrastructure
- **Zero Trust Architecture**: Every MCP interaction requires proper authentication
- **Audit Compliance**: Track all MCP server access through Okta logs
- **Role-Based Access**: Control which users can access specific MCP tools and resources

### Developer Experience

- **Single Login**: Users authenticate once with Okta for all MCP servers
- **Seamless Integration**: Works with popular AI clients (Claude, Cursor, VSCode, Windsurf)
- **No Code Changes**: Add authentication without modifying existing MCP servers

## Prerequisites

Before setting up Okta authentication for your MCP servers, ensure you have:

- **Okta Administrator Access**: Ability to create and configure OAuth applications
- **Existing MCP Servers**: Either custom or third-party MCP implementations

## Setting up Okta for MCP Authentication

1. **Login to [Okta Admin Console](https://developer.okta.com/)**

   - Navigate to your Okta domain admin panel
   - Go to **Applications** → **Applications**

2. **Create New Application**

   - Click **Create App Integration**
   - Select **OIDC - OpenID Connect**
   - Choose **Web Application**

3. **Configure Application Settings**

   ```bash
   Application Name: MCP-S Gateway
   Grant Type: Authorization Code
   Sign-in redirect URIs: http://localhost:3000/auth/callback/okta
   Sign-out redirect URIs: http://localhost:3000/auth/signout
   Controlled access: Allow everyone in your organization to access
   ```

4. **Save and Note Credentials**
   - Copy the **Client ID**
   - Copy the **Client Secret**
   - Note your **Issuer URL**

[Full Okta OIDC setup guide →](https://authjs.dev/reference/core/providers/okta#setup)

## Installing MCP-S Gateway

1. **Configure env file**

Create a `.env` file:

```env
AUTH_SECRET=your-random-secret
AUTH_PROVIDER=okta
AUTH_OKTA_ID=your-okta-client-id
AUTH_OKTA_SECRET=your-okta-client-secret
AUTH_OKTA_ISSUER=https://your-okta-domain.okta.com/oauth2/default
```

> Generate `AUTH_SECRET` with: `openssl rand -base64 33`

2. **Configure your MCP Servers**

Create an `mcp.json` file to define your MCP servers:

> These sensitive tokens are never exposed to your users

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

3. **Start the Secure MCP Gateway**

```bash
npx @mcp-s/secure-mcp-gateway --envfile <path-to-env> --mcp-config <path-to-mcp-config>
```

## Testing Your Setup

1. **Verify Gateway Health**

```bash
# Check if the gateway is running
curl http://localhost:3000

# Expected response:
# {"message":"Hello from MCP-S","session":null}
```

2. **Test Authentication Flow**

   - **Access the Gateway**

     - Open `http://localhost:3000/auth/signin` in your browser
     - You should be redirected to Okta login

   - **Go to your MCP Client (e.g. Cursor)**
     - Add to the MCP servers' config:

   ```json
   {
     "mcpServers": {
       "okta-mcp-gateway": {
         "url": "http://localhost:3000/mcp"
       }
     }
   }
   ```

   - **Login**
     - Cursor now has a "Needs Login" button next to the mcp
     - Authenticate

Enjoy your tools! 🎉

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Invalid Okta Issuer URL"

**Solution:** Ensure your `AUTH_OKTA_ISSUER` follows the correct format:

```env
AUTH_OKTA_ISSUER=https://your-domain.okta.com/oauth2/default
```

#### Issue: "OAuth callback mismatch"

**Solution:** Verify redirect URIs in Okta match exactly:

- Development: `http://localhost:3000/auth/callback/okta`
- Production: `https://your-domain.com/auth/callback/okta`

#### Issue: "Tools not appearing in Cursor"

**Solution:** Ensure only one Cursor window is open when establishing the MCP connection.

#### Issue: "In my browser, I get an error"

If you're opening the URL on the browser and get the error:

```bash
[auth][cause]: Error: no matching decryption secret
```

**Solution:** You probably need to clean your cookies 🍪 :)

## Support and Community

### Getting Help

- **GitHub Issues**: [Report bugs and request features](https://github.com/mcp-s-ai/secure-mcp-gateway/issues)
- **Community Slack**: [Join our Slack workspace](https://join.slack.com/t/mcp-s/shared_invite/zt-388bm69k5-dACbMA5AwLKhNkdg4GwzLQ)

## Conclusion

By implementing Okta authentication for your MCP servers using MCP-S Gateway, you've established enterprise-grade security for your AI infrastructure. This setup provides:

- **Centralized authentication** through your existing Okta deployment
- **Zero-trust security** for all MCP interactions
- **Scalable architecture** that grows with your organization
- **Open-source flexibility** without vendor lock-in

The MCP-S Gateway bridges the gap between powerful MCP servers and enterprise security requirements, making it the ideal solution for organizations looking to securely deploy AI tools while maintaining strict access control.

---

## Related Resources

- [MCP-S Gateway GitHub Repository](https://github.com/mcp-s-ai/secure-mcp-gateway)
- [Auth.js Okta Provider Documentation](https://authjs.dev/reference/core/providers/okta)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Okta Developer Console](https://developer.okta.com/)

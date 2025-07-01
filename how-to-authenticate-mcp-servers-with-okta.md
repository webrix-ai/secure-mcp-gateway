# How to Authenticate MCP Servers with Okta: Complete SSO Integration Guide

**Secure your Model Context Protocol (MCP) servers with enterprise-grade Okta authentication using our free, open-source MCP-S Gateway solution.**

![MCP Okta Authentication](https://www.mcp-s.com/logo.png)

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

**MCP-S Gateway** is a free, open-source OAuth gateway that adds secure authentication to any MCP server, enabling you to:
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
- **Node.js 22+**: Required for the MCP-S Gateway ([download here](https://nodejs.org/))
- **Existing MCP Servers**: Either custom or third-party MCP implementations
- **Network Access**: Ability to run the gateway on your infrastructure

## Setting up Okta for MCP Authentication

### Step 1: Create an Okta OAuth Application

1. **Login to Okta Admin Console**
   - Navigate to your Okta domain admin panel
   - Go to **Applications** → **Applications**

2. **Create New Application**
   - Click **Create App Integration**
   - Select **OIDC - OpenID Connect**
   - Choose **Web Application**

3. **Configure Application Settings**
   ```
   Application Name: MCP-S Gateway
   Grant Type: Authorization Code
   Sign-in redirect URIs: http://localhost:3000/auth/callback/okta
   Sign-out redirect URIs: http://localhost:3000/auth/signout
   Controlled access: Allow everyone in your organization to access
   ```

4. **Save and Note Credentials**
   - Copy the **Client ID**
   - Copy the **Client Secret**
   - Note your **Okta Domain** (e.g., `your-company.okta.com`)

### Step 2: Configure Okta Authorization Server

1. **Access Authorization Servers**
   - Go to **Security** → **API** → **Authorization Servers**
   - Use the `default` server or create a custom one

2. **Note the Issuer URL**
   - Format: `https://your-okta-domain.okta.com/oauth2/default`
   - You'll need this for the gateway configuration

## Installing MCP-S Gateway

### Quick Start with npx (Recommended)

The fastest way to get started is using npx:

```bash
# Install and run in one command
npx @mcp-s/secure-mcp-gateway
```

### Alternative: Clone and Install

```bash
# Clone the repository
git clone https://github.com/mcp-s-ai/secure-mcp-gateway.git
cd secure-mcp-gateway

# Install dependencies
npm install

# Start the gateway
npm run start
```

## Configuring Okta OAuth

### Step 1: Create Environment Configuration

Create a `.env` file in your project root:

```env
# Authentication Configuration
AUTH_SECRET=your-super-secret-jwt-key-generate-with-openssl-rand-base64-33
AUTH_PROVIDER=okta
AUTH_OKTA_ID=your-okta-client-id
AUTH_OKTA_SECRET=your-okta-client-secret
AUTH_OKTA_ISSUER=https://your-okta-domain.okta.com/oauth2/default

# Gateway Configuration
PORT=3000
BASE_URL=http://localhost:3000
TOKEN_EXPIRATION_TIME=86400000
DB_PATH=./mcp.sqlite
```

### Step 2: Generate AUTH_SECRET

Generate a secure secret for JWT token signing:

```bash
# On Linux/macOS
openssl rand -base64 33

# On Windows (using PowerShell)
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Step 3: Configure MCP Servers

Create an `mcp.json` file to define your MCP servers:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
      "env": {}
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-github-token"
      }
    },
    "database": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://user:pass@localhost:5432/db"
      }
    }
  }
}
```

### Step 4: Start the Gateway with Custom Configuration

```bash
# Using custom configuration files
npx @mcp-s/secure-mcp-gateway --mcp-config ./mcp.json --envfile ./.env

# Or with the cloned repository
npm run start
```

## Testing Your Setup

### Step 1: Verify Gateway Health

```bash
# Check if the gateway is running
curl http://localhost:3000/health

# Expected response:
# {"status":"ok"}
```

### Step 2: Test Authentication Flow

1. **Access the Gateway**
   - Open `http://localhost:3000/auth/signin` in your browser
   - You should be redirected to Okta login

2. **Complete Okta Authentication**
   - Enter your Okta credentials
   - Grant permissions to the MCP-S Gateway application
   - You should be redirected back to the gateway

3. **Verify Tool Access**
   ```bash
   # List available MCP tools
   curl http://localhost:3000/tools
   ```

### Step 3: Connect to AI Clients

Configure your AI client to use the authenticated MCP gateway:

**For Claude/Cursor (StreamableHTTP):**
```json
{
  "mcpServers": {
    "mcp-gateway": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

**For STDIO Clients:**
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

#### Issue: "Node.js SQLite module error"
**Solution:** Upgrade to Node.js 22+ as the gateway requires the built-in SQLite module:
```bash
# Using nvm
nvm install 22 && nvm use 22

# Verify version
node --version
```

#### Issue: "Tools not appearing in Cursor"
**Solution:** Ensure only one Cursor window is open when establishing the MCP connection.

### Debug Mode

Enable detailed logging for troubleshooting:

```env
# Add to your .env file
DEBUG=mcp-gateway:*
LOG_LEVEL=debug
```

## Advanced Configuration

### Production Deployment

For production environments, consider these additional configurations:

```env
# Production Environment Variables
NODE_ENV=production
BASE_URL=https://your-mcp-gateway-domain.com
PORT=443

# Enhanced Security
AUTH_SECRET=very-long-random-string-for-production
TOKEN_EXPIRATION_TIME=3600000  # 1 hour

# Database Configuration
DB_PATH=/var/lib/mcp-gateway/mcp.sqlite

# Okta Production Settings
AUTH_OKTA_ISSUER=https://your-company.okta.com/oauth2/default
```

### Process Management

Use PM2 for production process management:

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start "npx @mcp-s/secure-mcp-gateway" --name mcp-gateway

# Auto-restart on system reboot
pm2 startup
pm2 save
```

### Docker Deployment

Create a `Dockerfile` for containerized deployment:

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install gateway globally
RUN npm install -g @mcp-s/secure-mcp-gateway

# Copy configuration files
COPY mcp.json .env ./

EXPOSE 3000

CMD ["npx", "@mcp-s/secure-mcp-gateway"]
```

### Load Balancing

For high-availability setups, use nginx as a reverse proxy:

```nginx
upstream mcp_gateway {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;
    server_name your-mcp-gateway.com;

    location / {
        proxy_pass http://mcp_gateway;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Security Best Practices

### 1. Environment Security
- **Never commit secrets**: Keep `.env` files out of version control
- **Use environment variables**: Inject secrets at runtime in production
- **Rotate credentials**: Regularly update OAuth secrets and AUTH_SECRET

### 2. Network Security
- **HTTPS in production**: Always use TLS encryption for production deployments
- **Firewall rules**: Restrict access to necessary ports only
- **VPN access**: Consider requiring VPN for internal MCP servers

### 3. Okta Configuration
- **Principle of least privilege**: Only grant necessary scopes and permissions
- **Group-based access**: Use Okta groups to control MCP access
- **Session management**: Configure appropriate session timeouts

### 4. Monitoring and Auditing
- **Enable logging**: Track all authentication and authorization events
- **Monitor failed attempts**: Set up alerts for suspicious activity
- **Regular audits**: Review access logs and user permissions

### 5. Backup and Recovery
- **Database backups**: Regularly backup the SQLite database
- **Configuration backups**: Keep versioned copies of configuration files
- **Disaster recovery**: Document recovery procedures

## Integration Examples

### Enterprise Workflow

Here's how a typical enterprise setup might look:

```mermaid
graph TB
    A[AI Client] --> B[MCP-S Gateway]
    B --> C[Okta Authentication]
    C --> D[User Authentication]
    D --> E[MCP Server 1]
    D --> F[MCP Server 2]
    D --> G[MCP Server N]
    
    H[Admin] --> I[Okta Admin Console]
    I --> J[User Management]
    I --> K[Access Policies]
```

### Multi-Environment Setup

```bash
# Development
npx @mcp-s/secure-mcp-gateway --envfile ./.env.dev

# Staging
npx @mcp-s/secure-mcp-gateway --envfile ./.env.staging

# Production
npx @mcp-s/secure-mcp-gateway --envfile ./.env.prod
```

## Support and Community

### Getting Help

- **GitHub Issues**: [Report bugs and request features](https://github.com/webrix-ai/mcp-gateway/issues)
- **Community Slack**: [Join our Slack workspace](https://join.slack.com/t/mcp-s/shared_invite/zt-388bm69k5-dACbMA5AwLKhNkdg4GwzLQ)
- **Documentation**: [Official docs](https://www.mcp-s.com)

### Contributing

MCP-S Gateway is open-source and welcomes contributions:

```bash
# Fork and clone the repository
git clone https://github.com/webrix-ai/mcp-gateway.git

# Create a feature branch
git checkout -b feature/your-feature

# Make changes and test
npm run test

# Submit a pull request
```

## Conclusion

By implementing Okta authentication for your MCP servers using MCP-S Gateway, you've established enterprise-grade security for your AI infrastructure. This setup provides:

- **Centralized authentication** through your existing Okta deployment
- **Zero-trust security** for all MCP interactions
- **Scalable architecture** that grows with your organization
- **Open-source flexibility** without vendor lock-in

The MCP-S Gateway bridges the gap between powerful MCP servers and enterprise security requirements, making it the ideal solution for organizations looking to securely deploy AI tools while maintaining strict access control.

---

## Related Resources

- [MCP-S Gateway GitHub Repository](https://github.com/webrix-ai/mcp-gateway)
- [Auth.js Okta Provider Documentation](https://authjs.dev/reference/core/providers/okta)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Okta Developer Documentation](https://developer.okta.com/)

**Ready to secure your MCP servers?** [Get started with MCP-S Gateway today](https://github.com/webrix-ai/mcp-gateway) - it's free, open-source, and takes less than 5 minutes to set up.
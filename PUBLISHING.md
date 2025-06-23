# Publishing Guide

This document explains how automated publishing works for this project.

## Automated Publishing Setup

### GitHub Secrets Required

The automated publishing workflow requires the following GitHub secret:

1. **NPM_TOKEN**: Your npm publish token
   - Go to [npm.com/settings/tokens](https://www.npmjs.com/settings/tokens)
   - Create a new "Automation" token with "Publish" permission
   - Add it to your GitHub repository secrets as `NPM_TOKEN`
   - Go to your repo → Settings → Secrets and variables → Actions → New repository secret

### How It Works

1. **Automatic Publishing**: Every push to the `main` branch triggers the publish workflow
2. **Version Bumping**: The workflow automatically bumps the patch version
3. **Smart Publishing**: Only publishes if there are actual changes since the last tag
4. **Skip Publishing**: Add `[skip-publish]` to your commit message to skip publishing

### Publishing Process

1. Make your changes and commit them
2. Push to main branch:
   ```bash
   git push origin main
   ```
3. GitHub Actions will:
   - Run tests and build
   - Bump version automatically (patch increment)
   - Publish to npm
   - Create GitHub release
   - Tag the commit

### Manual Publishing

If you need to publish manually:

```bash
# Bump version manually
npm version patch  # or minor/major

# Build and publish
npm run build
npm publish

# Push tags
git push --tags
```

### Testing Before Publishing

Always test locally before publishing:

```bash
# Test the npx functionality locally
npm run test:local

# Test the CI pipeline locally (if you have act installed)
act -j publish --secret NPM_TOKEN=your-test-token
```

## Version Strategy

- **Patch** (1.0.1 → 1.0.2): Bug fixes, small improvements
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Major** (1.0.0 → 2.0.0): Breaking changes

The automated workflow currently only does patch bumps. For minor/major releases, bump manually then push.

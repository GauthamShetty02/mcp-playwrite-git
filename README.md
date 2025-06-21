# Git MCP Server with Bitbucket Support

A Model Context Protocol server that provides Git operations with special support for Bitbucket PR creation using Playwright for authentication.

## Features

- Standard Git operations (status, add, commit, push, pull, etc.)
- GitHub PR creation
- **Bitbucket PR creation with automated authentication handling**
- Browser automation for seamless auth flow

## Installation

```bash
npm install
npx playwright install chromium
```

## Usage

### For Bitbucket PR Creation

Use the `bitbucket_auth_pr` tool which will:

1. Sign in to Bitbucket first
2. Open the specific PR creation URL
3. Fill the PR form automatically
4. Click Create PR button
5. Keep browser open (never closes)

### Example

```javascript
{
  "tool": "bitbucket_auth_pr",
  "arguments": {
    "workspace": "jcpstash",
    "repo": "yoda-utilities",
    "source": "feature/modify-package.json",
    "dest": "main",
    "title": "Update package configuration",
    "body": "Modified package.json settings"
  }
}
```

### Authentication Flow

1. Opens Bitbucket login page first
2. Waits for user to authenticate (2 minutes timeout)
3. Navigates to PR creation page with parameters
4. Auto-fills title and description
5. Automatically clicks Create PR button
6. Browser stays open indefinitely

## Examples

### 1. Quick Test
```bash
node quick-test.js
```

### 2. Standalone PR Creation
```bash
node example.js
```

### 3. MCP Client Simulation
```bash
node mcp-client-example.js
```

### 4. Full Authentication Test
```bash
node test-bitbucket.js
```

## Tools Available

- `git_status` - Get git status
- `git_add` - Add files to staging
- `git_commit` - Commit changes
- `git_push` - Push to remote
- `git_pull` - Pull from remote
- `git_branch` - List or create branches
- `git_checkout` - Switch branches
- `git_log` - Show commit history
- `git_diff` - Show differences
- `create_pr` - Create GitHub PR
- `create_bitbucket_pr` - Create Bitbucket PR with auth handling
- `bitbucket_auth_pr` - Authenticate and create Bitbucket PR (recommended)
- `open_repo` - Open repository in browser

#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import open from 'open';
import { chromium } from 'playwright';

const server = new Server({
  name: 'git-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

function runGitCommand(args, cwd = process.cwd()) {
  try {
    const output = execSync(`git ${args}`, { cwd, encoding: 'utf8' });
    return { success: true, output: output.trim() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function parseGitHubUrl(url) {
  const patterns = [
    /https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?/,
    /git@github\.com:([^\/]+)\/([^\/]+)(?:\.git)?/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  }
  return null;
}

function parseBitbucketUrl(url) {
  const patterns = [
    /https:\/\/bitbucket\.org\/([^\/]+)\/([^\/]+)(?:\.git)?/,
    /git@bitbucket\.org:([^\/]+)\/([^\/]+)(?:\.git)?/,
    /https:\/\/bitbucket\.org\/([^\/]+)\/workspace\//
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { workspace: match[1], repo: match[2] || 'workspace' };
    }
  }
  return null;
}

async function createBitbucketPRWithAuth(workspace, repo, sourceBranch, targetBranch, title, description) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // First authenticate
    await page.goto('https://bitbucket.org/account/signin/');
    console.error('🔐 Please log in to Bitbucket');
    
    // Wait for login success
    await page.waitForSelector('[data-ds--page-layout--slot="top-navigation"]', { timeout: 120000 });
    console.error('✅ Login successful!');
    
    // Navigate to PR creation page
    const prUrl = `https://bitbucket.org/${workspace}/${repo}/pull-requests/new?source=${sourceBranch}&dest=${targetBranch}`;
    await page.goto(prUrl);
    console.error('🌐 Opened PR creation page');
    
    // Fill PR form
    const titleInput = page.locator('input[name="title"], textarea[name="title"]');
    if (await titleInput.count() > 0) {
      await titleInput.fill(title);
    }
    
    const descInput = page.locator('textarea[name="description"], div[contenteditable="true"]');
    if (await descInput.count() > 0) {
      await descInput.fill(description || '');
    }
    
    // Wait for Create PR button and click it
    await page.waitForSelector('[data-testid="create-PR-button"]', { timeout: 60000 });
    console.error('✅ Found Create PR button');
    
    await page.click('[data-testid="create-PR-button"]');
    console.error('🎯 Clicked Create PR button');
    
    console.error('✅ PR created successfully!');
    
    return prUrl;
  } catch (error) {
    console.error('❌ Error creating Bitbucket PR:', error.message);
    throw error;
  } finally {
    // Keep browser open - don't close
    console.error('🌐 Browser will stay open');
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      { name: 'git_status', description: 'Get git status', inputSchema: { type: 'object', properties: {} } },
      { name: 'git_add', description: 'Add files', inputSchema: { type: 'object', properties: { files: { type: 'string' } } } },
      { name: 'git_commit', description: 'Commit changes', inputSchema: { type: 'object', properties: { message: { type: 'string' } } } },
      { name: 'git_push', description: 'Push to remote', inputSchema: { type: 'object', properties: {} } },
      { name: 'git_pull', description: 'Pull from remote', inputSchema: { type: 'object', properties: {} } },
      { name: 'git_branch', description: 'List/create branches', inputSchema: { type: 'object', properties: { name: { type: 'string' } } } },
      { name: 'git_checkout', description: 'Checkout branch', inputSchema: { type: 'object', properties: { branch: { type: 'string' } } } },
      { name: 'git_log', description: 'Show history', inputSchema: { type: 'object', properties: { count: { type: 'number' } } } },
      { name: 'git_diff', description: 'Show differences', inputSchema: { type: 'object', properties: {} } },
      { name: 'create_pr', description: 'Create PR', inputSchema: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' }, base: { type: 'string' } } } },
      { name: 'create_bitbucket_pr', description: 'Create Bitbucket PR with auth', inputSchema: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' }, base: { type: 'string' } }, required: ['title'] } },
      { name: 'bitbucket_auth_pr', description: 'Authenticate and create Bitbucket PR', inputSchema: { type: 'object', properties: { workspace: { type: 'string' }, repo: { type: 'string' }, source: { type: 'string' }, dest: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } }, required: ['workspace', 'repo', 'source', 'title'] } },
      { name: 'open_repo', description: 'Open repo in browser', inputSchema: { type: 'object', properties: {} } }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error(`🔧 Executing tool: ${name}`, args ? `with args: ${JSON.stringify(args)}` : '');

  switch (name) {
    case 'git_status':
      const status = runGitCommand('status --porcelain');
      return { content: [{ type: 'text', text: status.success ? status.output : status.error }] };

    case 'git_add':
      const add = runGitCommand(`add ${args.files || '.'}`);
      return { content: [{ type: 'text', text: add.success ? 'Files added' : add.error }] };

    case 'git_commit':
      const commit = runGitCommand(`commit -m "${args.message}"`);
      return { content: [{ type: 'text', text: commit.success ? commit.output : commit.error }] };

    case 'git_push':
      const push = runGitCommand('push');
      return { content: [{ type: 'text', text: push.success ? 'Pushed successfully' : push.error }] };

    case 'git_pull':
      const pull = runGitCommand('pull');
      return { content: [{ type: 'text', text: pull.success ? pull.output : pull.error }] };

    case 'git_branch':
      const branch = args.name ? 
        runGitCommand(`checkout -b ${args.name}`) : 
        runGitCommand('branch');
      return { content: [{ type: 'text', text: branch.success ? branch.output : branch.error }] };

    case 'git_checkout':
      const checkout = runGitCommand(`checkout ${args.branch}`);
      return { content: [{ type: 'text', text: checkout.success ? 'Branch switched' : checkout.error }] };

    case 'git_log':
      const log = runGitCommand(`log --oneline -${args.count || 10}`);
      return { content: [{ type: 'text', text: log.success ? log.output : log.error }] };

    case 'git_diff':
      const diff = runGitCommand('diff');
      return { content: [{ type: 'text', text: diff.success ? diff.output : diff.error }] };

    case 'create_pr':
      const currentBranch = runGitCommand('branch --show-current');
      if (!currentBranch.success) {
        return { content: [{ type: 'text', text: 'Error getting current branch' }] };
      }

      const remoteUrl = runGitCommand('remote get-url origin');
      if (!remoteUrl.success) {
        return { content: [{ type: 'text', text: 'No remote origin found' }] };
      }

      const repoInfo = parseGitHubUrl(remoteUrl.output);
      if (!repoInfo) {
        return { content: [{ type: 'text', text: 'Not a GitHub repository' }] };
      }

      runGitCommand(`push -u origin ${currentBranch.output}`);
      
      const prUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/compare/${args.base || 'main'}...${currentBranch.output}?quick_pull=1&title=${encodeURIComponent(args.title)}&body=${encodeURIComponent(args.body || '')}`;
      
      await open(prUrl);
      return { content: [{ type: 'text', text: `PR page opened: ${prUrl}` }] };

    case 'create_bitbucket_pr':
      const bbCurrentBranch = runGitCommand('branch --show-current');
      if (!bbCurrentBranch.success) {
        return { content: [{ type: 'text', text: 'Error getting current branch' }] };
      }

      const bbRemoteUrl = runGitCommand('remote get-url origin');
      if (!bbRemoteUrl.success) {
        return { content: [{ type: 'text', text: 'No remote origin found' }] };
      }

      const bbRepoInfo = parseBitbucketUrl(bbRemoteUrl.output);
      if (!bbRepoInfo) {
        return { content: [{ type: 'text', text: 'Not a Bitbucket repository' }] };
      }

      // Push current branch
      runGitCommand(`push -u origin ${bbCurrentBranch.output}`);
      
      try {
        const bbPrUrl = await createBitbucketPRWithAuth(
          bbRepoInfo.workspace,
          bbRepoInfo.repo,
          bbCurrentBranch.output,
          args.base || 'main',
          args.title || `PR from ${bbCurrentBranch.output}`,
          args.body || ''
        );
        return { content: [{ type: 'text', text: `Bitbucket PR session opened: ${bbPrUrl}` }] };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error creating Bitbucket PR: ${error.message}` }] };
      }

    case 'bitbucket_auth_pr':
      const browser = await chromium.launch({ headless: false });
      const page = await browser.newPage();
      
      try {
        // Sign in first
        await page.goto('https://bitbucket.org/account/signin/');
        console.error('🔐 Please log in to Bitbucket');
        
        // Wait for login success
        await page.waitForSelector('[data-ds--page-layout--slot="top-navigation"]', { timeout: 120000 });
        console.error('✅ Login successful!');
        
        // Open PR URL
        const prUrl = `https://bitbucket.org/${args.workspace}/${args.repo}/pull-requests/new?source=${args.source}&dest=${args.dest || 'main'}`;
        await page.goto(prUrl);
        console.error('🌐 Opened PR creation page');
        
        // Fill form
        await page.fill('input[name="title"]', args.title);
        if (args.body) await page.fill('textarea[name="description"]', args.body);
        
        // Click Create PR
        await page.waitForSelector('[data-testid="create-PR-button"]');
        await page.click('[data-testid="create-PR-button"]');
        console.error('✅ PR created!');
        
        return { content: [{ type: 'text', text: `PR created: ${prUrl}` }] };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
      // Browser stays open

    case 'open_repo':
      const repoUrl = runGitCommand('remote get-url origin');
      if (!repoUrl.success) {
        return { content: [{ type: 'text', text: 'No remote origin found' }] };
      }

      const info = parseGitHubUrl(repoUrl.output);
      if (info) {
        const url = `https://github.com/${info.owner}/${info.repo}`;
        await open(url);
        return { content: [{ type: 'text', text: `Repository opened: ${url}` }] };
      }
      return { content: [{ type: 'text', text: 'Not a GitHub repository' }] };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  console.error('🚀 Git MCP Server starting...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✅ Git MCP Server connected successfully!');
}

main().catch((error) => {
  console.error('❌ Git MCP Server failed to start:', error);
  process.exit(1);
});
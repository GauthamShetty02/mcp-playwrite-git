#!/usr/bin/env node
import { chromium } from 'playwright';
import { execSync } from 'child_process';

// Simple example of creating a Bitbucket PR with Playwright
async function createBitbucketPR() {
  // Get current branch
  const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  console.log(`Current branch: ${branch}`);
  
  // Get remote URL
  const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  console.log(`Remote URL: ${remoteUrl}`);
  
  // Parse Bitbucket info
  const match = remoteUrl.match(/bitbucket\.org[\/:]([^\/]+)[\/]?([^\/]*)?/);
  if (!match) {
    console.log('Not a Bitbucket repository');
    return;
  }
  
  const [, workspace, repo] = match;
  const repoName = repo || 'workspace';
  console.log(`Workspace: ${workspace}, Repo: ${repoName.replace('.git', '')}`);
  
  // Push current branch
  execSync(`git push -u origin ${branch}`);
  console.log('✅ Branch pushed');
  
  // Open browser for PR creation
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const prUrl = `https://bitbucket.org/${workspace}/${repoName.replace('.git', '')}/pull-requests/new?source=${branch}&dest=main`;
  
  await page.goto(prUrl);
  console.log('🌐 Opened PR creation page');
  
  // Wait for login if needed
  await page.waitForTimeout(3000);
  
  // Fill PR form
  try {
    await page.fill('input[name="title"]', `Feature: ${branch}`);
    await page.fill('textarea[name="description"]', 'Auto-generated PR from script');
    console.log('📝 PR form filled');
  } catch (e) {
    console.log('⚠️ Manual form filling required');
  }
  
  console.log('✅ Complete PR creation manually in browser');
  
  // Keep browser open for 30 seconds
  setTimeout(() => browser.close(), 30000);
}

createBitbucketPR().catch(console.error);
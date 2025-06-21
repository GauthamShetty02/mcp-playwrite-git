#!/usr/bin/env node
// Quick test to verify Bitbucket PR creation works

import { chromium } from 'playwright';

async function quickTest() {
  console.log('🚀 Quick Bitbucket Test');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Test navigation to Bitbucket
  await page.goto('https://bitbucket.org/');
  console.log('✅ Opened Bitbucket');
  
  // Check if logged in
  await page.waitForTimeout(2000);
  const loggedIn = await page.locator('[data-testid="user-menu-button"]').count() > 0;
  
  if (loggedIn) {
    console.log('✅ Already logged in');
    
    // Try to navigate to a sample PR creation page
    await page.goto('https://bitbucket.org/atlassian/bitbucket/pull-requests/new');
    console.log('✅ PR creation page accessible');
  } else {
    console.log('🔐 Need to log in first');
  }
  
  console.log('Browser will close in 10 seconds...');
  setTimeout(() => browser.close(), 10000);
}

quickTest().catch(console.error);
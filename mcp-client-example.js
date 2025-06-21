#!/usr/bin/env node
// Example of how to use the MCP server tools

import { spawn } from 'child_process';

// Simulate MCP client calling the server
function callMCPTool(toolName, args = {}) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', ['index.js'], { stdio: 'pipe' });
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };
    
    server.stdin.write(JSON.stringify(request) + '\n');
    server.stdin.end();
    
    let output = '';
    server.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    server.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

// Example usage
async function examples() {
  console.log('🔧 MCP Server Examples\n');
  
  // 1. Check git status
  console.log('1. Git Status:');
  try {
    const status = await callMCPTool('git_status');
    console.log(status);
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // 2. Create Bitbucket PR
  console.log('\n2. Create Bitbucket PR:');
  try {
    const pr = await callMCPTool('create_bitbucket_pr', {
      title: 'New Feature Implementation',
      body: 'This PR implements the new feature as requested',
      base: 'main'
    });
    console.log(pr);
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // 3. List branches
  console.log('\n3. List Branches:');
  try {
    const branches = await callMCPTool('git_branch');
    console.log(branches);
  } catch (e) {
    console.log('Error:', e.message);
  }
}

examples().catch(console.error);
#!/usr/bin/env node
import express from 'express';
import { execSync } from 'child_process';
import open from 'open';

const app = express();
app.use(express.json());

function runGitCommand(args) {
  try {
    const output = execSync(`git ${args}`, { encoding: 'utf8' });
    return { success: true, output: output.trim() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

app.get('/status', (req, res) => {
  const result = runGitCommand('status --porcelain');
  res.json(result);
});

app.post('/commit', (req, res) => {
  const { message } = req.body;
  const result = runGitCommand(`commit -m "${message}"`);
  res.json(result);
});

app.post('/create-pr', async (req, res) => {
  const { title, body = '', base = 'main' } = req.body;
  
  const currentBranch = runGitCommand('branch --show-current');
  const remoteUrl = runGitCommand('remote get-url origin');
  
  if (!currentBranch.success || !remoteUrl.success) {
    return res.json({ success: false, error: 'Git repository error' });
  }
  
  const match = remoteUrl.output.match(/github\.com[\/:]([^\/]+)\/([^\/]+)/);
  if (!match) {
    return res.json({ success: false, error: 'Not a GitHub repository' });
  }
  
  const prUrl = `https://github.com/${match[1]}/${match[2]}/compare/${base}...${currentBranch.output}?quick_pull=1&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  
  await open(prUrl);
  res.json({ success: true, url: prUrl });
});

const PORT = 8978;
app.listen(PORT, () => {
  console.log(`🌐 Git HTTP Server running at http://localhost:${PORT}`);
});
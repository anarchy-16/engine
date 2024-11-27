const { concatenateRepoContent } = require('../githubUtils');
require('dotenv').config();

// Test the function with a GitHub repository URL
const repoUrl = process.env.ARCHIVE_REPO_URL;
const targetDir = './temp-repo';  // temporary directory to clone into

async function test() {
    const result = await concatenateRepoContent(repoUrl, targetDir);
    console.log('Result:', result);
}

test();
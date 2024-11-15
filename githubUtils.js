const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');

const git = simpleGit();

async function concatenateRepoContent(repoUrl, targetDir) {
    try {

        // Remove existing directory if it exists
        if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
        }

        // Clone the repository
        console.log('Cloning repository...');
        await git.clone(repoUrl, targetDir);

        let concatenatedContent = '';

        // Function to recursively read files
        function readFilesRecursively(directory) {
            const files = fs.readdirSync(directory);
            files.forEach(file => {

                if (file.startsWith('.')) {
                    return;
                }

                const fullPath = path.join(directory, file);
                const stats = fs.statSync(fullPath);

                if (stats.isDirectory()) {
                    // If it's a directory, recurse into it
                    readFilesRecursively(fullPath);
                } else if (stats.isFile()) {
                    // Read file content and append to the string
                    const fileContent = fs.readFileSync(fullPath, 'utf-8');
                    concatenatedContent += `\n[${fullPath}]\n${fileContent}\n`;
                }
            });
        }

        // Start reading files
        console.log('Reading files...');
        readFilesRecursively(targetDir);

        console.log('Concatenation complete.');
        return concatenatedContent;
    } catch (error) {
        console.error('Error:', error);
        return '';
    }
}

module.exports = { concatenateRepoContent };

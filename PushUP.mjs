#!/usr/bin/env node

import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { diffLines } from 'diff';
import chalk from 'chalk';
import { Command } from 'commander';

const program = new Command();

class PushUP {

    constructor(repoPath = '.') {
        this.repoPath = path.join(repoPath, '.pushup');
        this.objectsPath = path.join(this.repoPath, 'objects'); // .pushup/objects
        this.headPath = path.join(this.repoPath, 'HEAD'); // .pushup/HEAD
        this.indexPath = path.join(this.repoPath, 'index'); // .pushup/index --> this is the staging area
        this.branchesPath = path.join(this.repoPath, 'refs', 'heads');
        this.currentBranchPath = path.join(this.repoPath, 'CURRENT_BRANCH');
        
        this.init();
    }

    async init() {
        await fs.mkdir(this.objectsPath, { recursive: true });

        await fs.mkdir(this.branchesPath, { recursive: true });
        try {
            await fs.writeFile(this.headPath, '', { flag: 'wx' }); // wx: open for writing. fails if file exists
            await fs.writeFile(this.indexPath, JSON.stringify([]), { flag: 'wx' });
            await fs.writeFile(this.currentBranchPath, 'main', { flag: 'wx' });

            const mainBranchPath = path.join(this.branchesPath, 'main');
            await fs.writeFile(mainBranchPath, '', { flag: 'wx' });

            console.log(chalk.green('Initialized empty PushUP repository'));

        } 
        catch (error) {
            console.log(chalk.yellow('.pushup folder already exists'));
        }
    }

    hashObject(content) {
        return crypto.createHash('sha1').update(content, 'utf-8').digest('hex');
    }

    async add(fileToBeAdded) {
        try{
            const fileData = await fs.readFile(fileToBeAdded, { encoding: 'utf-8' });
            const fileHash = this.hashObject(fileData);
            console.log(`File Hash: ${fileHash}`);
        
            const newFileHashedObjectPath = path.join(this.objectsPath, fileHash);
            await fs.writeFile(newFileHashedObjectPath, fileData);
            await this.updateStagingArea(fileToBeAdded, fileHash);

            console.log(chalk.green(`Added the file ${fileToBeAdded}`));
        }
        catch(error){
            console.error(chalk.red(`Error adding file: ${error.message}`));
        }
        
    }

    async updateStagingArea(filePath, fileHash) {
        const index = JSON.parse(await fs.readFile(this.indexPath, { encoding: 'utf-8' }));
        
        const existingIndex = index.findIndex(item => item.filePath === filePath);

        if(existingIndex !== -1){
            index.splice(existingIndex, 1);
        }
        index.push({
            filePath,
            fileHash
        });

        await fs.writeFile(this.indexPath, JSON.stringify(index));
    }

    async commit(message) {
        const index = JSON.parse(await fs.readFile(this.indexPath, { encoding: 'utf-8' }));

        if(index.length === 0){
            console.log(chalk.yellow('No changes to commit. Staging area is empty.'));
            return;
        }

        const parentCommit = await this.getCurrentHead();

        const commitData = {
            timestamp: new Date().toISOString(),
            message,
            files: index,
            parent: parentCommit || null
        };

        const commitHash = this.hashObject(JSON.stringify(commitData));
        const commitPath = path.join(this.objectsPath, commitHash);

        await fs.writeFile(commitPath, JSON.stringify(commitData));
        await fs.writeFile(this.headPath, commitHash);

        const currentBranch = await this.getCurrentBranch();
        const branchesPath = path.join(this.branchesPath, currentBranch);
        await fs.writeFile(branchesPath, commitHash);

        await fs.writeFile(this.indexPath, JSON.stringify([])); // Clear staging area

        console.log(chalk.green(`File committed successfully ${commitHash}`));

        console.log(chalk.gray(` ${index.length} file(s) committed`));
    }

    async getCurrentHead() {
        try {
            return await fs.readFile(this.headPath, { encoding: 'utf-8' });
        } 
        catch (error) {
            return null;
        }
    }

    async getCurrentBranch(){
        try{
            return await fs.readFile(this.currentBranchPath, { encoding: 'utf-8' });
        }
        catch(error){
            return 'main';
        }
    }

    async log() {
        let currentCommitHash = await this.getCurrentHead();
        const currentBranch = await this.getCurrentBranch();

        if(!currentCommitHash){
            console.log(chalk.yellow(`No commits found on branch '${currentBranch}'`));
            return;
        }

        console.log(chalk.blue(`\n Commit history for branch '${currentBranch}':`));

        while (currentCommitHash) {
            const commitData = JSON.parse(await fs.readFile(path.join(this.objectsPath, currentCommitHash), { encoding: 'utf-8' }));
            
            console.log(chalk.yellow(`commit ${currentCommitHash}`));
            console.log(`Date:   ${new Date(commitData.timestamp).toLocaleString()}`);
            console.log(`\n    ${commitData.message}\n`); 

            currentCommitHash = commitData.parent;
        }
    }

    async showCommitDiff(commitHash) {
        const commitData = JSON.parse(await this.getCommitData(commitHash));

        if (!commitData) {
            console.error(chalk.red('Commit not found'));
            return;
        }

        console.log(chalk.cyan(`\nCommit: ${commitHash}`));
        console.log(`Date:   ${new Date(commitData.timestamp).toLocaleString()}`);
        console.log(`\n    ${commitData.message}\n`);

        for (const file of commitData.files) {

            console.log(chalk.bold(`\n${file.filePath}`));
            const fileContent = await this.getFileContent(file.fileHash);

            if (commitData.parent) {

                const parentCommitData = JSON.parse(await this.getCommitData(commitData.parent));
                const getparentFileContent = await this.getParentFileContent(parentCommitData, file.filePath);

                if (getparentFileContent !== undefined) {

                    const diff = diffLines(getparentFileContent, fileContent);

                    diff.forEach(part => {
                        if (part.added) {
                            process.stdout.write(chalk.green('+ ' + part.value));
                        } 
                        else if (part.removed) {
                            process.stdout.write(chalk.red('- ' + part.value));
                        } 
                        else {
                            process.stdout.write(chalk.gray('  ' + part.value));
                        }
                    });

                    console.log();
                } 
                else {
                    console.log(chalk.green('+ New file'));
                }
            } 
            else {
                console.log(chalk.green('+ New file (initial commit)'));
            }
        }
    }

    async status(){
        const currentBranch = await this.getCurrentBranch();
        const index = JSON.parse(await fs.readFile(this.indexPath, { encoding: 'utf-8' }));

        console.log(chalk.cyan(`\nOn branch '${currentBranch}\n'`));

        if(index.length === 0){
            console.log(chalk.green('Nothing staged for commit\n'));
        }

        else{
            console.log(chalk.green('Changes staged for commit:\n'));

            index.forEach(file => {
                console.log(chalk.green(`  modified:   ${file.filePath}`));
            });

            console.log();
        }
    }

    async branch(branchName , createNew = false){
        if(createNew){
            const branchPath = path.join(this.branchesPath, branchName);

            try{
                await fs.access(branchPath);
                console.log(chalk.red(`✗ Branch '${branchName}' already exists`));
                return;
            } 
            catch{

                const getCurrentHead = await this.getCurrentHead();
                await fs.writeFile(branchPath, getCurrentHead || '');

                console.log(chalk.green(`Created a Branch '${branchName}'`));
            }
        }

        else{
            const branches = await fs.readdir(this.branchesPath);
            const currentBranch = await this.getCurrentBranch();

            console.log(chalk.cyan('\nBranches:\n'));

            branches.forEach(branch => {

                if(branch === currentBranch){
                    console.log(chalk.green(`* ${branch}`));
                }
                else{
                    console.log(`  ${branch}`);
                }
            });

            console.log();
        }
    }

    async checkout(branchName){
        const branchPath = path.join(this.branchesPath, branchName);

        try{
            await fs.access(branchPath);

            const index = JSON.parse(await fs.readFile(this.indexPath, { encoding: 'utf-8' }));

            if(index.length > 0){
                console.log(chalk.red('✗ Cannot switch branches with uncommitted changes'));
                console.log(chalk.yellow('  Please commit or reset your changes first'));
                
                return;
            }

            const branchCommit = await fs.readFile(branchPath, { encoding: 'utf-8' });

            await fs.writeFile(this.headPath, branchCommit);
            await fs.writeFile(this.currentBranchPath, branchName);

            console.log(chalk.green(`Switched to branch '${branchName}'`));
        }

        catch{
            console.log(chalk.red(`✗ Branch '${branchName}' does not exist`));

            console.log(chalk.yellow(`  Use 'pushup branch ${branchName}' to create it`));
        }
    }

    async merge(branchName){
        const currentBranch = await this.getCurrentBranch();

        if(branchName === currentBranch){
            console.log(chalk.red('Cannot merge a branch into itself'));
            return;
        }
        
        const branchPath = path.join(this.branchesPath, branchName);

        try{
            await fs.access(branchPath);

            const branchCommit = await fs.readFile(branchPath, { encoding: 'utf-8' });
            const currentCommit = await this.getCurrentHead();

            if(!branchCommit){
                console.log(chalk.red(`Branch '${branchName}' has no commits`));
                return;
            }

            if(branchCommit === currentCommit){
                console.log(chalk.yellow('Already up to date'));
                return;
            }

            const branchCommitData = JSON.parse(await this.getCommitData(branchCommit));

            const mergeCommmitData = {
                timestamp: new Date().toISOString(),
                message: `Merge branch '${branchName}' into ${currentBranch}`,
                files: branchCommitData.files,
                parent: currentCommit,
                mergeParent: branchCommit
            };

            const mergeCommitHash = this.hashObject(JSON.stringify(mergeCommmitData));
            const mergeCommitPath = path.join(this.objectsPath, mergeCommitHash);

            await fs.writeFile(mergeCommitPath, JSON.stringify(mergeCommmitData));
            await fs.writeFile(this.headPath, mergeCommitHash);

            const currentBranchPath = path.join(this.branchesPath, currentBranch);
            await fs.writeFile(currentBranchPath, mergeCommitHash);

            console.log(chalk.green(`Merged branch '${branchName}' into '${currentBranch}'`));
            console.log(chalk.green(`New merge commit created: ${mergeCommitHash}`));
        }

        catch{
            console.log(chalk.red(`Branch '${branchName}' does not exist`));
        }
    }

    async deleteBranch(branchName) {
        const currentBranch = await this.getCurrentBranch();
        
        if (branchName === currentBranch) {
            console.log(chalk.red(`✗ Cannot delete the current branch '${branchName}'`));
            return;
        }
        
        if (branchName === 'main') {
            console.log(chalk.red('✗ Cannot delete the main branch'));
            return;
        }
        
        const branchPath = path.join(this.branchesPath, branchName);
        
        try {
            await fs.unlink(branchPath);
            console.log(chalk.green(`✓ Deleted branch '${branchName}'`));
        } catch {
            console.log(chalk.red(`✗ Branch '${branchName}' does not exist`));
        }
    }

    async reset(commitHash) {
        try {
            const commitData = await this.getCommitData(commitHash);
            if (!commitData) {
                console.log(chalk.red('✗ Commit not found'));
                return;
            }
            
            await fs.writeFile(this.headPath, commitHash);
            
            const currentBranch = await this.getCurrentBranch();
            const branchPath = path.join(this.branchesPath, currentBranch);
            await fs.writeFile(branchPath, commitHash);
            
            await fs.writeFile(this.indexPath, JSON.stringify([]));
            
            console.log(chalk.green(`✓ Reset HEAD to ${commitHash.slice(0, 7)}`));
        } catch (error) {
            console.log(chalk.red('✗ Failed to reset'));
        }
    }

    async diff() {
        const index = JSON.parse(await fs.readFile(this.indexPath, { encoding: 'utf-8' }));
        
        if (index.length === 0) {
            console.log(chalk.yellow('No staged changes'));
            return;
        }
        
        const currentCommit = await this.getCurrentHead();
        
        console.log(chalk.cyan('\nStaged changes:\n'));
        
        for (const file of index) {
            console.log(chalk.bold(file.filePath));
            
            const stagedContent = await this.getFileContent(file.fileHash);
            
            if (currentCommit) {
                const commitData = JSON.parse(await this.getCommitData(currentCommit));
                const committedFile = commitData.files.find(f => f.filePath === file.filePath);
                
                if (committedFile) {
                    const committedContent = await this.getFileContent(committedFile.fileHash);
                    const diff = diffLines(committedContent, stagedContent);
                    
                    diff.forEach(part => {
                        if (part.added) {
                            process.stdout.write(chalk.green('+ ' + part.value));
                        } else if (part.removed) {
                            process.stdout.write(chalk.red('- ' + part.value));
                        } else {
                            process.stdout.write(chalk.gray('  ' + part.value));
                        }
                    });
                } else {
                    console.log(chalk.green('+ New file'));
                }
            } else {
                console.log(chalk.green('+ New file'));
            }
            console.log();
        }
    }


    async getParentFileContent(parentCommitData, filePath) {
        const parentFile = parentCommitData.files.find(file => file.filePath === filePath);

        if (parentFile) {
            return await this.getFileContent(parentFile.fileHash);
        }
    }

    async getCommitData(commitHash) {
        const commitPath = path.join(this.objectsPath, commitHash);
        try {
            return await fs.readFile(commitPath, { encoding: 'utf-8' });
        } catch (error) {
            console.error('Commit not found', error);
            return null;
        }
    }

    async getFileContent(fileHash) {
        const objectsPath = path.join(this.objectsPath, fileHash);
        return fs.readFile(objectsPath, { encoding: 'utf-8' });
    }
}

// (async () => {
//     const pushup = new PushUP();
//     // await pushup.add('sample.txt');
//     // await pushup.add('sample2.txt');
//     // await pushup.commit('4th commit');

//     // await pushup.log();
//     await pushup.showCommitDiff('7b9d7266145f34073d310f02d42568c6c3213bb4');
// })();


// CLI Commands
program
    .name('pushup')
    .description('A simple version control system')
    .version('1.0.0');

program
    .command('init')
    .description('Initialize a new PushUP repository')
    .action(async () => {
        const pushup = new PushUP();
    });

program
    .command('add <file>')
    .description('Add a file to the staging area')
    .action(async (file) => {
        const pushup = new PushUP();
        await pushup.add(file);
    });

program
    .command('commit <message>')
    .description('Commit the staged files')
    .action(async (message) => {
        const pushup = new PushUP();
        await pushup.commit(message);
    });

program
    .command('log')
    .description('Show commit history')
    .action(async () => {
        const pushup = new PushUP();
        await pushup.log();
    });

program
    .command('show <commitHash>')
    .description('Show changes in a specific commit')
    .action(async (commitHash) => {
        const pushup = new PushUP();
        await pushup.showCommitDiff(commitHash);
    });

program
    .command('status')
    .description('Show the working tree status')
    .action(async () => {
        const pushup = new PushUP();
        await pushup.status();
    });

program
    .command('branch [branchName]')
    .description('List branches or create a new branch')
    .action(async (branchName) => {
        const pushup = new PushUP();
        await pushup.branch(branchName, !!branchName);
    });

program
    .command('checkout <branchName>')
    .description('Switch to a different branch')
    .action(async (branchName) => {
        const pushup = new PushUP();
        await pushup.checkout(branchName);
    });

program
    .command('merge <branchName>')
    .description('Merge a branch into the current branch')
    .action(async (branchName) => {
        const pushup = new PushUP();
        await pushup.merge(branchName);
    });

program
    .command('delete-branch <branchName>')
    .description('Delete a branch')
    .action(async (branchName) => {
        const pushup = new PushUP();
        await pushup.deleteBranch(branchName);
    });

program
    .command('reset <commitHash>')
    .description('Reset HEAD to a specific commit')
    .action(async (commitHash) => {
        const pushup = new PushUP();
        await pushup.reset(commitHash);
    });

program
    .command('diff')
    .description('Show staged changes')
    .action(async () => {
        const pushup = new PushUP();
        await pushup.diff();
    });

program.parse(process.argv);
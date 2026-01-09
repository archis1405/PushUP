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
        await fs.writeFile(this.indexPath, JSON.stringify([])); // Clear staging area

        console.log(`File committed successfully ${commitHash}`);
    }

    async getCurrentHead() {
        try {
            return await fs.readFile(this.headPath, { encoding: 'utf-8' });
        } catch (error) {
            return null;
        }
    }

    async log() {
        let currentCommitHash = await this.getCurrentHead();

        while (currentCommitHash) {
            const commitData = JSON.parse(await fs.readFile(path.join(this.objectsPath, currentCommitHash), { encoding: 'utf-8' }));
            
            console.log('---------------------------');
            console.log(`Commit: ${currentCommitHash}`);
            console.log(`Date: ${commitData.timestamp}`);
            console.log(`Message: ${commitData.message}`);
            console.log('---------------------------');

            currentCommitHash = commitData.parent;
        }
    }

    async showCommitDiff(commitHash) {
        const commitData = JSON.parse(await this.getCommitData(commitHash));

        if (!commitData) {
            console.error('Commit not found');
            return;
        }

        console.log("Changes in the commit are: ");

        for (const file of commitData.files) {
            console.log(`\nFile: ${file.filePath}`);
            const fileContent = await this.getFileContent(file.fileHash);
            console.log(fileContent);

            console.log('---------------------------');

            if (commitData.parent) {
                const parentCommitData = JSON.parse(await this.getCommitData(commitData.parent));
                const getparentFileContent = await this.getParentFileContent(parentCommitData, file.filePath);

                if (getparentFileContent !== undefined) {
                    console.log("Diff:");
                    const diff = diffLines(getparentFileContent, fileContent);

                    diff.forEach(part => {
                       
                        if (part.added){
                            process.stdout.write(chalk.green(part.value));
                        } 
                        else if(part.removed) {
                            process.stdout.write(chalk.red(part.value));
                        } 
                        else{
                            process.stdout.write(chalk.gray(part.value));
                        }

                    });

                    console.log('\n---------------------------');
                } 

                else{
                    console.log(chalk.green(`New file added in this commit.`));
                }
            } 

            else{
                console.log('First Commit - No parent commit to compare.');
            }
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

program.parse(process.argv);
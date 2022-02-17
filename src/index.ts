import * as core from '@actions/core';
import * as github from "@actions/github";
import * as fs from 'fs';
import * as plist from 'plist';
import { Minimatch } from "minimatch";

process.on('unhandledRejection', handleError)
main().catch(handleError)

type ClientType = ReturnType<typeof github.getOctokit>;

async function main(): Promise<void> {
    let infoPlistPath = core.getInput('info-plist-path');
    
    if (!fs.existsSync(infoPlistPath)) {
        core.setFailed(`The file path for the Info.plist does not exist or is not found: ${infoPlistPath}`);
        process.exit(1);
    }
    
    core.debug(`Running task with ${infoPlistPath}`);

    const token = core.getInput("repo-token", { required: true });
    
    const prNumber = getPrNumber();
    if (!prNumber) {
        core.setFailed("Could not get pull request number from context, exiting");
        process.exit(1);
    }
    
    let fileContent = fs.readFileSync(infoPlistPath, { encoding: 'utf8' });
    core.debug(JSON.stringify(fileContent));
    
    let obj = plist.parse(fileContent);
    const bundleShortVersionString = obj['CFBundleShortVersionString'];
    
    core.info(`Read version number ${bundleShortVersionString} from Info.plist`);
    
    const client: ClientType = github.getOctokit(token);
    
    let addLabel = true;
    const changedFilesConfig = core.getInput("changed-files", { required: false });
    if (changedFilesConfig) {
        const changedFiles: string[] = await getChangedFiles(client, prNumber);
        const matcher = new Minimatch(changedFilesConfig);
        if (!changedFiles.some(f => matcher.match(f))) {
            core.info(`No matching changes found in files at path ${changedFilesConfig}, skipping label.`);
            addLabel = false;
        }
    }
    
    let labelName = bundleShortVersionString;
    const labelFormat = core.getInput("label-format", { required: false });
    if (labelFormat) {
        labelName = labelFormat.replace('{version}', bundleShortVersionString);
    }

    if (addLabel) {
        await client.rest.issues.addLabels({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            issue_number: prNumber,
            labels: [labelName],
        });
    }
}

function handleError(err: any): void {
    console.error(err)
    core.setFailed(`Unhandled error: ${err}`)
}

function getPrNumber(): number | undefined {
    const pullRequest = github.context.payload.pull_request;
    if (!pullRequest) {
        return undefined;
    }
    
    return pullRequest.number;
}

async function getChangedFiles(
    client: ClientType,
    prNumber: number
): Promise<string[]> {
    const listFilesOptions = client.rest.pulls.listFiles.endpoint.merge({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: prNumber,
    });
    
    const listFilesResponse = await client.paginate(listFilesOptions);
    const changedFiles = listFilesResponse.map((f: any) => f.filename);
    
    core.debug("Found changed files:");
    for (const file of changedFiles) {
        core.debug("  " + file);
    }
    
    return changedFiles;
}
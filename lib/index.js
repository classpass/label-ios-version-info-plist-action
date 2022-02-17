"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs"));
const plist = __importStar(require("plist"));
const minimatch_1 = require("minimatch");
process.on('unhandledRejection', handleError);
main().catch(handleError);
function main() {
    return __awaiter(this, void 0, void 0, function* () {
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
        const client = github.getOctokit(token);
        let addLabel = true;
        const changedFilesConfig = core.getInput("changed-files", { required: false });
        if (changedFilesConfig) {
            const changedFiles = yield getChangedFiles(client, prNumber);
            const matcher = new minimatch_1.Minimatch(changedFilesConfig);
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
            yield client.rest.issues.addLabels({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                issue_number: prNumber,
                labels: [labelName],
            });
        }
    });
}
function handleError(err) {
    console.error(err);
    core.setFailed(`Unhandled error: ${err}`);
}
function getPrNumber() {
    const pullRequest = github.context.payload.pull_request;
    if (!pullRequest) {
        return undefined;
    }
    return pullRequest.number;
}
function getChangedFiles(client, prNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        const listFilesOptions = client.rest.pulls.listFiles.endpoint.merge({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: prNumber,
        });
        const listFilesResponse = yield client.paginate(listFilesOptions);
        const changedFiles = listFilesResponse.map((f) => f.filename);
        core.debug("Found changed files:");
        for (const file of changedFiles) {
            core.debug("  " + file);
        }
        return changedFiles;
    });
}

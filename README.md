# Label iOS version from Info.plist action

GitHub Action that labels your PR with the `BundleShortVersionString` from your iOS app's Info.plist file.

Formed from a mash up of https://github.com/damienaicheh/update-ios-version-info-plist-action and https://github.com/actions/labeler

## Inputs

### `repo-token`

**Required** GitHub access token, e.g. `${{ secrets.GITHUB_TOKEN }}`


### `info-plist-path`

**Required** The relative path for the Info.plist file.

###  `changed-files`

Path glob: only apply the label if there are changed files in this path.

###  `label-format`

String format to customize the format of the label. Default is just the raw version number. Action will replace the substring `{version}` in this format with the version number it reads from the plist.

## Usage

```yaml
- name: Label from Info.plist
  uses: classpass/label-ios-version-info-plist-action@v1.0.0
  with:
    repo-token: "${{ secrets.GITHUB_TOKEN }}"
    info-plist-path: './path_to_your/Info.plist'
    changed-files: 'src/ios/**' # optional
    label-format: 'iOS {version}' # optional
```

## Development

The action is written in TypeScript, to compile to JS for deployment run
```
npm install
npm run package-action
```
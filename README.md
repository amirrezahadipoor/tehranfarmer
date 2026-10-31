# Tehran Farmer

## Development requirements

- **Node.js 22 or newer** (`package.json`: `>=22.0.0`; `.nvmrc`: `22`). Node 20 is not supported.
- npm bundled with Node.js. No global packages are required.

With nvm, run `nvm use` before installing or checking the project. This QA round was verified with Node.js **22.23.4**.

## Install and verify

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run verify:dist
```

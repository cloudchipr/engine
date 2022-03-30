cloudchipr-engine
=============
The [CloudchiprEngine](https://github.com/cloudchipr/cloudchipr-engine) library exported as [Typescript](https://www.typescriptlang.org/) module

[![🚀 npm-publish](https://github.com/cloudchipr/engine/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/cloudchipr/engine/actions/workflows/npm-publish.yml)

## Prerequisites
* [Node](https://nodejs.org/)
* [Python](https://www.python.org/)
* [Cloud Custodian](https://cloudcustodian.io/)

## Installation
Using npm:
```shell
$ npm i -g npm
$ npm i cloudchipr-engine
```
Note: add `--save` if you are using npm < 5.0.0
## Usage
```shell
import {AdapterInterface, ShellAdapter, Configuration, AdapterInterface, FindGarbageResponse} from "cloudchipr-engine";

const config = new Configuration(ACCESS_KEY_ID, SECRET_ACCESS_KEY)
const adapter: AdapterInterface = new ShellAdapter(CUSTODIAN)
const garbageResponse: FindGarbageResponse = adapter.findGarbage(config);
```

## Development
After making a change, do the following  
Run:
```shell
$ npm run format && npm run lint
```
**Fix all the errors if there is any**  

Change the version in the `package.json` file and run  
```shell
$ npm run build
```
Push the changes to [GitHub](https://github.com/cloudchipr/cloudchipr-engine)  

In order to publish your package, you need to create an NPM account.  
If you don’t have an account you can do so on [NPM](https://www.npmjs.com/signup) or run the command:
```shell
$ npm adduser
```

If you already have an account, just login to you NPM account.
```shell
$ npm login
```
Publish the package
```shell
$ npm publish
```

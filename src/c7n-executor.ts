import fs from 'fs'
import yaml from 'js-yaml'
import { v4 } from 'uuid'
import { CustodianError } from './exceptions/custodian-error'
import { ShellHelper } from './helpers/shell-helper'

interface ResourceSuccessInterface {
  [K: string]: any,
  C8rAccount: string|undefined
}

interface ResourceFailureInterface {
  region: any,
  account: any
}

export class C7nExecutor {
    private readonly custodian: string;
    private readonly custodianOrg?: string;

    constructor (custodian: string, custodianOrg?: string) {
      this.custodian = custodian
      this.custodianOrg = custodianOrg
    }

    async execute (
      policy: any,
      policyName: string,
      regions: string[],
      currentAccount: string| undefined,
      accounts: string[],
      isDebugMode: boolean
    ) {
      const id: string = `${policyName}-${v4()}`
      const dir: string = `./.c8r/run/c7n/${id}/`
      try {
        try {
          await fs.promises.access(dir)
        } catch (error) {
          await fs.promises.mkdir(dir, { recursive: true })
        }

        const policyPath: string = `${dir}policy.yaml`
        await fs.promises.writeFile(policyPath, yaml.dump(policy), 'utf8')

        let regionOptions = ''
        if (regions) {
          regionOptions = regions.map(region => ' --region ' + region).join(' ')
        }

        let successResult: ResourceSuccessInterface[] = []
        let failureResult: ResourceFailureInterface[] = []

        let includeCurrentAccount = true
        // use multi account, but not for the case when the accounts is 1 and it is current one
        const useMultiAccount = accounts.length > 0 && !(accounts.length === 1 && currentAccount && accounts.includes(currentAccount))
        if (useMultiAccount) {
          if (regions.length === 0) {
            regions.push('us-east-1') // default AWS region @todo must be changed later for other clouds
          }

          includeCurrentAccount = currentAccount !== undefined && accounts.includes(currentAccount)
          // exclude current account from custodian anyway it will be fetch by signe cloud custodian
          if (includeCurrentAccount) {
            accounts = accounts.filter(a => a !== currentAccount)
          }

          // custodianOrg exists and executable
          // @ts-ignore it is just for snake case
          const accountsObject: {
              accounts: {
                  accountId: string,
                  name: string,
                  regions: string[],
                  role: string
              }[]
          } = {}

          // @ts-ignore it is just for snake case
          accountsObject.accounts = accounts.map(id => {
            return {
              account_id: id,
              name: id,
              regions: regions,
              role: `arn:aws:iam::${id}:role/OrganizationAccountAccessRole`
            }
          })

          const accountsConfigFile: string = `${dir}accounts.yaml`
          await fs.promises.writeFile(`${accountsConfigFile}`, yaml.dump(accountsObject), 'utf8')
          const command = `${this.custodianOrg} run ${regionOptions} -c ${accountsConfigFile} -s ${dir}response-org  -u ${policyPath} --cache-period=0`

          try {
            await ShellHelper.execAsync(command)
          } catch (e: any) {
            if (await C7nExecutor.isFullFailure(dir)) {
              throw new CustodianError(e.message, id)
            }
          }
        }

        if (includeCurrentAccount) {
          const command = `${this.custodian} run ${regionOptions} --output-dir=${dir}response  ${policyPath} --cache-period=0`

          try {
            await ShellHelper.execAsync(command)
          } catch (e: any) {
            if (await C7nExecutor.isFullFailure(dir)) {
              throw new CustodianError(e.message, id)
            }
          }
          // await ShellHelper.execAsync(command)
          if (regions.length > 1) {
            for (const region of regions) {
              try {
                successResult = successResult.concat(await C7nExecutor.fetchResourceJson(C7nExecutor.buildResourcePath(dir, policyName, undefined, region)))
              } catch (e) {
                failureResult.push({ account: currentAccount, region: region })
              }
            }
          } else {
            try {
              successResult = await C7nExecutor.fetchResourceJson(C7nExecutor.buildResourcePath(dir, policyName))
            } catch (e) {
              failureResult.push({ account: currentAccount, region: regions[0] })
            }
          }

          successResult = successResult.map(data => {
            data.C8rAccount = currentAccount
            return data
          })
        }

        if (useMultiAccount) {
          successResult = successResult.map(data => {
            data.C8rAccount = currentAccount + ' - Current'
            return data
          })
          accounts.forEach(account => {
            regions.forEach(async (region) => {
              try {
                const tempData = await C7nExecutor.fetchResourceJson(C7nExecutor.buildResourcePath(dir, policyName, account, region))
                successResult = successResult.concat(
                  tempData.flatMap(data => {
                    data.C8rAccount = account
                    return data
                  })
                )
              } catch (e) {
                failureResult.push({ account: account, region: region })
              }
            })
          })
        }
        return {
          success: successResult,
          failure: failureResult
        }
      } finally {
        // remove temp files and folders
        if (!isDebugMode) {
          await C7nExecutor.removeTempFoldersAndFiles(id)
        }
      }
    }

    private static async removeTempFoldersAndFiles (id: string) {
      await fs.promises.rm(`./.c8r/run/c7n/${id}`, { recursive: true, force: true })
      try {
        await fs.promises.rmdir('./.c8r/run/c7n')
        await fs.promises.rmdir('./.c8r/run')
      } catch (e) {}
    }

    private static buildResourcePath (dir: string, policyName: string, account?: string, region?: string) {
      return `${dir}` + (account ? 'response-org' : 'response') +
            (account ? `/${account}` : '') +
            (region ? `/${region}` : '') +
            `/${policyName}` +
            '/resources.json'
    }

    private static async fetchResourceJson (filePath: string): Promise<ResourceSuccessInterface[]> {
      try {
        return JSON.parse(await fs.promises.readFile(filePath, 'utf8'))
      } catch (e) {
        throw new Error(`${filePath} file does not exist.`)
      }
    }

    private static async isFullFailure (dir: string): Promise<boolean> {
      let resourceDirectoryExists = true
      let resourceOrgDirectoryExists = true
      try {
        await fs.promises.access(`${dir}response/`)
      } catch (error) {
        resourceDirectoryExists = false
      }
      try {
        await fs.promises.access(`${dir}response-org/`)
      } catch (error) {
        resourceOrgDirectoryExists = false
      }
      return !(resourceDirectoryExists || resourceOrgDirectoryExists)
    }
}

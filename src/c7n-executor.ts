import fs from 'fs'
import yaml from 'js-yaml'
import moment from 'moment'
import { v4 } from 'uuid'
import { CustodianError } from './exceptions/custodian-error'
import { ShellHelper } from './helpers/shell-helper'
import { AWSConfiguration } from './adapters/aws/aws-configuration'

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
      isDebugMode: boolean,
      awsConfiguration?: AWSConfiguration
    ) {
      const id: string = `${moment().format('YYYY-MM-DD_HH:mm:ss')}_${v4()}`
      const dir: string = `./.c8r/run/${id}/${policyName}/`
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

        let result: {
            C8rAccount: string|undefined
        }[] = []

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

          await ShellHelper.execAsync(command)
        }

        if (includeCurrentAccount) {
          let awsEnvConfigurationPart = ''
          if (awsConfiguration !== undefined) {
            awsEnvConfigurationPart = `AWS_ACCESS_KEY_ID="${awsConfiguration.accessKeyId}"` +
            ` AWS_SECRET_ACCESS_KEY="${awsConfiguration.secretAccessKey}"` +
            ` AWS_SESSION_TOKEN="${awsConfiguration.secretToken}"`
          }

          const command = `${awsEnvConfigurationPart} ${this.custodian} run ${regionOptions} --output-dir=${dir}response  ${policyPath} --cache-period=0`
          await ShellHelper.execAsync(command)
          if (regions.length > 1) {
            for (const region of regions) {
              result = result.concat(await C7nExecutor.fetchResourceJson(C7nExecutor.buildResourcePath(dir, policyName, undefined, region)))
            }
          } else {
            result = await C7nExecutor.fetchResourceJson(C7nExecutor.buildResourcePath(dir, policyName))
          }

          result = result.map(data => {
            data.C8rAccount = currentAccount
            return data
          })
        }

        if (useMultiAccount) {
          result = result.map(data => {
            data.C8rAccount = currentAccount + ' - Current'
            return data
          })

          const fetchPromises: Promise<any>[] = []
          accounts.forEach(account => {
            regions.forEach((region) => {
              fetchPromises.push(C7nExecutor.fetchResourceJson(C7nExecutor.buildResourcePath(dir, policyName, account, region)).then(
                tempData => {
                  result = result.concat(
                    tempData.flatMap(data => {
                      data.C8rAccount = account
                      return data
                    })
                  )
                }
              ))
            })
          })

          await Promise.all(fetchPromises)
        }

        return result
      } catch (e: any) {
        throw new CustodianError(e.message, id)
      } finally {
        // remove temp files and folders
        if (!isDebugMode) {
          await C7nExecutor.removeTempFoldersAndFiles(id)
        }
      }
    }

    private static async removeTempFoldersAndFiles (id: string) {
      await fs.promises.rm(`./.c8r/run/${id}`, { recursive: true, force: true })
      try {
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

    private static async fetchResourceJson (filePath: string): Promise<{
      C8rAccount: string|undefined
    }[]> {
      try {
        return JSON.parse(await fs.promises.readFile(filePath, 'utf8'))
      } catch (e) {
        throw new Error(`${filePath} file does not exist.`)
      }
    }
}

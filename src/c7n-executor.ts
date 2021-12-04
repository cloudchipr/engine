import fs from 'fs'
import yaml from 'js-yaml'
import { v4 } from 'uuid'
import { execSync } from 'child_process'
import winston, { Logger, transports } from 'winston'

export class C7nExecutor {
    private readonly custodian: string;
    private readonly custodianOrg?: string;
    private readonly logger: Logger;

    constructor (custodian: string, custodianOrg?: string) {
      this.custodian = custodian
      this.custodianOrg = custodianOrg
      this.logger = winston.createLogger({
        level: 'error',
        defaultMeta: { service: 'cloudchipr-engine' }
      })
    }

    execute (
      policy: any,
      policyName: string,
      regions: string[],
      currentAccount: string| undefined,
      accounts: string[],
      isDebugMode: boolean
    ) {
      const id: string = `${policyName}-${v4()}`
      const timestamp: string = Date.now().toString()
      const dir: string = `./tmp/c7r/${timestamp}/${id}/`
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      try {
        const policyPath: string = `${dir}policy.yaml`
        fs.writeFileSync(policyPath, yaml.dump(policy), 'utf8')

        let regionOptions = ''
        if (regions) {
          regionOptions = regions.map(region => ' --region ' + region).join(' ')
        }

        // validate all region request
        const all = regions.find(region => region === 'all')
        if (all !== undefined) {
          throw new Error('Region all is not implemented yet')
        }

        let result: {
            C8rRegion: string|undefined,
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
          fs.writeFileSync(`${accountsConfigFile}`, yaml.dump(accountsObject), 'utf8')
          const command = `${this.custodianOrg} run ${regionOptions} -c ${accountsConfigFile} -s ${dir}response-org  -u ${policyPath} --cache-period=0`

          execSync(
            command,
            { stdio: 'pipe' }
          )
        }

        if (includeCurrentAccount) {
          const command = `${this.custodian} run ${regionOptions} --output-dir=${dir}response  ${policyPath} --cache-period=0`

          execSync(
            command,
            { stdio: 'pipe' }
          )

          if (regions.length > 1) {
            result = regions.flatMap(region => {
              return C7nExecutor
                .fetchResourceJson(C7nExecutor.buildResourcePath(dir, policyName, undefined, region))
                .map(data => {
                  data.C8rRegion = region
                  return data
                })
            })
          } else {
            result = C7nExecutor.fetchResourceJson(C7nExecutor.buildResourcePath(dir, policyName))
          }
        }

        if (useMultiAccount) {
          if (result.length > 0) {
            result = result.map(data => {
              data.C8rAccount = currentAccount + ' - Current'
              return data
            })
          }
          accounts.forEach(account => {
            regions.forEach(region => {
              result = result.concat(
                C7nExecutor
                  .fetchResourceJson(C7nExecutor.buildResourcePath(dir, policyName, account, region))
                  .flatMap(data => {
                    if (regions.length > 1) {
                      data.C8rRegion = region
                    }
                    data.C8rAccount = account
                    return data
                  })
              )
            })
          })
        }
        return result
      } catch (e: any) {
        if (isDebugMode) {
          this.logger.clear().add(new transports.File({
            filename: `${dir}error.log`,
            format: winston.format.prettyPrint()
          })).error('Failed on executing custodian', e)
          throw new Error(`Failed on executing custodian, the trace log can be found in ${dir} directory.`)
        } else {
          throw new Error('Failed on executing custodian, please run c8s with --verbose flag and follow the trace log.')
        }
      } finally {
        // remove temp files and folders
        if (!isDebugMode) {
          C7nExecutor.removeTempFoldersAndFiles(timestamp, id)
        }
      }
    }

    private static removeTempFoldersAndFiles (timestamp: string, id: string): void {
      if (fs.existsSync(`./tmp/c7r/${timestamp}/${id}`)) {
        execSync(`rm -r ./tmp/c7r/${timestamp}/${id}`)
      }
      if (fs.readdirSync(`./tmp/c7r/${timestamp}`).length === 0) {
        execSync(`rm -r ./tmp/c7r/${timestamp}`)
      }
      if (fs.readdirSync('./tmp/c7r').length === 0) {
        execSync('rm -r ./tmp/c7r')
      }
      if (fs.readdirSync('./tmp').length === 0) {
        execSync('rm -r ./tmp')
      }
    }

    private static buildResourcePath (dir: string, policyName: string, account?: string, region?: string) {
      return `./${dir}` + (account ? 'response-org' : 'response') +
            (account ? `/${account}` : '') +
            (region ? `/${region}` : '') +
            `/${policyName}` +
            '/resources.json'
    }

    private static fetchResourceJson (filePath: string): {
        C8rRegion: string|undefined,
        C8rAccount: string|undefined
    }[] {
      if (!fs.existsSync(filePath)) {
        throw new Error(`${filePath} file does not exist.`)
      }

      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
}

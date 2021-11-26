import fs from 'fs'
import yaml from 'js-yaml'
import { v4 } from 'uuid'
import { execSync } from 'child_process'

export class C7nExecutor {
    private readonly custodian: string;
    private readonly custodianOrg?: string;

    constructor (custodian: string, custodianOrg?: string) {
      this.custodian = custodian
      this.custodianOrg = custodianOrg
    }

    execute (
      policy: any,
      policyName: string,
      regions: string[],
      currentAccount: string| undefined,
      accounts: string[]
    ) {
      const id: string = v4()
      const requestIdentifier: string = `${policyName}-${id}`
      fs.writeFileSync(`./${requestIdentifier}-policy.yaml`, yaml.dump(policy), 'utf8')

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

      const useMultiAccount = accounts.length > 0 && !(accounts.length === 1 && currentAccount && accounts.includes(currentAccount))
      if (useMultiAccount) {
        if (regions.length === 0) {
          regions.push('us-east-1') // default AWS region @todo must be changed later for other clouds
        }

        // exclude current account, anyway it will be fetch by signe clud custodian
        accounts = accounts.filter(a => a !== currentAccount)

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

        const accountsConfigFile: string = `${requestIdentifier}-accounts`
        const outputDir: string = `${requestIdentifier}-org`
        fs.writeFileSync(`./${accountsConfigFile}.yaml`, yaml.dump(accountsObject), 'utf8')

        execSync(
              `${this.custodianOrg} run ${regionOptions} -c ./${accountsConfigFile}.yaml -s ${outputDir}  -u ${requestIdentifier}-policy.yaml --cache-period=0`,
              { stdio: 'pipe' }
        )
      }

      try {
        execSync(
                `${this.custodian} run ${regionOptions} --output-dir=${requestIdentifier}  ${requestIdentifier}-policy.yaml --cache-period=0`,
                { stdio: 'pipe' }
        )

        if (regions.length > 1) {
          result = regions.flatMap(region => {
            return C7nExecutor
              .fetchResourceJson(C7nExecutor.buildResourcePath(requestIdentifier, policyName, undefined, region))
              .map(data => {
                data.C8rRegion = region
                return data
              })
          })
        } else {
          result = C7nExecutor.fetchResourceJson(C7nExecutor.buildResourcePath(requestIdentifier, policyName))
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
                  .fetchResourceJson(C7nExecutor.buildResourcePath(requestIdentifier, policyName, account, region))
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
      } finally {
        // remove temp files and folders
        C7nExecutor.removeTempFoldersAndFiles(requestIdentifier)
      }
    }

    private static removeTempFoldersAndFiles (requestIdentifier: string): void {
      if (fs.existsSync(`${requestIdentifier}`)) {
        execSync(`rm -r ${requestIdentifier}`)
      }
      if (fs.existsSync(`${requestIdentifier}-policy.yaml`)) {
        execSync(`rm ${requestIdentifier}-policy.yaml`)
      }
      if (fs.existsSync(`${requestIdentifier}-accounts.yaml`)) {
        execSync(`rm ${requestIdentifier}-accounts.yaml`)
      }
      if (fs.existsSync(`${requestIdentifier}-org`)) {
        execSync(`rm -r ${requestIdentifier}-org`)
      }
    }

    private static buildResourcePath (requestIdentifier: string, policyName: string, account?: string, region?: string) {
      return `./${requestIdentifier}` + (account ? '-org' : '') +
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

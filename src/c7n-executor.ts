import fs from 'fs'
import yaml from 'js-yaml'
import { v4 } from 'uuid'
import { execSync } from 'child_process'

export class C7nExecutor {
    private readonly custodian: string;

    constructor (custodian: string) {
      this.custodian = custodian
    }

    execute (
      policy: any,
      policyName: string,
      regions: string[]
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

      try {
        execSync(
                `${this.custodian} run ${regionOptions} --output-dir=${requestIdentifier}  ${requestIdentifier}-policy.yaml --cache-period=0`,
                { stdio: 'pipe' }
        )

        if (regions.length > 1) {
          return regions.flatMap(region => {
            return C7nExecutor
              .fetchResourceJson(C7nExecutor.buildResourcePath(requestIdentifier, policyName, region))
              .map(data => {
                data.C8rRegion = region
                return data
              })
          })
        } else {
          return C7nExecutor.fetchResourceJson(C7nExecutor.buildResourcePath(requestIdentifier, policyName))
        }
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
    }

    private static buildResourcePath (requestIdentifier: string, policyName: string, region?: string) {
      return `./${requestIdentifier}` +
            (region ? `/${region}` : '') +
            `/${policyName}` +
            '/resources.json'
    }

    private static fetchResourceJson (filePath: string): {
        C8rRegion: string|undefined
    }[] {
      if (!fs.existsSync(filePath)) {
        throw new Error(`${filePath} file does not exist.`)
      }

      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
}

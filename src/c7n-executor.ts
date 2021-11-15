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
      policyName: string
    ) {
      const id: string = v4()
      const requestIdentifier: string = `${policyName}-${id}`
      fs.writeFileSync(`./${requestIdentifier}-policy.yaml`, yaml.dump(policy), 'utf8')

      try {
        execSync(
                `${this.custodian} run --output-dir=${requestIdentifier}  ${requestIdentifier}-policy.yaml --cache-period=0`,
                { stdio: 'pipe' }
        )

        const resourcesPath = `./${requestIdentifier}/${policyName}/resources.json`
        if (!fs.existsSync(resourcesPath)) {
          throw new Error(`./${requestIdentifier}/${policyName}/resources.json file does not exist.`)
        }

        return JSON.parse(fs.readFileSync(resourcesPath, 'utf8'))
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
}

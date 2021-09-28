import {Configuration} from "./configuration";
import fs from "fs";
import yaml from "js-yaml";
import {execSync} from "child_process";

export class C7nExecutor {
    private readonly custodian: string;

    constructor(custodian: string) {
        this.custodian = custodian;
    }

    execute(
        config: Configuration,
        policy: any,
        policyName: string
    ) {
        fs.writeFileSync("./temp.yaml", yaml.dump(policy), "utf8");

        try {
            execSync(
                `AWS_DEFAULT_REGION=${config.region} AWS_ACCESS_KEY_ID=${config.accessKeyId} AWS_SECRET_ACCESS_KEY=${config.secretAccessKey} ${this.custodian} run --output-dir=.  temp.yaml`,
                { stdio: "pipe" }
            );

            const resourcesPath = `./${policyName}/resources.json`;
            if (!fs.existsSync(resourcesPath)) {
                throw new Error(`./${policyName}/resources.json file does not exist.`);
            }

            return JSON.parse(fs.readFileSync(resourcesPath, "utf8"));
        } finally {
            // remove temp files and folders
            C7nExecutor.removeTempFoldersAndFiles(policyName);
        }
    }

    private static removeTempFoldersAndFiles(policyName: string): void {
        if (fs.existsSync(`${policyName}`)) {
            execSync(`rm -r ${policyName}`);
        }
        if (fs.existsSync(`temp.yaml`)) {
            execSync(`rm temp.yaml`);
        }
    }
}
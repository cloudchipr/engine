import { EngineInterface } from "./EngineInterface";
import { Configuration } from "../Configuration";
import { execSync } from "child_process";
import yaml from "js-yaml";
import * as fs from "fs";
import * as policies from "../policy.json";
import { Ebs } from "../domain/types/ebs";
import { DetachedVolumesResponse } from "../responses/detached-volumes-response";
import { EngineResponse } from "../EngineResponse";
import { EngineRequest } from "../EngineRequest";
import {C7nFilterBuilder} from "../filters/C7nFilterBuilder";

export class AWSShellEngineAdapter implements EngineInterface {
  private readonly custodian: string;

  constructor(custodian: string) {
    this.custodian = custodian;
  }

  execute(request: EngineRequest): EngineResponse {
    const command = request.command.getValue();
    const subCommand = request.subCommand.getValue();

    const methodName = AWSShellEngineAdapter.getMethodName(command, subCommand);
    this.validateRequest(methodName);

    return (this as any)[methodName](request);
  }

  private collectEbs(request: EngineRequest): EngineResponse {
    const policyName = 'ebs-collect-unattached';
    const policy: any = Object.assign({}, policies[policyName]);

    policy.policies[0].filters = [request.parameter.filter.build(new C7nFilterBuilder())]

    // execute custodian command
    const responseJson = this.executeCustodianCommand(request.configuration, policy, policyName);

    // remove temp files and folders
    AWSShellEngineAdapter.removeTempFoldersAndFiles(policyName);

    return new EngineResponse();
  }

  private cleanEbs(request: EngineRequest): EngineResponse {
    return new EngineResponse();
  }

  private validateRequest(name: string) {
    if (typeof (this as any)[name] !== "function") {
      throw Error("Invalid AWS subcommand provided: " + name);
    }
  }

  private static getMethodName(command: string, subCommand: string): string {
    return command + AWSShellEngineAdapter.capitalizeFirstLetter(subCommand);
  }

  private static capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  executeCustodianCommand(config: Configuration, policy: any, policyName: string) {
    fs.writeFileSync('./temp.yaml', yaml.dump(policy), 'utf8');
    try {
      execSync(
        `AWS_DEFAULT_REGION=${config.region} AWS_ACCESS_KEY_ID=${config.accessKeyId} AWS_SECRET_ACCESS_KEY=${config.secretAccessKey} ${this.custodian} run --output-dir=.  temp.yaml`,
        { stdio: 'pipe' },
      );
    } catch (e) {
      throw new Error(e.message);
    }

    const resourcesPath = `./${policyName}/resources.json`;
    if (!fs.existsSync(resourcesPath)) {
      throw new Error(`./${policyName}/resources.json file does not exist.`);
    }
    const data = JSON.parse(fs.readFileSync(resourcesPath, 'utf8'));

    // remove temp files and folders
    AWSShellEngineAdapter.removeTempFoldersAndFiles(policyName);

    return data;
  }

  private static removeTempFoldersAndFiles(policyName: string): void {
    if (!fs.existsSync(`./${policyName}`)) {
      execSync(`rm -r ./${policyName}`);
    }
    if (!fs.existsSync(`./temp.yaml`)) {
      execSync(`rm ./temp.yaml`);
    }
  }

  private generateDetachedVolumesResponse(responseJson: any): DetachedVolumesResponse {
    return new DetachedVolumesResponse(
      responseJson.map(
        (ebsResponseItemJson: { VolumeId: string; Size: number; AvailabilityZone: string; CreateTime: string }) => {
          return new Ebs(
            ebsResponseItemJson.VolumeId,
            ebsResponseItemJson.Size,
            ebsResponseItemJson.AvailabilityZone,
            ebsResponseItemJson.CreateTime,
          );
        },
      ),
    );
  }
}

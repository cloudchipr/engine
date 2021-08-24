import { EngineInterface } from './EngineInterface';
import { Configuration } from '../Configuration';
import { GarbageItemInterface } from '../responses/garbage-item-interface';
import { execSync } from 'child_process';
import yaml from 'js-yaml';
import * as fs from 'fs';
import * as policies from '../policy.json';
import { FindGarbageResponse } from '../responses/find-garbage-response';
import { FindGarbageDetailsResponse } from '../responses/find-garbage-details-response';
import { Ebs } from '../domain/types/ebs';
import { EbsGarbageItem } from '../responses/ebs-garbage-item';
import { DetachedVolumesResponse } from '../responses/detached-volumes-response';
import { EngineResponse } from '../EngineResponse';
import { EngineRequest } from '../EngineRequest';

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

    return (this as any)[methodName]();
  }

  private collectEbs(): EngineResponse {
    return new EngineResponse();
  }

  private cleanEbs():EngineResponse {
    return new EngineResponse();
  }

  private validateRequest(name: string) {
    if (typeof (this as any)[name]  !== 'function') {
        throw Error("Invalid AWS subcommand provided: " + name)
    }
  }

  private static getMethodName(command: string, subCommand: string): string {
    return command + AWSShellEngineAdapter.capitalizeFirstLetter(subCommand);
  }

  private static capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // findGarbage(config: Configuration): FindGarbageResponse {
  //   const detachedVolumesResponse = this.findDetachedVolumes(config);
  //   return new FindGarbageResponse(detachedVolumesResponse.count);
  // }
  //
  // findGarbageDetails(config: Configuration): FindGarbageDetailsResponse {
  //   const items: GarbageItemInterface[] = new Array<GarbageItemInterface>();
  //
  //   const detachedVolumesResponse = this.findDetachedVolumes(config);
  //   detachedVolumesResponse.items.forEach((ebs: Ebs) => {
  //     items.push(EbsGarbageItem.fromEbs(ebs));
  //   });
  //
  //   return new FindGarbageDetailsResponse(items);
  // }
  //
  // findDetachedVolumes(config: Configuration): DetachedVolumesResponse {
  //   const policyName = 'ebs-collect-unattached';
  //   const policy: any = Object.assign({}, policies[policyName]);
  //
  //   // execute custodian command
  //   const responseJson = this.executeCustodianCommand(config, policy, policyName);
  //
  //   // remove temp files and folders
  //   ShellAdapter.removeTempFoldersAndFiles(policyName);
  //
  //   return this.generateDetachedVolumesResponse(responseJson);
  // }
  //
  // deleteDetachedVolumes(config: Configuration, volumes: string[] = []): DetachedVolumesResponse {
  //   const policyName = 'delete-unattached-volumes';
  //   const policy: any = Object.assign({}, policies[policyName]);
  //   if (volumes.length) {
  //     policy.policies[0].filters = [
  //       {
  //         type: 'value',
  //         key: 'VolumeId',
  //         op: 'in',
  //         value: volumes,
  //       },
  //     ];
  //   }
  //   fs.writeFileSync('./temp.yaml', yaml.dump(policy), 'utf8');
  //
  //   // execute custodian command
  //   const responseJson = this.executeCustodianCommand(config, policy, policyName);
  //
  //   return this.generateDetachedVolumesResponse(responseJson);
  // }
  //
  // executeCustodianCommand(config: Configuration, policy: any, policyName: string) {
  //   fs.writeFileSync('./temp.yaml', yaml.dump(policy), 'utf8');
  //   try {
  //     execSync(
  //       `AWS_DEFAULT_REGION=${config.region} AWS_ACCESS_KEY_ID=${config.accessKeyId} AWS_SECRET_ACCESS_KEY=${config.secretAccessKey} ${this.custodian} run --output-dir=.  temp.yaml`,
  //       { stdio: 'pipe' },
  //     );
  //   } catch (e) {
  //     throw new Error(e.message);
  //   }
  //
  //   const resourcesPath = `./${policyName}/resources.json`;
  //   if (!fs.existsSync(resourcesPath)) {
  //     throw new Error(`./${policyName}/resources.json file does not exist.`);
  //   }
  //   const data = JSON.parse(fs.readFileSync(resourcesPath, 'utf8'));
  //
  //   // remove temp files and folders
  //   ShellAdapter.removeTempFoldersAndFiles(policyName);
  //
  //   return data;
  // }
  //
  // private static removeTempFoldersAndFiles(policyName: string): void {
  //   if (!fs.existsSync(`./${policyName}`)) {
  //     execSync(`rm -r ./${policyName}`);
  //   }
  //   if (!fs.existsSync(`./temp.yaml`)) {
  //     execSync(`rm ./temp.yaml`);
  //   }
  // }
  //
  // private generateDetachedVolumesResponse(responseJson: any): DetachedVolumesResponse {
  //   return new DetachedVolumesResponse(
  //     responseJson.map(
  //       (ebsResponseItemJson: { VolumeId: string; Size: number; AvailabilityZone: string; CreateTime: string }) => {
  //         return new Ebs(
  //           ebsResponseItemJson.VolumeId,
  //           ebsResponseItemJson.Size,
  //           ebsResponseItemJson.AvailabilityZone,
  //           ebsResponseItemJson.CreateTime,
  //         );
  //       },
  //     ),
  //   );
  // }
}

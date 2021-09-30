import { EngineInterface } from "./engine-interface";
import * as policies from "../policy.json";
import { Ebs } from "../domain/types/aws/ebs";
import { EbsResponse } from "../responses/ebs-response";
import { EngineResponse } from "../engine-response";
import { EngineRequest } from "../engine-request";
import { C7nFilterBuilder } from "../filters/c7n-filter-builder";
import {C7nExecutor} from "../c7n-executor";

export class AWSShellEngineAdapter implements EngineInterface {
  private readonly custodianExecutor: C7nExecutor;

  constructor(custodian: string) {
    this.custodianExecutor = new C7nExecutor(custodian);
  }

  execute<Type>(request: EngineRequest): Type {
    const command = request.command.getValue();
    const subCommand = request.subCommand.getValue();

    const methodName = AWSShellEngineAdapter.getMethodName(command, subCommand);
    this.validateRequest(methodName);

    return (this as any)[methodName](request);
  }

  private collectEbs(request: EngineRequest): EngineResponse {
    const policyName = "ebs-collect";
    const policy: any = Object.assign({}, policies[policyName]);

    policy.policies[0].filters = [
      request.parameter.filter.build(new C7nFilterBuilder()),
    ];

    // execute custodian command
    const responseJson = this.custodianExecutor.execute(
      request.configuration,
      policy,
      policyName
    );

    return this.generateEbsResponse(responseJson)
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

  private generateEbsResponse(
    responseJson: any
  ): EbsResponse {
    return new EbsResponse(
      responseJson.map(
        (ebsResponseItemJson: {
          VolumeId: string;
          Size: number;
          VolumeType: string;
          CreateTime: string;
          Price: string;
          Tags: any[];
        }) => {
          return new Ebs(
            ebsResponseItemJson.VolumeId,
            ebsResponseItemJson.Size,
            ebsResponseItemJson.VolumeType,
            ebsResponseItemJson.CreateTime,
            ebsResponseItemJson.CreateTime,
            ebsResponseItemJson.Tags.find(tagObject => ['NAME', 'Name', 'name'].includes(tagObject.Key))?.Value
          );
        }
      )
    );
  }
}

import { SubCommandInterface } from "./sub-commandInterface";

export class AwsSubCommand implements SubCommandInterface {
  static readonly ALL_SUBCOMMAND = "all";
  static readonly EC2_SUBCOMMAND = "ec2";
  static readonly EBS_SUBCOMMAND = "ebs";

  private readonly subCommand: string;

  private constructor(subCommand: string) {
    this.subCommand = subCommand;
  }

  public getValue(): string {
    return this.subCommand;
  }

  static all(): AwsSubCommand {
    return new AwsSubCommand(this.ALL_SUBCOMMAND);
  }

  static ec2(): AwsSubCommand {
    return new AwsSubCommand(this.EC2_SUBCOMMAND);
  }

  static ebs(): AwsSubCommand {
    return new AwsSubCommand(this.EBS_SUBCOMMAND);
  }
}

import { SubCommandInterface } from './SubCommandInterface';

export class AWSSubCommand implements SubCommandInterface {
  static readonly ALL_SUBCOMMAND = "all";
  static readonly EC2_SUBCOMMAND = "ec2";
  static readonly EBS_SUBCOMMAND = "ebs";

  private readonly subCommand: string;

  private constructor(subCommand: string) {
    this.subCommand = subCommand
  }

  public getValue(): string {
    return this.subCommand
  }

  static all(): AWSSubCommand {
    return new AWSSubCommand(this.ALL_SUBCOMMAND)
  }

  static ec2(): AWSSubCommand {
    return new AWSSubCommand(this.EC2_SUBCOMMAND);
  }

  static ebs(): AWSSubCommand {
    return new AWSSubCommand(this.EBS_SUBCOMMAND);
  }
}
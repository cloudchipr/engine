import { SubCommandInterface } from './sub-command-interface'

export class AwsSubCommand implements SubCommandInterface {
  static readonly ALL_SUBCOMMAND = 'all';
  static readonly EC2_SUBCOMMAND = 'ec2';
  static readonly EBS_SUBCOMMAND = 'ebs';
  static readonly ELB_SUBCOMMAND = 'elb';
  static readonly NLB_SUBCOMMAND = 'nlb';
  static readonly ALB_SUBCOMMAND = 'alb';
  static readonly EIP_SUBCOMMAND = 'eip';

  private readonly subCommand: string;

  private constructor (subCommand: string) {
    this.subCommand = subCommand
  }

  public getValue (): string {
    return this.subCommand
  }

  static all (): AwsSubCommand {
    return new AwsSubCommand(this.ALL_SUBCOMMAND)
  }

  static ec2 (): AwsSubCommand {
    return new AwsSubCommand(this.EC2_SUBCOMMAND)
  }

  static ebs (): AwsSubCommand {
    return new AwsSubCommand(this.EBS_SUBCOMMAND)
  }

  static elb (): AwsSubCommand {
    return new AwsSubCommand(this.ELB_SUBCOMMAND)
  }

  static nlb (): AwsSubCommand {
    return new AwsSubCommand(this.NLB_SUBCOMMAND)
  }

  static alb (): AwsSubCommand {
    return new AwsSubCommand(this.ALB_SUBCOMMAND)
  }

  static eip (): AwsSubCommand {
    return new AwsSubCommand(this.EIP_SUBCOMMAND)
  }
}

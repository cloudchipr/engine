import { SubCommandInterface } from '../../sub-command-interface'

export class GcpSubCommand implements SubCommandInterface {
  static readonly ALL_SUBCOMMAND = 'all';
  static readonly VM_SUBCOMMAND = 'vm';
  static readonly DISKS_SUBCOMMAND = 'disks';
  static readonly EIP_SUBCOMMAND = 'eip';
  static readonly SQL_SUBCOMMAND = 'sql';
  static readonly LB_SUBCOMMAND = 'lb';

  private readonly subCommand: string;

  private constructor (subCommand: string) {
    this.subCommand = subCommand
  }

  public getValue (): string {
    return this.subCommand
  }

  static all (): GcpSubCommand {
    return new GcpSubCommand(this.ALL_SUBCOMMAND)
  }

  static vm (): GcpSubCommand {
    return new GcpSubCommand(this.VM_SUBCOMMAND)
  }

  static disks (): GcpSubCommand {
    return new GcpSubCommand(this.DISKS_SUBCOMMAND)
  }

  static eip (): GcpSubCommand {
    return new GcpSubCommand(this.EIP_SUBCOMMAND)
  }

  static sql (): GcpSubCommand {
    return new GcpSubCommand(this.SQL_SUBCOMMAND)
  }

  static lb (): GcpSubCommand {
    return new GcpSubCommand(this.LB_SUBCOMMAND)
  }
}

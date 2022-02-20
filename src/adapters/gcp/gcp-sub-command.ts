import { SubCommandInterface } from '../../sub-command-interface'

export class GcpSubCommand implements SubCommandInterface {
  static readonly ALL_SUBCOMMAND = 'all';
  static readonly VM_SUBCOMMAND = 'vm';
  static readonly DISKS_SUBCOMMAND = 'disks';
  static readonly EIP_SUBCOMMAND = 'eip';
  static readonly CLOUD_SQL_SUBCOMMAND = 'cloud-sql';
  static readonly LB_HTTP_SUBCOMMAND = 'lb-http';
  static readonly LB_TCP_SUBCOMMAND = 'lb-tcp';
  static readonly LB_UDP_SUBCOMMAND = 'lb-udp';

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

  static 'cloud-sql' (): GcpSubCommand {
    return new GcpSubCommand(this.CLOUD_SQL_SUBCOMMAND)
  }

  static 'lb-http' (): GcpSubCommand {
    return new GcpSubCommand(this.LB_HTTP_SUBCOMMAND)
  }

  static 'lb-tcp' (): GcpSubCommand {
    return new GcpSubCommand(this.LB_TCP_SUBCOMMAND)
  }

  static 'lb-udp' (): GcpSubCommand {
    return new GcpSubCommand(this.LB_UDP_SUBCOMMAND)
  }
}

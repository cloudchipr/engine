export class Command {
  static readonly COLLECT_COMMAND = "collect";
  static readonly CLEAN_COMMAND = "clean";
  static readonly NUKE_COMMAND = "noke";

  readonly command: string;

  getValue(): string {
    return this.command;
  }

  private constructor(command: string) {
    this.command = command
  }

  static collect(): Command {
    return new Command(this.COLLECT_COMMAND)
  }

  static clean(): Command {
    return new Command(this.CLEAN_COMMAND)
  }

  static nuke(): Command {
    return new Command(this.NUKE_COMMAND);
  }
}
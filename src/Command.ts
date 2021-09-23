export class Command {
  static readonly COLLECT_COMMAND = "collect";
  static readonly CLEAN_COMMAND = "clean";
  static readonly NUKE_COMMAND = "nuke";

  readonly command: string;

  private constructor(command: string) {
    this.command = command;
  }

  getValue(): string {
    return this.command;
  }

  static collect(): Command {
    return new Command(this.COLLECT_COMMAND);
  }

  static clean(): Command {
    return new Command(this.CLEAN_COMMAND);
  }

  static nuke(): Command {
    return new Command(this.NUKE_COMMAND);
  }
}

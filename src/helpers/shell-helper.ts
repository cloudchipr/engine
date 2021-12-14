import { exec } from 'child_process'
import { promisify } from 'util'

export class ShellHelper {
  public static async execAsync (command: string): Promise<any> {
    return await promisify(exec)(command)
  }
}

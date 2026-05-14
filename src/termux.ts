import { registerPlugin } from '@capacitor/core';

export interface TermuxPlugin {
  openTermux(): Promise<void>;
  runCommand(options: { command: string }): Promise<void>;
  isInstalled(): Promise<{ installed: boolean }>;
}

const Termux = registerPlugin<TermuxPlugin>('Termux');
export default Termux;

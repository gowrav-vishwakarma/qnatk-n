export interface QnatkModuleOptions {
  hooksDirectory: string;
  hookNameConstants?: string[]; // Array of valid hook names
  followPriorityOrder?: boolean; // If true, hooks will be executed in the order of their priority
}

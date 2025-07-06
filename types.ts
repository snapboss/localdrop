
export enum ViewMode {
  SENDER = 'SENDER',
  RECEIVER = 'RECEIVER',
}

export interface FileMetadata {
    name: string;
    size: number;
    type: string;
}

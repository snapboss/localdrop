
export interface Peer {
  id: string;
  name: string;
}

export enum MessageType {
  TEXT = 'TEXT',
  FILE_INFO = 'FILE_INFO',
  FILE_CHUNK = 'FILE_CHUNK',
  FILE_RECEIVED = 'FILE_RECEIVED',
  TRANSFER_CANCELLED = 'TRANSFER_CANCELLED',
  ERROR = 'ERROR',
}

export interface BaseMessage {
  type: MessageType;
}

export interface TextMessage extends BaseMessage {
  type: MessageType.TEXT;
  content: string;
}

export interface FileInfoMessage extends BaseMessage {
  type: MessageType.FILE_INFO;
  name: string;
  size: number;
  isZip: boolean;
}

export interface FileChunkMessage extends BaseMessage {
  type: MessageType.FILE_CHUNK;
  chunk: ArrayBuffer;
}

export interface FileReceivedMessage extends BaseMessage {
  type: MessageType.FILE_RECEIVED;
}

export interface TransferCancelledMessage extends BaseMessage {
  type: MessageType.TRANSFER_CANCELLED;
}

export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR;
  content: string;
}

export type AppMessage = TextMessage | FileInfoMessage | FileChunkMessage | FileReceivedMessage | TransferCancelledMessage | ErrorMessage;

export interface DisplayMessage {
  id: string;
  sender: 'me' | 'peer';
  type: 'text' | 'file' | 'status';
  content: string;
  fileName?: string;
  fileSize?: number;
}

export interface FileTransfer {
  name: string;
  size: number;
  isZip: boolean;
  status: 'pending' | 'receiving' | 'sending' | 'complete' | 'cancelled';
  progress: number;
  isSender: boolean;
}

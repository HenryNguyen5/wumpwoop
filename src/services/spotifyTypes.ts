export enum ServerStepType {
  LISTENING,
  RECEIVED_CODE,
  CLOSED,
}
export interface ServerStep<T = any> {
  type: ServerStepType;
  value?: T;
}

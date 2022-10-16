interface IResponseMetadata {
  status: ResStatusEnum;
  message: string;
  error: Error | null;
}

export type IDataResponse<T = any> = IResponseMetadata & T;

export enum ResStatusEnum {
  error = 'error',
  success = 'success',
}
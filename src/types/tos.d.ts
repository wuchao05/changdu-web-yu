/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '@volcengine/tos-sdk' {
  export default class TOS {
    constructor(config: {
      accessKeyId: string
      accessKeySecret: string
      stsToken: string
      region: string
      endpoint: string
      bucket: string
      secure: boolean
    })

    uploadFile(options: {
      key: string
      file: File
      partSize: number
      taskNum: number
      cancelToken?: any
      progress?: (percent: number) => void
    }): Promise<any>

    static CancelToken: {
      source(): {
        token: any
        cancel: (message: string) => void
      }
    }
  }
}

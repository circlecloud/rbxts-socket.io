const HttpService = game.GetService('HttpService')

export class Error {
    [key: string]: unknown
    constructor(message: string) {
        this.message = debug.traceback(message, 2)
        warn(this.message)
    }
    toString(): string {
        return this.message as string
    }
}

export const JSON = {
    parse: <T>(str: string | undefined) => {
        return HttpService.JSONDecode(str!) as T
    },
    stringify: (obj: unknown) => HttpService.JSONEncode(obj)
}

export const axios = {
    get: (url: string) => {
        return HttpService.RequestAsync({
            Url: url,
            Method: 'GET',
        })
    },
    post: (url: string, data: string = '', headers?: Record<string, string>,) => {
        return HttpService.RequestAsync({
            Url: url,
            Method: 'POST',
            Body: data,
            Headers: headers
        })
    },
    request: (requestOptions: RequestAsyncRequest) => {
        return HttpService.RequestAsync(requestOptions)
    }
}

export function encodeURIComponent(str: string) {
    return HttpService.UrlEncode(str)
}

export function decodeURIComponent(str: string) {
    return str.gsub("%%(%x%x)", (hex) => {
        return string.char(tonumber(hex, 16)!)
    })[0]
}

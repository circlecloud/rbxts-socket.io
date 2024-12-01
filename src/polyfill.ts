const HttpService = game.GetService('HttpService')

export class Error {
    [key: string]: unknown
    constructor(message: string) {
        this.message = message
        // $warn(debug.traceback(message, 2))
    }
    toString(): string {
        return JSON.stringify(this)
    }
}

export function Number(value: unknown) {
    return tonumber(value)
}

export const JSON = {
    parse: <T>(str: string | undefined) => {
        return HttpService.JSONDecode(str!) as T
    },
    stringify: (obj: unknown, replacer?: Callback, space?: number) => HttpService.JSONEncode(obj)
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

export function uuid() {
    return HttpService.GenerateGUID(false)
}

export function encodeURIComponent(str: string) {
    return HttpService.UrlEncode(str)
}

export function decodeURIComponent(str: string) {
    return str.gsub("%%(%x%x)", (hex) => {
        return string.char(tonumber(hex, 16)!)
    })[0]
}

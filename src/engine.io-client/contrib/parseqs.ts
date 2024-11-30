// imported from https://github.com/galkn/querystring

import { decodeURIComponent, encodeURIComponent } from "../../polyfill";

/**
 * Compiles a querystring
 * Returns string representation of the object
 *
 * @param {Object}
 * @api private
 */
export function encode(obj: Record<string, unknown>) {
    let str = '';
    for (const [key, value] of obj as unknown as Map<string, string>) {
        if (str.size()) str += '&';
        str += encodeURIComponent(key) + '=' + encodeURIComponent(value);
    }
    return str;
}

/**
 * Parses a simple querystring into an object
 *
 * @param {String} qs
 * @api private
 */
export function decode(qs: string) {
    let qry: Record<string, string> = {};
    let pairMaps = qs.split('&');
    for (const pair of pairMaps) {
        const [key, value] = pair.split('=');
        qry[decodeURIComponent(key)] = decodeURIComponent(value);
    }
    return qry;
}

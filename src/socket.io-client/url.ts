import { parse } from "../engine.io-client";
// import debugModule from "debug"; // debug()

// const debug = debugModule("socket.io-client:url"); // debug()
// directory, file, anchor, id, href
type ParsedUrl = {
    source: string;
    protocol: string;
    authority: string;
    userInfo: string;
    user: string;
    password: string;
    host: string;
    port: string;
    // relative: string;
    path: string;
    // directory: string;
    // file: string;
    query: string;
    // anchor: string;
    pathNames: Array<string>;
    queryKey: { [key: string]: string };

    // Custom properties (not native to parseuri):
    id: string;
    href: string;
};

/**
 * URL parser.
 *
 * @param uri - url
 * @param path - the request path of the connection
 * @param loc - An object meant to mimic window.location.
 *        Defaults to window.location.
 * @public
 */

export function url(
    uri: string | ParsedUrl,
    path: string = "",
    // loc?: Location,
): ParsedUrl {
    let obj = uri as ParsedUrl;

    // default to window.location
    // loc = loc || (typeof location !== "undefined" && location);
    // if (null == uri) uri = loc.protocol + "//" + loc.host;

    // relative path support
    if (typeOf(uri) === "string") {
        // if ("/" === uri.charAt(0)) {
        //     if ("/" === uri.charAt(1)) {
        //         uri = loc.protocol + uri;
        //     } else {
        //         uri = loc.host + uri;
        //     }
        // }

        // if (!/^(https?|wss?):\/\//.test(uri)) {
        //     debug("protocol-less url %s", uri);
        //     if ("undefined" !== typeof loc) {
        //         uri = loc.protocol + "//" + uri;
        //     } else {
        //         uri = "https://" + uri;
        //     }
        // }

        // // parse
        // debug("parse %s", uri);
        obj = parse(uri as string) as unknown as ParsedUrl;
    }

    // // make sure we treat `localhost:80` and `localhost` equally
    if (!obj.port) {
        if (obj.protocol === 'http' || obj.protocol === 'ws') {
            obj.port = "80";
        } else if (obj.protocol === 'https' || obj.protocol === 'wss') {
            obj.port = "443";
        }
    }

    obj.path = obj.path || "/";

    // const ipv6 = obj.host.indexOf(":") !== -1;
    // const host = ipv6 ? "[" + obj.host + "]" : obj.host;

    // define unique id
    obj.id = obj.protocol + "://" + obj.host + ":" + obj.port + path;
    // define href
    obj.href =
        obj.protocol +
        "://" +
        obj.host + ":" + obj.port

    return obj;
}

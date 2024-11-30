import { decode } from './parseqs'
type URI = {
    source: string
    protocol: string
    authority: string
    fragment: string
    query: string
    params: string
    path: string
    userInfo: string
    relative: string
    port: string
    host: string
    user: string
    password: string

    pathNames: (string | number)[]
    queryKey: Record<string, string>
}

export function parse(url: string) {
    if (url.size() > 800) throw 'URL too long'
    if (!url) throw 'invalid url'
    let parsed = {} as URI
    parsed.source = url
    // get scheme
    // url = string.gsub(url, "^([%w][%w%+%-%.]*)%:",
    //     function(s) parsed.scheme = s; return "" end)
    parsed.protocol = ''
    url = url.gsub("^([%w][%w%+%-%.]*)%:", (s) => {
        parsed.protocol = s
        return ""
    })[0] as string
    // -- get authority
    parsed.authority = ''
    url = url.gsub("^//([^/%?#]*)", (n) => {
        parsed.authority = n
        return ""
    })[0] as string
    // -- get fragment
    // url = string.gsub(url, "#(.*)$", function(f)
    //     parsed.fragment = f
    //     return ""
    // end)
    parsed.fragment = ''
    url = url.gsub("#(.*)$", (f) => {
        parsed.fragment = f
        return ""
    })[0] as string
    // -- get query string
    // url = string.gsub(url, "%?(.*)", function(q)
    //     parsed.query = q
    //     return ""
    // end)
    parsed.query = ''
    url = url.gsub("%?(.*)", (q) => {
        parsed.query = q
        return ""
    })[0] as string
    // -- get params
    // url = string.gsub(url, "%;(.*)", function(p)
    //     parsed.params = p
    //     return ""
    // end)
    parsed.params = ''
    url = url.gsub("%;(.*)", (p) => {
        parsed.params = p
        return ""
    })[0] as string
    // -- path is whatever was left
    // if url ~= "" then parsed.path = url end
    parsed.path = ''
    if (url !== "") parsed.path = url
    // local authority = parsed.authority
    let authority = parsed.authority
    // if not authority then return parsed end
    if (!authority) return parsed
    // authority = string.gsub(authority,"^([^@]*)@",
    //     function(u) parsed.userinfo = u; return "" end)
    authority = authority.gsub("^([^@]*)@", (u) => {
        parsed.userInfo = u
        return ""
    })[0] as string
    // authority = string.gsub(authority, ":([^:%]]*)$",
    //     function(p) parsed.port = p; return "" end)
    authority = authority.gsub(":([^:%]]*)$", (p) => {
        parsed.port = p
        return ""
    })[0] as string
    // if authority ~= "" then
    //     -- IPv6?
    //     parsed.host = string.match(authority, "^%[(.+)%]$") or authority
    // end
    if (authority) {
        // IPv6?
        parsed.host = authority.match("^%[(.+)%]$")[0] as string || authority
    }
    // local userinfo = parsed.userinfo
    let userinfo = parsed.userInfo
    // if not userinfo then return parsed end
    if (!userinfo) return parsed
    // userinfo = string.gsub(userinfo, ":([^:]*)$",
    //     function(p) parsed.password = p; return "" end)
    userinfo = userinfo.gsub(":([^:]*)$", (p) => {
        parsed.password = p
        return ""
    })[0] as string
    // parsed.user = userinfo
    parsed.user = userinfo
    // return parsed
    parsed.pathNames = pathNames(parsed.path)
    parsed.queryKey = decode(parsed.query)
    return parsed
}

function pathNames(path: string) {
    if (!path) return []
    path = path.gsub('/+', '/')[0]
    const names = []
    for (const [key] of path.gmatch("[^/]+")) {
        names.push(key)
    }
    if (path.sub(-1, 1) === '/') {
        names.remove(names.size() - 1)
    }
    return names
}

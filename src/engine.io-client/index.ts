import { Socket } from "./socket";

export { Socket };
export {
    SocketOptions,
    SocketWithoutUpgrade,
    SocketWithUpgrade,
} from "./socket";
export const protocol = Socket.protocol;
export { Transport, TransportError } from "./transport";
export { transports } from "./transports/index";
export { installTimerFunctions } from "./util";
export { parse } from "./contrib/parseuri";
export { nextTick } from "./globals.node";

export { Roblox as RobloxXHR, RobloxGlobalConfig } from "./transports/polling-roblox";
// export { XHR as NodeXHR } from "./transports/polling-xhr.node";
// export { XHR } from "./transports/polling-xhr";
// export { WS as NodeWebSocket } from "./transports/websocket.node";
// export { WS as WebSocket } from "./transports/websocket";
// export { WT as WebTransport } from "./transports/webtransport";

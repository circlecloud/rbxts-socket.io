import { decodePacket, Packet, RawData } from "../engine.io-parser";
import { Error } from "../polyfill";
import { Emitter } from "../component-emitter";
import { installTimerFunctions } from "./util";
import type { Socket, SocketOptions } from "./socket";
import { encode } from "./contrib/parseqs";
// import debugModule from "debug"; // debug()

// const debug = debugModule("engine.io-client:transport"); // debug()

export class TransportError extends Error {
    public readonly type = "TransportError";

    constructor(
        reason: string,
        readonly description: any,
        readonly context: any,
    ) {
        super(reason);
    }
}

export interface CloseDetails {
    description: string;
    context?: unknown; // context should be typed as CloseEvent | XMLHttpRequest, but these types are not available on non-browser platforms
}

interface TransportReservedEvents {
    open: () => void;
    error: (err: TransportError) => void;
    packet: (packet: Packet) => void;
    close: (details?: CloseDetails) => void;
    poll: () => void;
    pollComplete: () => void;
    drain: () => void;
}

type TransportState = "opening" | "open" | "closed" | "pausing" | "paused";

export abstract class Transport extends Emitter<TransportReservedEvents, any> {
    public query: Record<string, string>;
    public writable: boolean = false;

    protected opts: SocketOptions;
    protected supportsBinary: boolean;
    protected readyState: TransportState = 'open';
    protected socket: Socket;
    protected setTimeoutFn: Callback | undefined;

    constructor(opts: Partial<SocketOptions>) {
        super();

        installTimerFunctions(this, opts);

        this.opts = opts as SocketOptions;
        this.query = opts.query!;
        this.socket = opts.socket as Socket;
        this.supportsBinary = !opts.forceBase64;
    }
    /**
     * Emits an error.
     *
     * @param {String} reason
     * @param description
     * @param context - the error context
     * @return {Transport} for chaining
     * @protected
     */
    protected onError(reason: string, description: any, context?: any) {
        super.emitReserved(
            "error",
            new TransportError(reason, description, context),
        );
        return this;
    }

    /**
     * Opens the transport.
     */
    public open() {
        // $debug('Transport.open')
        this.readyState = "opening";
        // ROBLOXPATCH delay open socket open to next tick to avoid blocking the main thread
        task.delay(0, () => {
            this.doOpen();
        })
        return this;
    }

    /**
     * Closes the transport.
     */
    public close() {
        if (this.readyState === "opening" || this.readyState === "open") {
            this.doClose();
            this.onClose();
        }

        return this;
    }

    /**
     * Sends multiple packets.
     *
     * @param {Array} packets
     */
    public send(packets: Packet[]) {
        if (this.readyState === "open") {
            this.write(packets);
            // $debug("transport send packets complated");
        } else {
            // this might happen if the transport was silently closed in the beforeunload event handler
            // $debug("transport is not open, discarding packets");
        }
    }

    /**
     * Called upon open
     *
     * @protected
     */
    protected onOpen() {
        this.readyState = "open";
        this.writable = true;
        super.emitReserved("open");
    }

    /**
     * Called with data.
     *
     * @param {String} data
     * @protected
     */
    protected onData(data: RawData) {
        // ROBLOXPATCH
        const packet = decodePacket(data, this.socket.binaryType);
        this.onPacket(packet);
    }

    /**
     * Called with a decoded packet.
     *
     * @protected
     */
    protected onPacket(packet: Packet) {
        // $debug("onPacket", packet);
        super.emitReserved("packet", packet);
    }

    /**
     * Called upon close.
     *
     * @protected
     */
    protected onClose(details?: CloseDetails) {
        this.readyState = "closed";
        super.emitReserved("close", details);
    }

    /**
     * The name of the transport
     */
    // public abstract get name(): string;
    public abstract getName(): string

    /**
     * Pauses the transport, in order not to lose packets during an upgrade.
     *
     * @param onPause
     */
    public pause(onPause: () => void) { }

    protected createUri(schema: string, query: Record<string, unknown> = {}) {
        return (
            schema +
            "://" +
            this._hostname() +
            this._port() +
            this.opts.path +
            this._query(query)
        );
    }

    private _hostname() {
        return this.opts.hostname;
        // const hostname = this.opts.hostname;
        // return hostname.indexOf(":") === -1 ? hostname : "[" + hostname + "]";
    }

    private _port() {
        if (
            this.opts.port &&
            ((this.opts.secure && tonumber(this.opts.port) !== 443) ||
                (!this.opts.secure && tonumber(this.opts.port) !== 80))
        ) {
            return ":" + this.opts.port;
        } else {
            return "";
        }
    }

    private _query(query: Record<string, unknown>) {
        const encodedQuery = encode(query);
        return encodedQuery.size() ? "?" + encodedQuery : "";
    }

    protected abstract doOpen(): void;
    protected abstract doClose(): void;
    protected abstract write(packets: Packet[]): void;
}

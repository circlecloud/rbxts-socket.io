import {
    Socket as Engine,
    SocketOptions as EngineOptions,
    installTimerFunctions,
} from "../engine.io-client";
import { Socket, SocketOptions, DisconnectDescription } from "./socket.js";
import * as parser from "../socket.io-parser";
import { Decoder, Encoder, Packet } from "../socket.io-parser";
import { on } from "./on";
import { Backoff } from "./contrib/backo2.js";
import {
    DefaultEventsMap,
    Emitter,
    EventsMap,
} from "../component-emitter";
// import debugModule from "debug"; // debug()
import { Error } from "../polyfill";

// const debug = debugModule("socket.io-client:manager"); // debug()

export interface ManagerOptions extends EngineOptions {
    /**
     * Should we force a new Manager for this connection?
     * @default false
     */
    forceNew: boolean;

    /**
     * Should we multiplex our connection (reuse existing Manager) ?
     * @default true
     */
    multiplex: boolean;

    /**
     * The path to get our client file from, in the case of the server
     * serving it
     * @default '/socket.io'
     */
    path: string;

    /**
     * Should we allow reconnections?
     * @default true
     */
    reconnection: boolean;

    /**
     * How many reconnection attempts should we try?
     * @default Infinity
     */
    reconnectionAttempts: number;

    /**
     * The time delay in milliseconds between reconnection attempts
     * @default 1000
     */
    reconnectionDelay: number;

    /**
     * The max time delay in milliseconds between reconnection attempts
     * @default 5000
     */
    reconnectionDelayMax: number;

    /**
     * Used in the exponential backoff jitter when reconnecting
     * @default 0.5
     */
    randomizationFactor: number;

    /**
     * The timeout in milliseconds for our connection attempt
     * @default 20000
     */
    timeout: number;

    /**
     * Should we automatically connect?
     * @default true
     */
    autoConnect: boolean;

    /**
     * the parser to use. Defaults to an instance of the Parser that ships with socket.io.
     */
    parser: unknown;
}

interface ManagerReservedEvents {
    open: () => void;
    error: (err: Error) => void;
    ping: () => void;
    packet: (packet: Packet) => void;
    close: (reason: string, description?: DisconnectDescription) => void;
    reconnect_failed: () => void;
    reconnect_attempt: (attempt: number) => void;
    reconnect_error: (err: Error) => void;
    reconnect: (attempt: number) => void;
}

export class Manager<
    ListenEvents extends EventsMap = DefaultEventsMap,
    EmitEvents extends EventsMap = ListenEvents,
> extends Emitter<any, any, ManagerReservedEvents> {
    /**
     * The Engine.IO client instance
     *
     * @public
     */
    public engine: Engine = undefined as unknown as Engine;
    /**
     * @private
     */
    _autoConnect: boolean;
    /**
     * @private
     */
    _readyState: "opening" | "open" | "closed";
    /**
     * @private
     */
    _reconnecting: boolean | undefined;

    private readonly uri: string;
    public opts: Partial<ManagerOptions>;

    private nsps: Record<string, Socket> = {};
    private subs: Array<ReturnType<typeof on>> = [];
    private backoff: Backoff;
    public setTimeoutFn: (cb: Callback, delay: number) => thread = undefined as unknown as () => thread;
    public clearTimeoutFn: (thread: thread) => void = undefined as unknown as (thread: thread) => void;
    private _reconnection: boolean = false;
    private _reconnectionAttempts: number = 0;
    private _reconnectionDelay: number = 0;
    private _randomizationFactor: number = 0;
    private _reconnectionDelayMax: number = 0;
    private _timeout: number = 0;

    private encoder: Encoder;
    private decoder: Decoder;
    private skipReconnect: boolean = false;

    /**
     * `Manager` constructor.
     *
     * @param uri - engine instance or engine uri/opts
     * @param opts - options
     * @public
     */
    constructor(opts: Partial<ManagerOptions>);
    constructor(uri?: string, opts?: Partial<ManagerOptions>);
    constructor(
        uri?: string | Partial<ManagerOptions>,
        opts?: Partial<ManagerOptions>,
    );
    constructor(
        uri?: string | Partial<ManagerOptions>,
        opts?: Partial<ManagerOptions>,
    ) {
        super();
        if (uri && "string" !== typeOf(uri)) {
            opts = uri as Partial<ManagerOptions>;
            uri = undefined;
        }
        opts = opts || {};

        opts.path = opts.path || "/socket.io";
        this.opts = opts;
        installTimerFunctions(this, opts);
        this.reconnection(opts.reconnection !== false);
        this.reconnectionAttempts(opts.reconnectionAttempts || 10000000000);
        this.reconnectionDelay(opts.reconnectionDelay || 1000);
        this.reconnectionDelayMax(opts.reconnectionDelayMax || 5000);
        this.randomizationFactor(opts.randomizationFactor ?? 0.5);
        this.backoff = new Backoff({
            min: this.reconnectionDelay(),
            max: this.reconnectionDelayMax(),
            jitter: this.randomizationFactor(),
        });
        this.timeout(undefined === opts.timeout ? 20000 : opts.timeout);
        this._readyState = undefined as unknown as 'closed';
        this.uri = uri as string;
        const _parser: { [key: string]: { new(): Encoder | Decoder } } = opts.parser as { [key: string]: { new(): Encoder | Decoder } } || parser;
        this.encoder = new _parser.Encoder() as Encoder;
        this.decoder = new _parser.Decoder() as Decoder;
        this._autoConnect = opts.autoConnect !== false;
        if (this._autoConnect) this.open();
        // $debug('manager constructor finish', this)
    }

    /**
     * Sets the `reconnection` config.
     *
     * @param {Boolean} v - true/false if it should automatically reconnect
     * @return {Manager} self or value
     * @public
     */
    public reconnection(v: boolean): this;
    public reconnection(): boolean;
    public reconnection(v?: boolean): this | boolean;
    public reconnection(...args: unknown[]): this | boolean {
        if (!args.size()) return this._reconnection;
        const [v] = args;
        this._reconnection = !!v;
        if (!v) {
            this.skipReconnect = true;
        }
        return this;
    }

    /**
     * Sets the reconnection attempts config.
     *
     * @param {Number} v - max reconnection attempts before giving up
     * @return {Manager} self or value
     * @public
     */
    public reconnectionAttempts(v: number): this;
    public reconnectionAttempts(): number;
    public reconnectionAttempts(v?: number): this | number;
    public reconnectionAttempts(v?: number): this | number {
        if (v === undefined) return this._reconnectionAttempts as number;
        this._reconnectionAttempts = v;
        return this;
    }

    /**
     * Sets the delay between reconnections.
     *
     * @param {Number} v - delay
     * @return {Manager} self or value
     * @public
     */
    public reconnectionDelay(v: number): this;
    public reconnectionDelay(): number;
    public reconnectionDelay(v?: number): this | number;
    public reconnectionDelay(v?: number): this | number {
        if (v === undefined) return this._reconnectionDelay as number;
        this._reconnectionDelay = v;
        this.backoff?.setMin(v);
        return this;
    }

    /**
     * Sets the randomization factor
     *
     * @param v - the randomization factor
     * @return self or value
     * @public
     */
    public randomizationFactor(v: number): this;
    public randomizationFactor(): number;
    public randomizationFactor(v?: number): this | number;
    public randomizationFactor(v?: number): this | number {
        if (v === undefined) return this._randomizationFactor as number;
        this._randomizationFactor = v;
        this.backoff?.setJitter(v);
        return this;
    }

    /**
     * Sets the maximum delay between reconnections.
     *
     * @param v - delay
     * @return self or value
     * @public
     */
    public reconnectionDelayMax(v: number): this;
    public reconnectionDelayMax(): number;
    public reconnectionDelayMax(v?: number): this | number;
    public reconnectionDelayMax(v?: number): this | number {
        if (v === undefined) return this._reconnectionDelayMax as number;
        this._reconnectionDelayMax = v;
        this.backoff?.setMax(v);
        return this;
    }

    /**
     * Sets the connection timeout. `false` to disable
     *
     * @param v - connection timeout
     * @return self or value
     * @public
     */
    public timeout(v: number | boolean): this;
    public timeout(): number | boolean;
    public timeout(v?: number | boolean): this | number | boolean;
    public timeout(...args: unknown[]): this | number | boolean {
        if (!args.size()) return this._timeout as number | boolean;
        const [v] = args
        this._timeout = v as number;
        return this;
    }

    /**
     * Starts trying to reconnect if reconnection is enabled and we have not
     * started reconnecting yet
     *
     * @private
     */
    private maybeReconnectOnOpen() {
        // Only try to reconnect if it's the first time we're connecting
        if (
            !this._reconnecting &&
            this._reconnection &&
            this.backoff.attempts === 0
        ) {
            // keeps reconnection from firing twice for the same reconnection loop
            this.reconnect();
        }
    }

    /**
     * Sets the current transport `socket`.
     *
     * @param {Function} fn - optional, callback
     * @return self
     * @public
     */
    public open(fn?: (err?: Error) => void): this {
        // $debug("readyState %s", this._readyState);
        if (this._readyState === 'opening' || this._readyState === 'open') return this;

        // $debug("opening %s", this.uri);
        this.engine = new Engine(this.uri, this.opts as unknown as EngineOptions);
        const socket = this.engine;
        this._readyState = "opening";
        this.skipReconnect = false;

        // emit `open`
        const openSubDestroy = on(socket, "open", () => {
            this.onopen();
            fn && fn();
        });

        const onError = (err: Error) => {
            // $debug("error", err);
            this.cleanup();
            this._readyState = "closed";
            this.emitReserved("error", err);
            if (fn) {
                fn(err);
            } else {
                // Only do this if there is no fn to handle the error
                this.maybeReconnectOnOpen();
            }
        };

        // emit `error`
        const errorSub = on(socket, "error", onError);

        if (0 !== this._timeout) {
            const timeout = this._timeout;
            // $debug("connect attempt will timeout after %d", timeout);

            // set timer
            const timer = this.setTimeoutFn!(() => {
                // $debug("connect attempt timed out after %d", timeout);
                openSubDestroy();
                onError(new Error("timeout"));
                socket.close();
            }, timeout);

            // if (this.opts.autoUnref) {
            //     timer.unref();
            // }

            this.subs.push(() => {
                this.clearTimeoutFn!(timer);
            });
        }

        this.subs.push(openSubDestroy);
        this.subs.push(errorSub);

        return this;
    }

    /**
     * Alias for open()
     *
     * @return self
     * @public
     */
    public connect(fn?: (err?: Error) => void): this {
        return this.open(fn);
    }

    /**
     * Called upon transport open.
     *
     * @private
     */
    private onopen(): void {
        // $debug("manager onopen open");

        // clear old subs
        this.cleanup();

        // mark as open
        this._readyState = "open";
        this.emitReserved("open");

        // add new subs
        const socket = this.engine;
        this.subs.push(
            on(socket, "ping", () => this.onping()),
            on(socket, "data", (data) => this.ondata(data)),
            on(socket, "error", (err) => this.onerror(err)),
            on(socket, "close", (reason, description?: unknown) => this.onclose(reason, description as DisconnectDescription)),
            on(this.decoder, "decoded", (packet) => this.ondecoded(packet)),
        );
    }

    /**
     * Called upon a ping.
     *
     * @private
     */
    private onping(): void {
        this.emitReserved("ping");
    }

    /**
     * Called with data.
     *
     * @private
     */
    private ondata(data: unknown): void {
        // $debug("manager received data", data, this.decoder);
        try {
            this.decoder.add(data);
        } catch (e) {
            this.onclose("parse error", e as Error);
        }
    }

    /**
     * Called when parser fully decodes a packet.
     *
     * @private
     */
    private ondecoded(packet: Packet): void {
        // the nextTick call prevents an exception in a user-provided event listener from triggering a disconnection due to a "parse error"
        this.emitReserved("packet", packet);
        // nextTick(() => {
        // }/**, this.setTimeoutFn */);
    }

    /**
     * Called upon socket error.
     *
     * @private
     */
    private onerror(err: unknown): void {
        // $debug("error", err);
        this.emitReserved("error", err);
    }

    /**
     * Creates a new socket for the given `nsp`.
     *
     * @return {Socket}
     * @public
     */
    public socket(nsp: string, opts?: Partial<SocketOptions>): Socket {
        // $debug(this.nsps)
        let socket = this.nsps[nsp];
        if (!socket) {
            // $debug("new namespace", nsp);
            socket = new Socket(this, nsp, opts);
            this.nsps[nsp] = socket;
        } else if (this._autoConnect && !socket.active()) {
            // $debug("reconnect", nsp);
            socket.connect();
        }

        return socket;
    }

    /**
     * Called upon a socket close.
     *
     * @param socket
     * @private
     */
    _destroy(socket: Socket): void {
        for (const [nsp, socket] of this.nsps as unknown as Map<string, Socket>) {
            if (socket.active()) {
                // $debug("socket %s is still active, skipping close", nsp);
                return;
            }
        }

        this._close();
    }

    /**
     * Writes a packet.
     *
     * @param packet
     * @private
     */
    _packet(packet: Partial<Packet & { query: string; options: any }>): void {
        // $debug("writing packet %j", packet);

        const encodedPackets = this.encoder.encode(packet as Packet);
        for (let i = 0; i < encodedPackets.size(); i++) {
            this.engine.write(encodedPackets[i], packet.options);
        }
    }

    /**
     * Clean up transport subscriptions and packet buffer.
     *
     * @private
     */
    private cleanup(): void {
        // $debug("cleanup");

        this.subs.forEach((subDestroy) => subDestroy());
        this.subs.clear()

        this.decoder.destroy();
    }

    /**
     * Close the current socket.
     *
     * @private
     */
    _close(): void {
        // $debug("disconnect");
        this.skipReconnect = true;
        this._reconnecting = false;
        this.onclose("forced close");
    }

    /**
     * Alias for close()
     *
     * @private
     */
    private disconnect(): void {
        return this._close();
    }

    /**
     * Called when:
     *
     * - the low-level engine is closed
     * - the parser encountered a badly formatted packet
     * - all sockets are disconnected
     *
     * @private
     */
    private onclose(reason: string, description?: DisconnectDescription): void {
        // $debug("closed due to %s", reason);

        this.cleanup();
        this.engine?.close();
        this.backoff.reset();
        this._readyState = "closed";
        this.emitReserved("close", reason, description);

        if (this._reconnection && !this.skipReconnect) {
            this.reconnect();
        }
    }

    /**
     * Attempt a reconnection.
     *
     * @private
     */
    private reconnect(): this | void {
        if (this._reconnecting || this.skipReconnect) return this;

        if (this.backoff.attempts >= this._reconnectionAttempts!) {
            // $debug("reconnect failed");
            this.backoff.reset();
            this.emitReserved("reconnect_failed");
            this._reconnecting = false;
        } else {
            const delay = this.backoff.duration();
            // $debug("will wait %dms before reconnect attempt", delay);

            this._reconnecting = true;
            const timer = this.setTimeoutFn!(() => {
                if (this.skipReconnect) return;

                // $debug("attempting reconnect");
                this.emitReserved("reconnect_attempt", this.backoff.attempts);

                // check again for the case socket closed in above events
                if (this.skipReconnect) return;

                this.open((err) => {
                    if (err) {
                        // $debug("reconnect attempt error");
                        this._reconnecting = false;
                        this.reconnect();
                        this.emitReserved("reconnect_error", err);
                    } else {
                        // $debug("reconnect success");
                        this.onreconnect();
                    }
                });
            }, delay);

            // if (this.opts.autoUnref) {
            //     timer.unref();
            // }

            this.subs.push(() => {
                this.clearTimeoutFn!(timer);
            });
        }
    }

    /**
     * Called upon successful reconnect.
     *
     * @private
     */
    private onreconnect(): void {
        const attempt = this.backoff.attempts;
        this._reconnecting = false;
        this.backoff.reset();
        this.emitReserved("reconnect", attempt);
    }
}

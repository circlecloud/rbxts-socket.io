/**
 * An events map is an interface that maps event names to their value, which
 * represents the type of the `on` listener.
 */
export interface EventsMap {
    [event: string]: any;
}

/**
 * The default events map, used if no EventsMap is given. Using this EventsMap
 * is equivalent to accepting all event names, and any data.
 */
export interface DefaultEventsMap {
    [event: string]: (...args: any[]) => void;
}

/**
 * Returns a union type containing all the keys of an event map.
 */
export type EventNames<Map extends EventsMap> = keyof Map & (string);

/** The tuple type representing the parameters of an event listener */
export type EventParams<
    Map extends EventsMap,
    Ev extends EventNames<Map>
> = Parameters<Map[Ev]>;

/**
 * The event names that are either in ReservedEvents or in UserEvents
 */
export type ReservedOrUserEventNames<
    ReservedEventsMap extends EventsMap,
    UserEvents extends EventsMap
> = EventNames<ReservedEventsMap> | EventNames<UserEvents>;

/**
 * Type of a listener of a user event or a reserved event. If `Ev` is in
 * `ReservedEvents`, the reserved event listener is returned.
 */
export type ReservedOrUserListener<
    ReservedEvents extends EventsMap,
    UserEvents extends EventsMap,
    Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>
> = FallbackToUntypedListener<
    Ev extends EventNames<ReservedEvents>
    ? ReservedEvents[Ev]
    : Ev extends EventNames<UserEvents>
    ? UserEvents[Ev]
    : never
>;

/**
 * Returns an untyped listener type if `T` is `never`; otherwise, returns `T`.
 *
 * This is a hack to mitigate https://github.com/socketio/socket.io/issues/3833.
 * Needed because of https://github.com/microsoft/TypeScript/issues/41778
 */
type FallbackToUntypedListener<T> = [T] extends [never]
    ? (...args: any[]) => void | Promise<void>
    : T;


type ECallback<T = never> = T | OnceCallback<T>
type OnceCallback<T = never> = {
    cb: Callback
    fn: T
}
/**
 * Strictly typed version of an `EventEmitter`. A `TypedEventEmitter` takes type
 * parameters for mappings of event names to event data types, and strictly
 * types method calls to the `EventEmitter` according to these event maps.
 *
 * @typeParam ListenEvents - `EventsMap` of user-defined events that can be
 * listened to with `on` or `once`
 * @typeParam EmitEvents - `EventsMap` of user-defined events that can be
 * emitted with `emit`
 * @typeParam ReservedEvents - `EventsMap` of reserved events, that can be
 * emitted by socket.io with `emitReserved`, and can be listened to with
 * `listen`.
 */
export class Emitter<
    ListenEvents extends EventsMap,
    EmitEvents extends EventsMap,
    ReservedEvents extends EventsMap = {}
> {
    // private __events: Map<string, Signal> = new Map();
    // private __connections: Map<string, RBXScriptConnection> = new Map();
    private __callbacks: Map<string, ECallback<ReservedOrUserListener<ReservedEvents, ListenEvents, never>>[]> = new Map();

    constructor() {
    }
    /**
     * Adds the `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the event
     * @param listener Callback function
     */
    on<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        ev: Ev,
        listener: ReservedOrUserListener<ReservedEvents, ListenEvents, Ev>
    ) {
        // if (!this.__events.has(ev)) {
        //     this.__events.set(ev, new Signal(ev))
        //     this.__connections.set(ev, this.__events.get(ev)!.Event.Connect((...args: unknown[]) => {
        //         this.__callbacks.get(ev)?.forEach(callback => {
        //             if (typeIs(callback, "function")) {
        //                 callback(...args)
        //             } else {
        //                 callback.cb(...args)
        //             }
        //         })
        //     }))
        // }
        if (!this.__callbacks.has(ev)) {
            this.__callbacks.set(ev, [])
        }
        this.__callbacks.get(ev)!.push(listener)
        return this
    }

    /**
     * Adds a one-time `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the event
     * @param listener Callback function
     */
    once<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        ev: Ev,
        listener: ReservedOrUserListener<ReservedEvents, ListenEvents, Ev>
    ) {
        const on = (...args: unknown[]) => {
            this.off(ev, listener);
            (listener as Callback)(...(args as unknown[]))
        }
        this.on(ev, { cb: on, fn: listener } as ReservedOrUserListener<ReservedEvents, ListenEvents, Ev>)
        return this
    }

    /**
     * Removes the `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the event
     * @param listener Callback function
     */
    off<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        ev?: Ev,
        listener?: ReservedOrUserListener<ReservedEvents, ListenEvents, Ev>
    ): this {
        if (!ev) {
            this.__callbacks.clear()
            return this
        }

        const callbacks = this.__callbacks.get(ev)
        if (!callbacks) { return this }

        if (!(listener as unknown)) {
            callbacks.clear()
            return this
        }

        let cb: ECallback<unknown>;
        for (var i = 0; i < callbacks.size(); i++) {
            cb = callbacks[i];
            if ((typeOf(cb) === "function" && cb === (listener as unknown)) || (cb as OnceCallback<unknown>).fn === (listener as unknown)) {
                callbacks.remove(i);
                break;
            }
        }

        if (callbacks.size() === 0) {
            // this.__events.get(ev)?.Destroy()
            // this.__events.delete(ev)
            // this.__connections.get(ev)?.Disconnect()
            // this.__connections.delete(ev)
            this.__callbacks.delete(ev)
        }

        return this
    }

    /**
     * Emits an event.
     *
     * @param ev Name of the event
     * @param args Values to send to listeners of this event
     */
    emit<Ev extends EventNames<EmitEvents>>(
        ev: Ev,
        ...args: EventParams<EmitEvents, Ev>
    ) {
        return this.emitReserved(ev, ...args);
    }

    /**
     * Emits a reserved event.
     *
     * This method is `protected`, so that only a class extending
     * `StrictEventEmitter` can emit its own reserved events.
     *
     * @param ev Reserved event name
     * @param args Arguments to emit along with the event
     */
    protected emitReserved<Ev extends EventNames<EmitEvents>>(
        ev: Ev,
        ...args: unknown[]
    ) {
        // this.__events.get(ev)?.Fire(...args)
        let callbacks = this.__callbacks.get(ev)

        if (callbacks) {
            task.spawn(() => {
                for (const callback of callbacks) {
                    if (typeIs(callback, "function")) {
                        callback(...args)
                    } else {
                        (callback as ECallback<never>).cb(...args)
                    }
                }
            })
        }

        return this;
    }

    /**
     * Returns the listeners listening to an event.
     *
     * @param event Event name
     * @returns Array of listeners subscribed to `event`
     */
    listeners<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        event: Ev
    ) {
        return this.__callbacks.get(event) || []
    }

    /**
     * Returns true if there is a listener for this event.
     *
     * @param event Event name
     * @returns boolean
     */
    hasListeners<
        Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>
    >(event: Ev): boolean {
        return this.__callbacks.has(event);
    }

    /**
     * Removes the `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the event
     * @param listener Callback function
     */
    removeListener<
        Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>
    >(
        ev?: Ev,
        listener?: ReservedOrUserListener<ReservedEvents, ListenEvents, Ev>
    ): this {
        return this.off(ev, listener)
    }

    /**
     * Removes all `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the event
     */
    removeAllListeners<
        Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>
    >(ev?: Ev): this {
        return this.off(ev)
    }
}

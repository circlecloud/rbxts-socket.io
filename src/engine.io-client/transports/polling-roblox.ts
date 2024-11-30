import { Polling } from "./polling";
import { axios } from "../../polyfill";
import type { SocketOptions } from "../socket";
import { encodePayload, Packet } from "../../engine.io-parser";
import { CloseDetails } from "../transport";

const RunService = game.GetService('RunService')
export class RobloxGlobalConfig {
    /**
     * Max request per minute
     */
    public static MAX_REQUEST_PER_INTERVAL = 200;
    /**
     * Interval to reset request times
     */
    public static REQUEST_TIMES_RESET_INTERVAL = 60
    /**
     * Interval to flush packets
     */
    public static FLUSH_PACKET_INTERVAL = 0.3
    private static resetTime = this.REQUEST_TIMES_RESET_INTERVAL
    private static requestTimes = 0
    static {
        RunService.Heartbeat.Connect((dt) => {
            RobloxGlobalConfig.resetTime -= dt
            if (RobloxGlobalConfig.resetTime < 0) {
                RobloxGlobalConfig.resetTime = RobloxGlobalConfig.REQUEST_TIMES_RESET_INTERVAL
                RobloxGlobalConfig.requestTimes = 0
            }
        })
    }
    public static increment() {
        RobloxGlobalConfig.requestTimes++
    }
    public static waitCanSend() {
        while (RobloxGlobalConfig.requestTimes >= RobloxGlobalConfig.MAX_REQUEST_PER_INTERVAL) {
            RunService.Heartbeat.Wait()
        }
    }
}

export class Roblox extends Polling {
    private running = true
    private sendQueue: Packet[] = []
    constructor(opts: Partial<SocketOptions>) {
        super(opts)
        game.BindToClose(() => {
            this.running = false
            this.flush()
        })

        task.delay(0, () => {
            while (this.running) {
                RobloxGlobalConfig.waitCanSend()
                this.flush()
                wait(RobloxGlobalConfig.FLUSH_PACKET_INTERVAL)
            }
        })
    }
    protected override onClose(details?: CloseDetails): void {
        super.onClose(details)
        this.running = false
    }
    private flush() {
        if (this.sendQueue.size()) {
            // ROBLOXPATCH because queue so ignore check
            // this.writable = false;
            const payload = encodePayload(this.sendQueue)
            this.sendQueue.clear()
            // $debug('flush sendQueue', this.requestTimes, payload)
            this.doWrite(payload, () => {
                this.writable = true;
                this.emitReserved("drain");
            })
        }
    }
    /**
    * Writes a packets payload.
    *
    * @param {Array} packets - data packets
    * @protected
    */
    override write(packets: Packet[]) {
        for (const packet of packets) {
            this.sendQueue.push(packet)
        }
    }
    doPoll(): void {
        try {
            // $debug('Roblox.doPoll', this.requestTimes, this.uri())
            RobloxGlobalConfig.waitCanSend()
            const response = axios.get(this.uri())
            RobloxGlobalConfig.increment()
            // $debug('Roblox.doPoll response', response)
            this.onData(response.Body)
        } catch (err) {
            this.onError('HttpService.GetAsync error', err, err)
        }
    }
    doWrite(data: string, callback: () => void): void {
        try {
            // $debug('Roblox.doWrite', this.uri(), data, debug.traceback())
            if (!data) { return }
            const response = axios.post(this.uri(), data)
            RobloxGlobalConfig.increment()
            // $debug('Roblox.doWrite response', response)
            if (!response.Success || response.StatusCode !== 200 || response.Body !== 'ok') throw `response not eq ok`
            callback()
        } catch (err) {
            this.onError('HttpService.PostAsync error', err, err)
        }
    }
}
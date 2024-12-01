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
            this.resetTime -= dt
            if (this.resetTime < 0) {
                this.resetTime = this.REQUEST_TIMES_RESET_INTERVAL
                this.requestTimes = 0
            }
        })
    }
    public static increment() {
        this.requestTimes++
    }
    public static waitCanSend() {
        while (this.requestTimes >= this.MAX_REQUEST_PER_INTERVAL) {
            RunService.Heartbeat.Wait()
        }
    }
}

export class Roblox extends Polling {
    private running = true
    private sendQueue: Packet[] = []
    constructor(opts: Partial<SocketOptions>) {
        super(opts)

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
        this.flush()
        this.running = false
    }
    private flush() {
        if (this.sendQueue.size()) {
            // ROBLOXPATCH because queue so ignore check
            // this.writable = false;
            const payload = encodePayload(this.sendQueue)
            this.sendQueue.clear()
            // $debug('flush sendQueue', payload)
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
        let response
        try {
            const requestUrl = this.uri()
            // $debug('Roblox.doPoll', requestUrl)
            RobloxGlobalConfig.waitCanSend()
            response = axios.get(requestUrl)
            RobloxGlobalConfig.increment()
            // $debug('\n', '<===== Roblox.doPoll', requestUrl, '\n', response.StatusCode, response.StatusMessage, '\n', response.Body)
            if (!response.Success || response.StatusCode !== 200)
                throw `response StatusCode ${response.StatusCode} not eq 200 Body "${response.Body}"`
            this.onData(response.Body)
        } catch (err) {
            this.onError(`doPoll error: ${err}`, err, response)
        }
    }
    doWrite(data: string, callback: () => void): void {
        let response
        try {
            const requestUrl = this.uri()
            // $debug('Roblox.doWrite', requestUrl, data)
            response = axios.post(requestUrl, data)
            RobloxGlobalConfig.increment()
            // $debug('\n', '=====> Roblox.doWrite', requestUrl, '\n', data, '\n', response.StatusCode, response.StatusMessage, '\n', response.Body)
            if (!response.Success || response.StatusCode !== 200 || response.Body !== 'ok')
                throw `response body "${response.Body}" not eq ok`
            callback()
        } catch (err) {
            this.onError(`doWrite error: ${err}`, err, { data, response })
        }
    }
}
import { Polling } from "./polling";
import { axios } from "../../polyfill";
import type { SocketOptions } from "../socket";
import { encodePayload, Packet } from "../../engine.io-parser";

const RunService = game.GetService('RunService')
const MAX_REQUEST_PER_MINUTE = 200
const RESET_TIME = 60

export class Roblox extends Polling {
    private running = true
    private sendQueue: Packet[] = []
    private requestTimes = 0
    private resetTime = RESET_TIME
    constructor(opts: Partial<SocketOptions>) {
        super(opts)
        game.BindToClose(() => {
            this.running = false
            this.flush()
        })
        RunService.Heartbeat.Connect((dt) => {
            this.resetTime -= dt
            if (this.resetTime < 0) {
                this.resetTime = RESET_TIME
                this.requestTimes = 0
            }
        })
        task.delay(0, () => {
            while (this.running) {
                this.flush()
                wait(0.3)
            }
        })
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
            while (this.requestTimes >= MAX_REQUEST_PER_MINUTE) {
                RunService.Heartbeat.Wait()
            }
            const response = axios.get(this.uri())
            this.requestTimes++
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
            this.requestTimes++
            // $debug('Roblox.doWrite response', response)
            if (!response.Success || response.StatusCode !== 200 || response.Body !== 'ok') throw `response not eq ok`
            callback()
        } catch (err) {
            this.onError('HttpService.PostAsync error', err, err)
        }
    }
}
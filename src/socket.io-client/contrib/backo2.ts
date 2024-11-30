export class Backoff {
    ms: number;
    max: number
    factor: number
    attempts: number;
    jitter: number;
    constructor(opts: Record<string, number>) {
        opts = opts || {};
        this.ms = opts.min || 100;
        this.max = opts.max || 10000;
        this.factor = opts.factor || 2;
        this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
        this.attempts = 0;
    }
    duration() {
        let ms = this.ms * math.pow(this.factor, this.attempts++);
        if (this.jitter) {
            let rand = math.random();
            let deviation = math.floor(rand * this.jitter * ms);
            ms = (math.floor(rand * 10) & 1) === 0 ? ms - deviation : ms + deviation;
        }
        return math.min(ms, this.max) | 0;
    }
    reset() {
        this.attempts = 0;
    };

    setMin(min: number) {
        this.ms = min;
    };

    setMax(max: number) {
        this.max = max;
    };

    setJitter(jitter: number) {
        this.jitter = jitter;
    };
}
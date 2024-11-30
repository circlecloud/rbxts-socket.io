// import { globalThisShim as globalThis } from "./globals.node.js";

// import { Socket } from "./socket";

// export function pick(obj, ...attr) {
//   return attr.reduce((acc, k) => {
//     if (obj.hasOwnProperty(k)) {
//       acc[k] = obj[k];
//     }
//     return acc;
//   }, {});
// }

// Keep a reference to the real timeout functions so they can be used when overridden
// const NATIVE_SET_TIMEOUT = globalThis.setTimeout;
// const NATIVE_CLEAR_TIMEOUT = globalThis.clearTimeout;

export function installTimerFunctions(obj: unknown, opts: unknown) {
    (obj as Record<string, unknown>).setTimeoutFn = (cb: Callback, delay: number) => {
        // $debug("setTimeout", cb, delay)
        return task.delay(delay / 1000, cb)
    }
    (obj as Record<string, unknown>).clearTimeoutFn = (t: thread) => {
        // $debug("setTimeout", t)
        if (!t) { return }
        const [success] = pcall(() => task.cancel(t))
        return success
    }
    //   if (opts.useNativeTimers) {
    //     obj.setTimeoutFn = NATIVE_SET_TIMEOUT.bind(globalThis);
    //     obj.clearTimeoutFn = NATIVE_CLEAR_TIMEOUT.bind(globalThis);
    //   } else {
    //     obj.setTimeoutFn = globalThis.setTimeout.bind(globalThis);
    //     obj.clearTimeoutFn = globalThis.clearTimeout.bind(globalThis);
    //   }
}

// base64 encoded buffers are about 33% bigger (https://en.wikipedia.org/wiki/Base64)
const BASE64_OVERHEAD = 1.33;

// we could also have used `new Blob([obj]).size`, but it isn't supported in IE9
// export function byteLength(obj) {
//     if (typeof obj === "string") {
//         return utf8Length(obj);
//     }
//     // arraybuffer or blob
//     return Math.ceil((obj.byteLength || obj.size) * BASE64_OVERHEAD);
// }

// function utf8Length(str: string) {
//     let c = 0, length = 0;
//     for (let i = 0, l = str.size(); i < l; i++) {
//         c = str.sub(i);
//         if (c < 0x80) {
//             length += 1;
//         } else if (c < 0x800) {
//             length += 2;
//         } else if (c < 0xd800 || c >= 0xe000) {
//             length += 3;
//         } else {
//             i++;
//             length += 4;
//         }
//     }
//     return length;
// }

/**
 * Generates a random 8-characters string.
 */
export function randomString() {
    return (
        tostring(os.time()).sub(4) +
        tostring(math.random(1000, 9999)).sub(2, 4)
    );
}
// function randomString()
//   local timestamp = tostring(os.time()):sub(4)
//   math.randomseed(os.time())
//   local randomPart = tostring(math.random(1000, 9999)):sub(2, 4)
//   return timestamp .. randomPart
// end
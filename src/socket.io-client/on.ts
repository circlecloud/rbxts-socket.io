import { Emitter } from "../component-emitter";

export function on(
    obj: Emitter<any, any>,
    ev: string,
    fn: (err?: any) => any,
): VoidFunction {
    obj.on(ev, fn);
    return () => obj.off(ev, fn);
}

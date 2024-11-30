export const defaultBinaryType = "nodebuffer";
export const nextTick = (cb: Callback) => {
    task.delay(0, () => {
        cb()
    })
}

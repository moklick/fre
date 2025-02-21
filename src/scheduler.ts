import { ITask, ITaskCallback } from './type'

const queue: ITask[] = []
const threshold: number = 1000 / 60
const unit = []
let deadline: number = 0

export const schedule = (cb) => unit.push(cb) === 1 && postMessage()

export const scheduleWork = (callback: ITaskCallback, time: number): void => {
  const job = {
    callback,
    time,
  }
  queue.push(job)
  schedule(flushWork)
}

const postMessage = (() => {
  const cb = () => unit.splice(0, unit.length).forEach((c) => c())
  if (typeof MessageChannel !== 'undefined') {
    const { port1, port2 } = new MessageChannel()
    port1.onmessage = cb
    return () => port2.postMessage(null)
  }
  return () => setTimeout(cb)
})()

const flush = (initTime: number): boolean => {
  let currentTime = initTime
  let job = peek(queue)
  while (job) {
    const timeout = job.time + 3000 <= currentTime
    if (!timeout && shouldYield()) break
    const callback = job.callback
    job.callback = null
    const next = callback(timeout)
    if (next) {
      job.callback = next as any
    } else {
      queue.shift()
    }
    job = peek(queue)
    currentTime = getTime()
  }
  return !!job
}

const flushWork = (): void => {
  const currentTime = getTime()
  deadline = currentTime + threshold
  flush(currentTime) && schedule(flushWork)
}

export const shouldYield = (): boolean => {
  return getTime() >= deadline
}

export const getTime = () => performance.now()

const peek = (queue: ITask[]) => queue.sort((a, b) => a.time - b.time)[0]

class Processor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(0);
    this.MIN_FRAME = 800;   // 50 ms
    this.MAX_FRAME = 16000; // 1 sec
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const chunk = input[0];
      // append new samples to existing buffer
      const combined = new Float32Array(this.buffer.length + chunk.length);
      combined.set(this.buffer);
      combined.set(chunk, this.buffer.length);
      this.buffer = combined;

      // if we have at least 800 samples, send to main thread
      while (this.buffer.length >= this.MIN_FRAME) {
        const send = this.buffer.slice(0, this.MIN_FRAME);
        this.buffer = this.buffer.slice(this.MIN_FRAME);
        this.port.postMessage(send);
      }
    }
    return true;
  }
}

registerProcessor('processor', Processor);

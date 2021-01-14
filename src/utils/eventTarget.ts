import { Spi } from '@mx51/spi-client-js';

// light-weight minimal EventTarget shim that provides everything we need for SPI.js plus
// a mechanism for registering event mappers that allows a streamlined way for patching events.

class EventTarget {
  id: any;
  listeners: any;
  mappers: any;
  mapper: any;
  spi: Spi;
  currentTxFlowStateOverride: null;

  constructor() {
    this.listeners = {};
    this.mappers = {};

    this.addEventListener = this.addEventListener.bind(this);
    this.dispatchEvent = this.dispatchEvent.bind(this);
    this.removeEventListener = this.removeEventListener.bind(this);
  }

  addEventListener(type: any, callback: any) {
    if (!(type in this.listeners)) this.listeners[type] = [];
    this.listeners[type].push(callback);

    return () => this.removeEventListener(type, callback);
  }

  dispatchEvent(event: any) {
    if (!event.type || !(event.type in this.listeners)) return true;

    const stack = this.listeners[event.type].slice();
    const mapper = this.mappers[event.type];
    const mappedEvent = mapper ? mapper(event) : event;

    for (let i = 0, { length } = stack; i < length; i += 1) {
      stack[i].call(this, mappedEvent);
    }

    return !mappedEvent.defaultPrevented;
  }

  // add an event listener that will be removed after the first event
  once(type: any, callback: any) {
    const remove = this.addEventListener(type, (...args: any) => {
      remove();
      callback(...args);
    });
  }

  removeEventListener(type: any, callback: any) {
    if (!this.listeners[type]) return;

    const stack = this.listeners[type];
    for (let i = 0, { length } = stack; i < length; i += 1) {
      if (stack[i] === callback) {
        stack.splice(i, 1);
        return;
      }
    }
  }

  setEventMapper(type: any, mapper: any) {
    this.mappers[type] = mapper;

    return () => {
      this.mapper[type] = undefined;
    };
  }
}

export { EventTarget as default };

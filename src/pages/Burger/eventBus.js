import EventTarget from '../../utils/eventTarget';

const eventBus = new EventTarget();
eventBus.location = { protocol: 'http' };

export { eventBus as default };

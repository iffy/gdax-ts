import { Credentials, signRequest } from './requestSigner'
import * as Websocket from 'ws'
import { EventSource } from './events'
import { GDAX } from './messages'

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export class WebsocketClient {
  private socket:Websocket;

  // Conenection events
  readonly events = {
    open: new EventSource<WebsocketClient>(),
    close: new EventSource<WebsocketClient>(),
    message: new EventSource<any>(),
    error: new EventSource<Error>(),
  }

  // Typed message events
  readonly messages = {
    heartbeat: new EventSource<GDAX.ws.Heartbeat>(),
    ticker: new EventSource<GDAX.ws.Ticker>(),
    snapshot: new EventSource<GDAX.ws.Snapshot>(),
    level2: new EventSource<GDAX.ws.Level2>(),
    received: new EventSource<GDAX.ws.Received>(),
    open: new EventSource<GDAX.ws.Open>(),
    match: new EventSource<GDAX.ws.Match>(),
    done: new EventSource<GDAX.ws.Done>(),
    change: new EventSource<GDAX.ws.Change>(),
    margin_profile_update: new EventSource<GDAX.ws.MarginProfileUpdate>(),
    activate: new EventSource<GDAX.ws.Activate>(),
    error: new EventSource<GDAX.ws.Error>(),
    unknown: new EventSource<any>(),
  }

  constructor(
    readonly websocketURI = 'wss://ws-feed.gdax.com',
    readonly subscribe: GDAX.ws.SubscribeRequestOptions,
    readonly options: {
      auth?: Credentials;
    } = {}
  ) {
  }

  connect() {
    if (this.socket) {
      this.socket.close();
    }
    const socket = this.socket = new Websocket(this.websocketURI);
    socket.on('message', this.onMessage);
    socket.on('open', this.onOpen);
    socket.on('close', this.onClose);
    socket.on('error', this.onError);
  }
  disconnect() {
    this.socket.close();
    this.socket = null;
  }

  onOpen = () => {
    this.events.open.emit(this);

    const subscribeRequest = Object.assign({type: 'subscribe'}, this.subscribe);

    // Authenticate
    if (this.options.auth) {
      let sig = signRequest(
        this.options.auth,
        'GET',
        subscribeRequest.channels ? '/users/self/verify' : '/users/self')
      Object.assign(subscribeRequest, sig);
    }

    this.socket.send(JSON.stringify(subscribeRequest))
  }
  onMessage = (message) => {
    let data = JSON.parse(message);
    switch (data.type) {
      case 'heartbeart':
      case 'ticker':
      case 'snapshot':
      case 'level2':
      case 'error': {
        this.messages[data.type].emit(data);
        break;
      }
      default: {
        this.messages.unknown.emit(data);
      }
    }
    // emit all messages
    this.events.message.emit(data);
  }
  onClose = () => {
    this.socket = null;
    this.events.close.emit(this);
  }
  onError = (err) => {
    if (!err) {
      return;
    }
    if (err.message === 'unexpected server response (429)') {
      throw new Error(
        'You are connecting too fast and are being throttled! Make sure you subscribe to multiple books on one connection.'
      );
    }
    this.events.error.emit(err);
  }
}
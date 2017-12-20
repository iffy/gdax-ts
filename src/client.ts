import * as rp from 'request-promise-native'
import { GDAX } from './messages'
import { Credentials, signRequest } from './requestSigner'

export class HTTPError extends Error {
  constructor(readonly response:string, readonly statusCode?:number) {
    super(response);
  }
}
export class BadRequest extends HTTPError {}
export class Unauthorized extends HTTPError {}
export class Forbidden extends HTTPError {}
export class NotFound extends HTTPError {}
export class InternalServerError extends HTTPError {}


export interface RequestOpts {
  qs?: object;
  body?: object;
}

/**
 *  General-purpose client
 */
export class Client {
  
  // Headers added to every request
  public headers = {
    'User-Agent': 'ts-gdax-client',
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  private apiURI:string = 'https://api.gdax.com';
  private credentials:Credentials;

  constructor(options: {
    apiURI?:string;
    credentials?:Credentials;
  } = {}) {
    this.apiURI = options.apiURI || this.apiURI;
    this.credentials = options.credentials;
  }

  /**
   *  Make a request
   */
  request<T>(
    method: 'GET'|'PUT'|'POST'|'DELETE',
    uriParts: string[],
    opts: RequestOpts = {}
  ):Promise<T> {
    const relativeURI = ['', ...uriParts].join('/')
    const absoluteURI = this.apiURI + relativeURI;
    let params = {
      uri: absoluteURI,
      qs: opts.qs,
      body: opts.body,
      method,
      headers: this.headers,
      json: true,
      resolveWithFullResponse: true,
      simple: false,
    }
    if (this.credentials) {
      const auth_headers = this.getSignatureHeaders(method, relativeURI, opts)
      Object.assign(params.headers, auth_headers)
    }
    return rp(params)
    .then(response => {
      switch (response.statusCode) {
        case 200: return response.body;
        case 400: throw new BadRequest(response.body);
        case 401: throw new Unauthorized(response.body);
        case 403: throw new Forbidden(response.body);
        case 404: throw new NotFound(response.body);
        case 500: throw new InternalServerError(response.body);
        default: throw new HTTPError(response.body, response.statusCode);
      }
    })
  }

  private getSignatureHeaders(method:'GET'|'PUT'|'POST'|'DELETE', relativeURI:string, opts:RequestOpts = {}) {
    const sig = signRequest(this.credentials, method, relativeURI, opts);
    return {
      'CB-ACCESS-KEY': sig.key,
      'CB-ACCESS-SIGN': sig.signature,
      'CB-ACCESS-TIMESTAMP': sig.timestamp,
      'CB-ACCESS-PASSPHRASE': sig.passphrase,
    }
  }
}


/**
 *  Anonymous client
 */
export class AnonClient {
  constructor(readonly client?:Client) {
    this.client = client || new Client();
  }

  // https://docs.gdax.com/#get-products
  getProducts() {
    return this.client.request<GDAX.Product[]>('GET', ['products']);
  }
  
  // https://docs.gdax.com/#get-product-order-book
  getProductOrderBook(product_id: GDAX.ProductID, level?:3):Promise<GDAX.OrderBook<[string, string, string]>>;
  getProductOrderBook(product_id: GDAX.ProductID, level?:2|1):Promise<GDAX.OrderBook<[string, string, number]>>;
  getProductOrderBook(product_id: GDAX.ProductID):Promise<GDAX.OrderBook<[string, string, number]>>;
  getProductOrderBook(product_id: GDAX.ProductID, level:1|2|3=1) {
    level
    return this.client.request('GET', ['products', product_id, 'book'], {
      qs: {
        level: level.toString(),
      },
    })
  }

  // https://docs.gdax.com/#get-product-ticker
  getProductTicker(product_id: GDAX.ProductID) {
    return this.client.request<GDAX.TickerSnapshot>('GET', ['products', product_id, 'ticker'])
  }

  // https://docs.gdax.com/#get-trades
  getTrades(product_id: GDAX.ProductID) {
    return this.client.request<GDAX.Trade[]>('GET', ['products', product_id, 'trades'])
  }

  // https://docs.gdax.com/#get-historic-rates
  getHistoricRates(
    product_id: GDAX.ProductID,
    options: {
      start?: string;
      end?: string;
      granularity?: number;
    } = {}) {
    const qs = {
      start: options.start,
      end: options.end,
      granularity: options.granularity === undefined ? undefined : options.granularity.toString(),
    }
    return this.client.request<any[]>('GET', ['products', product_id, 'candles'], {qs})
    .then(result => {
      return result.map((row):GDAX.Candle => {
        const [ time, low, high, open, close, volume ] = row;
        return {time, low, high, open, close, volume};
      });
    })
  }

  // https://docs.gdax.com/#get-24hr-stats
  get24HourStats(product_id: GDAX.ProductID) {
    return this.client.request<{
      open: string;
      high: string;
      low: string;
      volume: string;
    }>('GET', ['products', product_id, 'stats'])
  }

  // https://docs.gdax.com/#currencies
  getCurrencies() {
    return this.client.request<{
      id: GDAX.Currency;
      name: string;
      min_size: GDAX.numericstring;
    }[]>('GET', ['currencies'])
  }

  // https://docs.gdax.com/#time
  getServerTime() {
    return this.client.request<{
      iso: GDAX.timestring;
      epoch: number;
    }>('GET', ['time']);
  }
}


/**
 *  Authenticated Client
 */
export class AuthenticatedClient extends AnonClient {
  readonly accounts = new Accounts(this);
  readonly orders = new Orders(this);
  readonly fills = new Fills(this);
  constructor(readonly client?: Client) {
    super(client);
  }

}

export class Accounts {
  constructor(private client:AuthenticatedClient) {

  }
  list() {
    return this.client.client.request<GDAX.Account[]>('GET', ['accounts']);
  }
  get(account_id:string) {
    return this.client.client.request<GDAX.Account>('GET', ['accounts', account_id])
  }
  getHistory(account_id:string) {
    return this.client.client.request<GDAX.AccountHistory[]>('GET', ['accounts', account_id, 'ledger'])
  }
}

export interface BaseOrderArgs {
  client_oid?: string;
  type: GDAX.OrderType;
  side: 'buy'|'sell';
  product_id: GDAX.ProductID;
  stp?: GDAX.STPType;
}
export interface MarketOrderArgs extends BaseOrderArgs {
  type: 'market';
  size?: GDAX.numericstring;
  funds?: GDAX.numericstring;
}
export interface LimitOrderArgs extends BaseOrderArgs {
  type: 'limit';
  price: GDAX.numericstring;
  size: GDAX.numericstring;
  time_in_force?: GDAX.TimeInForceType;
  cancel_after?: 'min'|'hour'|'day';
  post_only?: boolean;
}
export interface StopOrderArgs extends BaseOrderArgs {
  type: 'stop';
  price: GDAX.numericstring;
  size?: GDAX.numericstring;
  funds?: GDAX.numericstring;
}
export type PlaceOrderArgs = MarketOrderArgs | LimitOrderArgs | StopOrderArgs;


export class Orders {
  constructor(private client:AuthenticatedClient) {

  }
  list(options:{
    status?: GDAX.OrderStatus,
    product_id?: GDAX.ProductID,
  } = {}) {
    return this.client.client.request<GDAX.Order[]>('GET', ['orders'], {qs: options})
  }
  get(order_id:string) {
    return this.client.client.request<GDAX.Order>('GET', ['orders', order_id])
  }
  place(args:PlaceOrderArgs) {
    return this.client.client.request<GDAX.Order>('POST', ['orders'], {
      body: args,
    })
  }
  cancel(order_id:string) {
    return this.client.client.request('DELETE', ['orders', order_id])
  }
  cancelAll(options:{
    product_id?: GDAX.Product;
  } = {}) {
    return this.client.client.request<string[]>('DELETE', ['orders'], {qs: options})
  }
}


export class Fills {
  constructor(private client:AuthenticatedClient) {

  }
  list(options: {
    order_id?: string;
    product_id?: GDAX.ProductID;
  } = {}) {
    return this.client.client.request<GDAX.Fill>('GET', ['fills'], {qs: options})
  }
}

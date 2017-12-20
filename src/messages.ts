export namespace GDAX {
  // This is more for documentation purposes than anything else;
  export type numericstring = string;
  export type timestring = string;

  export type Currency =
    | 'BTC'
    | 'LTC'
    | 'ETH'
    | 'BCH'
    | 'USD'
    | 'GBP'
    | 'EUR'

  export type ProductID =
    | 'BCH-BTC'
    | 'BCH-EUR'
    | 'BCH-USD'
    | 'BTC-EUR'
    | 'BTC-GBP'
    | 'BTC-USD'
    | 'ETH-BTC'
    | 'ETH-EUR'
    | 'ETH-USD'
    | 'LTC-BTC'
    | 'LTC-EUR'
    | 'LTC-USD'

  export interface SeqMessage {
    sequence: number;
  }

  // GET /products
  export interface Product {
    id: ProductID;
    base_currency: Currency;
    quote_currency: Currency;
    base_min_size: numericstring;
    base_max_size: numericstring;
    quote_increment: numericstring;
    display_name: string;
    status: 'online';
    margin_enabled: boolean;
    status_message: string;
  }

  // GET /products/<product-id>/book
  export interface OrderBook<T> extends SeqMessage {
    bids: Array<T>;
    asks: Array<T>;
  }

  // GET /products/<product-id>/ticker
  export interface TickerSnapshot {
    trade_id: number;
    price: numericstring;
    size: numericstring;
    bid: numericstring;
    ask: numericstring;
    volume: numericstring;
    time: string;
  }

  // GET /products/<product-id>/trades
  export interface Trade {
    time: timestring;
    trade_id: number;
    price: numericstring;
    size: numericstring;
    side: 'buy'|'sell';
  }

  // GET /products/<product-id>/candles
  export interface Candle {
    time: number;
    low: numericstring;
    high: numericstring;
    open: numericstring;
    close: numericstring;
    volume: numericstring;
  }

  // Websocket-related messages
  export namespace ws {
    export type Channel =
      'heartbeat'
      | 'ticker'
      | 'level2'
      | 'user'
      | 'matches'
      | 'full'

    // subscribe
    export interface ChannelSubOptions {
      name: Channel;
      product_ids: ProductID[];
    }
    export interface SubscribeRequestOptions {
      product_ids: ProductID[];
      channels: Array<ChannelSubOptions|Channel>;
    }
    export interface SubscribeRequest extends SubscribeRequestOptions {
      type: 'subscribe'
      key?: string;
      signature?: string;
      timestamp?: number;
      passphrase?: string;
    }

    // Channel messages
    export interface Error {
      type: 'error';
      message: string;
    }
    export interface Heartbeat extends SeqMessage {
      type: 'heartbeat';
      last_trade_id: number;
      product_id: ProductID;
      time: timestring;
    }
    export interface Ticker extends SeqMessage {
      type: 'ticker';
      trade_id: number;
      time: timestring;
      product_id: "BTC-USD",
      price: numericstring;
      side: 'buy' | 'sell';
      last_size: numericstring;
      best_bid: numericstring;
      best_ask: numericstring;
    }
    export interface Snapshot {
      type: 'snapshot';
      product_id: ProductID;
      bids: Array<[numericstring, numericstring]>;
      asks: Array<[numericstring, numericstring]>;
    }
    export interface Level2 {
      type: 'l2update';
      product_id: ProductID;
      changed: Array<['buy'|'sell', numericstring, numericstring]>;
    }
    // Full feed messages

    export interface BaseReceived extends SeqMessage {
      type: 'received';
      time: timestring;
      product_id: ProductID;
      order_id: string;
      side: 'buy'|'sell';
      client_oid?: string;
    }
    export interface ReceivedLimitOrder extends BaseReceived {
      order_type: 'limit';
      size: numericstring;
      price: numericstring;
    }
    export interface ReceivedMarketOrder extends BaseReceived {
      order_type: 'market';
      funds?: numericstring;
      size?: numericstring;
    }
    export type Received = ReceivedLimitOrder|ReceivedMarketOrder;

    export interface Open extends SeqMessage {
      type: "open";
      time: timestring;
      product_id: ProductID;
      order_id: string;
      price: numericstring;
      remaining_size: numericstring;
      side: 'buy'|'sell';
    }

    export interface Done extends SeqMessage {
      type: 'done'
      time: timestring;
      product_id: ProductID;
      order_id: string;
      reason: 'filled'|'canceled';
      side: 'buy'|'sell';
      price?: numericstring;
      remaining_size?: numericstring;
    }

    export interface Match extends SeqMessage {
      type: 'match';
      trade_id: number;
      maker_order_id: string;
      taker_order_id: string;
      time: timestring;
      product_id: ProductID;
      size: numericstring;
      price: numericstring;
      side: 'buy'|'sell';
      taker_user_id?: string;
      user_id?: string;
      taker_profile_id?: string;
      profile_id?: string;
    }

    export interface Change extends SeqMessage {
      type: "change",
      time: timestring;
      order_id: string;
      product_id: ProductID;
      new_size?: numericstring;
      old_size?: numericstring;
      new_funds?: numericstring;
      old_funds?: numericstring;
      price: numericstring;
      side: 'buy'|'sell';
    }

    export interface MarginProfileUpdate {
      type: "margin_profile_update";
      product_id: ProductID;
      timestamp: timestring;
      user_id: string;
      profile_id: string;
      nonce: number;
      position: 'long'; //XXX What are the possible values here?
      position_size: numericstring;
      position_compliment: numericstring;
      position_max_size: numericstring;
      call_side: 'buy'|'sell';
      call_price: numericstring;
      call_size: numericstring;
      call_funds: numericstring;
      covered: boolean;
      next_expire_time: timestring;
      base_balance: numericstring;
      base_funding: numericstring;
      quote_balance: numericstring;
      quote_funding: numericstring;
      private: boolean;
    }

    export interface Activate {
      type: "activate";
      product_id: ProductID;
      timestamp: string;
      user_id: string;
      profile_id: string;
      order_id: string;
      stop_type: 'entry', //XXX What are the possible values here?
      side: 'buy'|'sell';
      stop_price: numericstring;
      size: numericstring;
      funds: numericstring;
      taker_fee_rate: numericstring;
      private: boolean;
    }
  }

  export interface Account {
    id: string;
    currency: Currency;
    balance: numericstring;
    available: numericstring;
    hold: numericstring;
    profile_id: string;
  }
  export interface AccountHistory {
    id: string;
    created_at: timestring;
    amount: numericstring;
    balance: numericstring;
    type: 'transfer'|'match'|'fee'|'rebate';
    details?: {
      order_id: string;
      trade_id: string;
      product_id: ProductID;
    }
  }

  export type OrderType =
    | 'limit'
    | 'market'
    | 'stop'

  export type OrderStatus =
    |'open'
    |'pending'
    |'active'
    |'done'

  export type STPType = 'dc'|'co'|'cn'|'cb'
  export type TimeInForceType = 'GTC'|'GTT'|'IOC'|'FOK'

  export interface Order {
    id: string;
    price: numericstring;
    size: numericstring;
    product_id: ProductID;
    side: 'buy'|'sell';
    stp: STPType;
    type: OrderType;
    time_in_force: TimeInForceType;
    post_only: boolean,
    created_at: timestring;
    fill_fees: numericstring;
    filled_size: numericstring;
    executed_value: numericstring;
    status: OrderStatus;
    settled: boolean;
  }

  export interface Fill {
    trade_id: number;
    product_id: ProductID;
    price: numericstring;
    size: numericstring;
    order_id: string;
    created_at: timestring;
    liquidity: 'T'|'M';
    fee: numericstring;
    settled: boolean,
    side: 'buy'|'sell';
  }
}


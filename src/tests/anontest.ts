import { AnonClient, Client, AuthenticatedClient } from '../client'
import { GDAX } from '../messages'


export async function testAnon() {
  const client = new AnonClient();
  try {
    console.log('getProducts', await client.getProducts())
    // console.log('getProductOrderBook', await client.getProductOrderBook('BTC-USD'))
    // console.log('getProductTicker', await client.getProductTicker('BTC-USD'));
    // console.log('getTrades', await client.getTrades('BTC-USD'));
    // console.log('getHistoricRates', await client.getHistoricRates('BTC-USD'));
    console.log('get24HourStats', await client.get24HourStats('BTC-USD'));
  } catch(err) {
    console.log('err', err);
    throw err
  }
}

export async function testAuth() {
  const innerclient = new Client({
    credentials: {
      key: process.env.GDAX_API_KEY,
      passphrase: process.env.GDAX_PASSPHRASE,
      secret: process.env.GDAX_SECRET,
    }
  })
  const client = new AuthenticatedClient(innerclient);
  try {
    console.log('orders', await client.orders.list({status:'done' as GDAX.OrderStatus}));
    console.log('fills', await client.fills.list())
  } catch(err) {
    console.log('err', err);
    throw err;
  }
}

if (require.main === module) {
  // testAnon();
  testAuth();
}

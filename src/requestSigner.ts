// Copied from gdax-node since I can't figure out how to import it
import * as crypto from 'crypto'
import * as querystring from 'querystring'

export interface Credentials {
    key: string;
    secret: string;
    passphrase: string;
}

export interface Signature {
    key: string;
    signature: string;
    timestamp: number;
    passphrase: string;
}

/**
 Signs request messages for authenticated requests to GDAX
 * @param auth {object} hash containing key, secret and passphrase
 * @param method {string} The REST method to use
 * @param path {string} The request path, e.g. /products/BTC-USD/ticker
 * @param options {object} An optional object containing one of
 * @param options.body {object} A hash of body properties
 * @param options.qs {object} A hash of query string parameters
 * @returns {{key: string, signature: *, timestamp: number, passphrase: string}}
 */
export function signRequest(
        auth:Credentials,
        method:'GET'|'PUT'|'POST'|'DELETE',
        path:string,
        options: {
            body?: object;
            qs?: object;
        } = {}):Signature {
    
    const timestamp = Date.now() / 1000;
    let body = '';
    options = options || {};
    if (options.body) {
        body = JSON.stringify(options.body);
    } else if (options.qs && Object.keys(options.qs).length !== 0) {
        body = '?' + querystring.stringify(options.qs);
    }
    const what = timestamp +  method.toUpperCase() + path + body;
    const key = new Buffer(auth.secret, 'base64');
    const hmac = crypto.createHmac('sha256', key);
    const signature = hmac.update(what).digest('base64');
    return {
        key: auth.key,
        signature: signature,
        timestamp: timestamp,
        passphrase: auth.passphrase
    };
};
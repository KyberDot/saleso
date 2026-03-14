const axios = require('axios');

const EBAY_ENV = process.env.EBAY_ENV || 'production';
const IS_SANDBOX = EBAY_ENV === 'sandbox';

const EBAY_AUTH_BASE = IS_SANDBOX ? 'https://auth.sandbox.ebay.com' : 'https://auth.ebay.com';
const EBAY_API_BASE = IS_SANDBOX ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';

const CLIENT_ID = process.env.EBAY_CLIENT_ID;
const CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;
const REDIRECT_URI = process.env.EBAY_REDIRECT_URI || 'http://localhost:3000/auth/ebay/callback';

const SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
].join(' ');

function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    state: state || 'ebay_oauth'
  });
  return `${EBAY_AUTH_BASE}/oauth2/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const response = await axios.post(
    `${EBAY_AUTH_BASE}/identity/v1/oauth2/token`,
    new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }).toString(),
    { headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return response.data;
}

async function refreshAccessToken(refreshToken) {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const response = await axios.post(
    `${EBAY_AUTH_BASE}/identity/v1/oauth2/token`,
    new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, scope: SCOPES }).toString(),
    { headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return response.data;
}

async function getValidToken(user, db) {
  const now = Date.now();
  if (user.ebay_token_expiry && user.ebay_token_expiry - now < 5 * 60 * 1000) {
    try {
      const tokenData = await refreshAccessToken(user.ebay_refresh_token);
      const newExpiry = now + (tokenData.expires_in * 1000);
      db.prepare(`UPDATE users SET ebay_access_token = ?, ebay_token_expiry = ?, updated_at = strftime('%s','now') WHERE id = ?`)
        .run(tokenData.access_token, newExpiry, user.id);
      return tokenData.access_token;
    } catch (err) {
      throw new Error('Token refresh failed - please re-connect eBay');
    }
  }
  return user.ebay_access_token;
}

async function ebayGet(endpoint, accessToken, params = {}) {
  const response = await axios.get(`${EBAY_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB'
    },
    params
  });
  return response.data;
}

async function getUserProfile(accessToken) {
  return ebayGet('/commerce/identity/v1/user/', accessToken);
}

async function getOrders(accessToken, params = {}) {
  return ebayGet('/sell/fulfillment/v1/order', accessToken, {
    limit: params.limit || 200,
    offset: params.offset || 0,
    filter: params.filter || ''
  });
}

async function getOrderById(accessToken, orderId) {
  return ebayGet(`/sell/fulfillment/v1/order/${orderId}`, accessToken);
}

module.exports = {
  getAuthUrl, exchangeCodeForToken, refreshAccessToken,
  getValidToken, getUserProfile, getOrders, getOrderById, ebayGet
};

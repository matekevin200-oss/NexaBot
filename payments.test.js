const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.js'), 'utf8');

function loadPayments(overrides = {}) {
  const startMarker = '"src/payments.js": function(module, exports, require) {';
  const endMarker = '\n},\n"src/rate-limit.js"';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, 'payments module not found in bundle');
  const code = source.slice(start + startMarker.length, end);
  const calls = [];
  const config = {
    dbQuery: async () => null,
    getGuildSubscription: () => null,
    upsertGuildSubscription: async (record) => {
      calls.push(record);
      return { guildId: record.guildId, plan: record.plan, status: record.status };
    },
    removeGuildSubscription: async () => null,
    ...overrides
  };
  const module = { exports: {} };
  const localRequire = (request) => {
    if (request === 'node:crypto') return crypto;
    if (request === './config') return config;
    throw new Error(`Unexpected require: ${request}`);
  };
  new Function('module', 'exports', 'require', code)(module, module.exports, localRequire);
  return { payments: module.exports, calls };
}

const stripeEnvironment = {
  STRIPE_SECRET_KEY: 'sk_test_abc123DEF456',
  STRIPE_WEBHOOK_SECRET: 'whsec_abc123DEF456',
  STRIPE_PRICE_PRO_MONTHLY: 'price_1ProMonth',
  STRIPE_PRICE_PRO_YEARLY: 'price_1ProYear',
  STRIPE_PRICE_ULTIMATE_MONTHLY: 'price_1UltimateMonth',
  STRIPE_PRICE_ULTIMATE_YEARLY: 'price_1UltimateYear'
};

function priceFor(id) {
  const definitions = {
    price_1ProMonth: { amount: 499, interval: 'month' },
    price_1ProYear: { amount: 4990, interval: 'year' },
    price_1UltimateMonth: { amount: 999, interval: 'month' },
    price_1UltimateYear: { amount: 9990, interval: 'year' }
  };
  const item = definitions[id];
  return {
    id,
    object: 'price',
    active: true,
    type: 'recurring',
    currency: 'eur',
    unit_amount: item.amount,
    livemode: false,
    recurring: { interval: item.interval, interval_count: 1 }
  };
}

async function withStripeEnvironment(run) {
  const previous = Object.fromEntries(Object.keys(stripeEnvironment).map((key) => [key, process.env[key]]));
  const previousFetch = global.fetch;
  Object.assign(process.env, stripeEnvironment);
  try {
    return await run();
  } finally {
    global.fetch = previousFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('Stripe config performs live checks for every recurring EUR Price', async () => withStripeEnvironment(async () => {
  const { payments } = loadPayments();
  const requested = [];
  global.fetch = async (url) => {
    const id = decodeURIComponent(String(url).split('/').pop());
    requested.push(id);
    return new Response(JSON.stringify(priceFor(id)), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const result = await payments.validateStripeConfiguration(process.env, { force: true });
  assert.equal(result.mode, 'test');
  assert.equal(result.checkoutReady, true);
  assert.equal(result.fullyReady, true);
  assert.equal(requested.length, 4);
  assert.ok(Object.values(result.prices).every(Boolean));
}));

test('Stripe config rejects wrong amount, currency, interval and mode', () => {
  const { payments } = loadPayments();
  const base = priceFor('price_1ProMonth');
  assert.match(payments.validateStripePriceObject({ ...base, unit_amount: 123 }, 'pro', 'monthly', 'test'), /összege hibás/);
  assert.match(payments.validateStripePriceObject({ ...base, currency: 'usd' }, 'pro', 'monthly', 'test'), /nem EUR/);
  assert.match(payments.validateStripePriceObject({ ...base, recurring: { interval: 'year', interval_count: 1 } }, 'pro', 'monthly', 'test'), /nem 1 hónap/);
  assert.match(payments.validateStripePriceObject({ ...base, livemode: true }, 'pro', 'monthly', 'test'), /Éles Price ID/);
  const redacted = payments.redactStripeMessage('Invalid key sk_live_DONTLEAK123 and whsec_DONTLEAK456');
  assert.doesNotMatch(redacted, /DONTLEAK/);
  assert.match(redacted, /STRIPE_KEY_REDACTED/);
});

test('Checkout sends verified server-side subscription metadata', async () => withStripeEnvironment(async () => {
  const { payments } = loadPayments();
  let checkoutBody = null;
  global.fetch = async (url, options = {}) => {
    const value = String(url);
    if (value.includes('/v1/prices/')) {
      return new Response(JSON.stringify(priceFor(decodeURIComponent(value.split('/').pop()))), { status: 200 });
    }
    assert.equal(value, 'https://api.stripe.com/v1/checkout/sessions');
    assert.equal(options.method, 'POST');
    checkoutBody = options.body;
    return new Response(JSON.stringify({
      id: 'cs_test_checkout123',
      object: 'checkout.session',
      url: 'https://checkout.stripe.com/c/pay/cs_test_checkout123'
    }), { status: 200 });
  };
  const checkout = await payments.createCheckoutSession({
    guildId: '1556219615858655254',
    discordUserId: '123456789012345678',
    plan: 'pro',
    cycle: 'monthly',
    returnUrl: 'https://nexabot.example.com'
  });
  assert.equal(checkout.id, 'cs_test_checkout123');
  assert.equal(checkoutBody.get('mode'), 'subscription');
  assert.equal(checkoutBody.get('line_items[0][price]'), stripeEnvironment.STRIPE_PRICE_PRO_MONTHLY);
  assert.equal(checkoutBody.get('metadata[guild_id]'), '1556219615858655254');
  assert.equal(checkoutBody.get('subscription_data[metadata][discord_user_id]'), '123456789012345678');
  assert.match(checkoutBody.get('success_url'), /session_id=\{CHECKOUT_SESSION_ID\}/);
}));

test('Checkout return is verified server-side before activating a plan', async () => withStripeEnvironment(async () => {
  const { payments, calls } = loadPayments();
  const subscription = {
    id: 'sub_verified123',
    object: 'subscription',
    customer: 'cus_verified123',
    status: 'active',
    created: 1_700_000_000,
    cancel_at_period_end: false,
    metadata: {
      guild_id: '1556219615858655254',
      discord_user_id: '123456789012345678'
    },
    items: { data: [{ price: { id: stripeEnvironment.STRIPE_PRICE_ULTIMATE_MONTHLY }, current_period_end: 1_800_000_000 }] }
  };
  global.fetch = async (url) => {
    assert.match(String(url), /checkout\/sessions\/cs_test_verified123/);
    return new Response(JSON.stringify({
      id: 'cs_test_verified123',
      object: 'checkout.session',
      mode: 'subscription',
      status: 'complete',
      payment_status: 'paid',
      client_reference_id: '1556219615858655254',
      metadata: subscription.metadata,
      subscription
    }), { status: 200 });
  };
  const result = await payments.reconcileCheckoutSession({
    sessionId: 'cs_test_verified123',
    guildId: '1556219615858655254',
    discordUserId: '123456789012345678'
  });
  assert.equal(result.entitlement.plan, 'ultimate');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].billingCycle, 'monthly');
  assert.equal(calls[0].currentPeriodEnd.toISOString(), new Date(1_800_000_000 * 1000).toISOString());
}));

test('Checkout return cannot activate another user or server', async () => withStripeEnvironment(async () => {
  const { payments, calls } = loadPayments();
  global.fetch = async () => new Response(JSON.stringify({
    id: 'cs_test_wrongowner',
    object: 'checkout.session',
    mode: 'subscription',
    status: 'complete',
    payment_status: 'paid',
    client_reference_id: '1556219615858655254',
    metadata: { guild_id: '1556219615858655254', discord_user_id: '999999999999999999' },
    subscription: 'sub_shouldnotload'
  }), { status: 200 });
  await assert.rejects(() => payments.reconcileCheckoutSession({
    sessionId: 'cs_test_wrongowner',
    guildId: '1556219615858655254',
    discordUserId: '123456789012345678'
  }), /másik Discord-felhasználóhoz/);
  assert.equal(calls.length, 0);
}));

test('Stripe webhook processing is idempotent and supports Checkout activation', async () => withStripeEnvironment(async () => {
  const { payments, calls } = loadPayments();
  const subscription = {
    id: 'sub_webhook123',
    object: 'subscription',
    customer: 'cus_webhook123',
    status: 'active',
    created: 1_700_000_000,
    cancel_at_period_end: false,
    metadata: { guild_id: '1556219615858655254', discord_user_id: '123456789012345678' },
    items: { data: [{ price: { id: stripeEnvironment.STRIPE_PRICE_PRO_YEARLY }, current_period_end: 1_800_000_000 }] }
  };
  global.fetch = async (url) => {
    assert.match(String(url), /subscriptions\/sub_webhook123/);
    return new Response(JSON.stringify(subscription), { status: 200 });
  };
  const event = {
    id: 'evt_checkout123',
    type: 'checkout.session.completed',
    data: { object: {
      mode: 'subscription',
      subscription: 'sub_webhook123',
      metadata: subscription.metadata
    } }
  };
  assert.deepEqual(await payments.processStripeEvent(event), { duplicate: false });
  assert.deepEqual(await payments.processStripeEvent(event), { duplicate: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].plan, 'pro');
  assert.equal(calls[0].billingCycle, 'yearly');
}));

test('Webhook validation uses the raw body, timestamp tolerance and constant-time signature', () => {
  const { payments } = loadPayments();
  const body = Buffer.from('{"id":"evt_123","type":"checkout.session.completed"}');
  const timestamp = 1_800_000_000;
  const secret = 'whsec_testsecret123';
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest('hex');
  assert.equal(payments.verifyWebhookSignature(body, `t=${timestamp},v1=${signature}`, secret, timestamp), true);
  assert.equal(payments.verifyWebhookSignature(Buffer.from('{}'), `t=${timestamp},v1=${signature}`, secret, timestamp), false);
  assert.equal(payments.verifyWebhookSignature(body, `t=${timestamp - 301},v1=${signature}`, secret, timestamp), false);
});

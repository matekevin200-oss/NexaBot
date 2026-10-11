const crypto = require('node:crypto');
const {
  dbQuery,
  getGuildSubscription,
  upsertGuildSubscription,
  removeGuildSubscription
} = require('./config');

const PLAN_CATALOG = Object.freeze({
  free: Object.freeze({
    name: 'Free',
    monthly: 0,
    yearly: 0,
    features: ['Moderáció és Case ID', 'Ticket és naplózás', 'Welcome, hitelesítés és Shift', 'Alap közösségi vezérlés'],
    featuresEn: ['Moderation and Case IDs', 'Tickets and logging', 'Welcome, verification and shifts', 'Core community control']
  }),
  pro: Object.freeze({
    name: 'Pro',
    monthly: 4.99,
    yearly: 49.90,
    features: ['Minden Free funkció', 'Automod és Starboard', 'XP, rangpanelek és giveaway', 'Custom Commands és ideiglenes voice'],
    featuresEn: ['Everything in Free', 'Automod and Starboard', 'XP, role panels and giveaways', 'Custom Commands and temporary voice']
  }),
  ultimate: Object.freeze({
    name: 'Ultimate',
    monthly: 9.99,
    yearly: 99.90,
    features: ['Minden Pro funkció', 'NEXA AI', 'Teljes Anti-Nuke és raidvédelem', 'ChronoGuard és fejlett biztonság'],
    featuresEn: ['Everything in Pro', 'NEXA AI', 'Full Anti-Nuke and raid defense', 'ChronoGuard and advanced security']
  })
});

const PRICE_ENV = Object.freeze({
  'pro:monthly': 'STRIPE_PRICE_PRO_MONTHLY',
  'pro:yearly': 'STRIPE_PRICE_PRO_YEARLY',
  'ultimate:monthly': 'STRIPE_PRICE_ULTIMATE_MONTHLY',
  'ultimate:yearly': 'STRIPE_PRICE_ULTIMATE_YEARLY'
});

const memoryEvents = new Set();
const stripeValidationCache = {
  key: null,
  expiresAt: 0,
  value: null,
  pending: null
};

function normalizedPlan(value) {
  const plan = String(value || '').toLowerCase();
  return ['pro', 'ultimate'].includes(plan) ? plan : null;
}

function normalizedCycle(value) {
  return value === 'yearly' ? 'yearly' : value === 'monthly' ? 'monthly' : null;
}

function priceIdFor(planValue, cycleValue, environment = process.env) {
  const plan = normalizedPlan(planValue);
  const cycle = normalizedCycle(cycleValue);
  if (!plan || !cycle) return null;
  return String(environment[PRICE_ENV[`${plan}:${cycle}`]] || '').trim() || null;
}

function planForPriceId(priceId, environment = process.env) {
  const wanted = String(priceId || '').trim();
  for (const [key, envName] of Object.entries(PRICE_ENV)) {
    if (wanted && String(environment[envName] || '').trim() === wanted) {
      const [plan, cycle] = key.split(':');
      return { plan, cycle };
    }
  }
  return null;
}

function paymentReadiness(environment = process.env) {
  const secret = String(environment.STRIPE_SECRET_KEY || '').trim();
  const webhook = String(environment.STRIPE_WEBHOOK_SECRET || '').trim();
  const secretReady = /^(?:sk|rk)_(?:test|live)_[A-Za-z0-9]+$/.test(secret);
  const webhookReady = /^whsec_[A-Za-z0-9]+$/.test(webhook);
  const prices = Object.fromEntries(Object.entries(PRICE_ENV).map(([key, envName]) => [key, /^price_[A-Za-z0-9]+$/.test(String(environment[envName] || '').trim())]));
  const missing = [
    ...(!secretReady ? ['STRIPE_SECRET_KEY'] : []),
    ...(!webhookReady ? ['STRIPE_WEBHOOK_SECRET'] : []),
    ...Object.entries(PRICE_ENV).filter(([key]) => !prices[key]).map(([, envName]) => envName)
  ];
  return {
    secret: secretReady,
    webhook: webhookReady,
    prices,
    missing,
    checkoutReady: secretReady && Object.values(prices).some(Boolean),
    webhookReady: secretReady && webhookReady,
    fullyReady: secretReady && webhookReady && Object.values(prices).every(Boolean)
  };
}

function redactStripeMessage(value) {
  return String(value || '')
    .replace(/\b(?:sk|rk)_(?:test|live)_[A-Za-z0-9_]+\b/gi, '[STRIPE_KEY_REDACTED]')
    .replace(/\bwhsec_[A-Za-z0-9_]+\b/gi, '[WEBHOOK_SECRET_REDACTED]')
    .slice(0, 420);
}

async function stripeRequest(path, options = {}) {
  const secret = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!/^(?:sk|rk)_(?:test|live)_[A-Za-z0-9]+$/.test(secret)) throw new Error('A Stripe szerveroldali kulcsa hiányzik vagy hibás formátumú.');
  const headers = {
    Authorization: `Bearer ${secret}`,
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  const apiVersion = String(process.env.STRIPE_API_VERSION || '').trim();
  if (/^\d{4}-\d{2}-\d{2}(?:\.[a-z]+)?$/i.test(apiVersion)) headers['Stripe-Version'] = apiVersion;
  if (options.idempotencyKey) headers['Idempotency-Key'] = String(options.idempotencyKey).slice(0, 255);
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? new URLSearchParams(options.body) : undefined,
    signal: AbortSignal.timeout(15_000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = redactStripeMessage(result?.error?.message || `Stripe API hiba (${response.status})`);
    const code = String(result?.error?.code || '').slice(0, 80);
    const requestId = String(response.headers.get('request-id') || '').slice(0, 120);
    const error = new Error(`${detail}${code ? ` [${code}]` : ''}${requestId ? ` (request: ${requestId})` : ''}`);
    error.stripeStatus = response.status;
    error.stripeCode = code;
    error.stripeRequestId = requestId;
    throw error;
  }
  return result;
}

function stripeMode(environment = process.env) {
  const secret = String(environment.STRIPE_SECRET_KEY || '').trim();
  if (/^(?:sk|rk)_live_/.test(secret)) return 'live';
  if (/^(?:sk|rk)_test_/.test(secret)) return 'test';
  return null;
}

function stripeFingerprint(environment = process.env) {
  return crypto.createHash('sha256').update([
    String(environment.STRIPE_SECRET_KEY || ''),
    String(environment.STRIPE_WEBHOOK_SECRET || ''),
    ...Object.values(PRICE_ENV).map((name) => String(environment[name] || ''))
  ].join('|')).digest('hex');
}

function expectedPrice(plan, cycle) {
  const amount = cycle === 'yearly' ? PLAN_CATALOG[plan]?.yearly : PLAN_CATALOG[plan]?.monthly;
  return {
    currency: 'eur',
    amount: Number.isFinite(amount) ? Math.round(amount * 100) : null,
    interval: cycle === 'yearly' ? 'year' : 'month'
  };
}

function validateStripePriceObject(price, plan, cycle, mode) {
  const expected = expectedPrice(plan, cycle);
  if (!price || price.object !== 'price') return 'A Stripe nem Price objektumot adott vissza.';
  if (!price.active) return 'A Stripe Price archivált vagy inaktív.';
  if (price.type !== 'recurring' || !price.recurring) return 'A Price nem ismétlődő előfizetési ár.';
  if (price.recurring.interval !== expected.interval || Number(price.recurring.interval_count || 1) !== 1) {
    return cycle === 'yearly' ? 'Az éves Price ciklusa nem 1 év.' : 'A havi Price ciklusa nem 1 hónap.';
  }
  if (String(price.currency || '').toLowerCase() !== expected.currency) return 'A Price pénzneme nem EUR.';
  const amount = Number(price.unit_amount ?? price.unit_amount_decimal);
  if (!Number.isFinite(amount) || amount !== expected.amount) {
    return `A Price összege hibás; elvárt összeg: ${(expected.amount / 100).toFixed(2)} EUR.`;
  }
  if (mode && Boolean(price.livemode) !== (mode === 'live')) {
    return mode === 'live' ? 'Teszt Price ID van éles Stripe-kulcs mellett.' : 'Éles Price ID van teszt Stripe-kulcs mellett.';
  }
  return null;
}

async function validateStripeConfiguration(environment = process.env, options = {}) {
  const basic = paymentReadiness(environment);
  const mode = stripeMode(environment);
  const fingerprint = stripeFingerprint(environment);
  const now = Date.now();
  if (!options.force && stripeValidationCache.key === fingerprint && stripeValidationCache.value && stripeValidationCache.expiresAt > now) {
    return stripeValidationCache.value;
  }
  if (!options.force && stripeValidationCache.key === fingerprint && stripeValidationCache.pending) return stripeValidationCache.pending;

  const pending = (async () => {
    const details = {
      secret: {
        ready: basic.secret,
        message: basic.secret ? `Stripe ${mode === 'live' ? 'éles' : 'teszt'} kulcs felismerve.` : 'Hiányzó vagy hibás STRIPE_SECRET_KEY.'
      },
      webhook: {
        ready: basic.webhook,
        message: basic.webhook ? 'Webhook aláírási titok felismerve.' : 'Hiányzó vagy hibás STRIPE_WEBHOOK_SECRET.'
      },
      prices: {}
    };
    const prices = {};
    await Promise.all(Object.entries(PRICE_ENV).map(async ([key, envName]) => {
      const [plan, cycle] = key.split(':');
      const priceId = String(environment[envName] || '').trim();
      if (!basic.secret) {
        prices[key] = false;
        details.prices[key] = { ready: false, message: 'A Price nem ellenőrizhető érvényes Stripe-kulcs nélkül.' };
        return;
      }
      if (!basic.prices[key]) {
        prices[key] = false;
        details.prices[key] = { ready: false, message: `Hiányzó vagy hibás ${envName}.` };
        return;
      }
      try {
        const price = await stripeRequest(`/prices/${encodeURIComponent(priceId)}`);
        const problem = validateStripePriceObject(price, plan, cycle, mode);
        prices[key] = !problem;
        details.prices[key] = {
          ready: !problem,
          message: problem || `${price.nickname || PLAN_CATALOG[plan].name} · ${(Number(price.unit_amount) / 100).toFixed(2)} EUR / ${cycle === 'yearly' ? 'év' : 'hó'} · ${mode === 'live' ? 'ÉLES' : 'TESZT'}`,
          priceId: price.id
        };
      } catch (error) {
        prices[key] = false;
        details.prices[key] = { ready: false, message: redactStripeMessage(error.message || error) };
      }
    }));
    const missing = [
      ...(!basic.secret ? ['STRIPE_SECRET_KEY'] : []),
      ...(!basic.webhook ? ['STRIPE_WEBHOOK_SECRET'] : []),
      ...Object.entries(PRICE_ENV).filter(([key]) => !prices[key]).map(([, envName]) => envName)
    ];
    return {
      secret: basic.secret,
      webhook: basic.webhook,
      prices,
      details,
      mode,
      missing,
      checkoutReady: basic.secret && Object.values(prices).some(Boolean),
      webhookReady: basic.secret && basic.webhook,
      fullyReady: basic.secret && basic.webhook && Object.values(prices).every(Boolean)
    };
  })();
  stripeValidationCache.key = fingerprint;
  stripeValidationCache.pending = pending;
  try {
    const value = await pending;
    stripeValidationCache.value = value;
    stripeValidationCache.expiresAt = Date.now() + 60_000;
    return value;
  } finally {
    stripeValidationCache.pending = null;
  }
}

async function validateSelectedPrice(plan, cycle) {
  const key = `${plan}:${cycle}`;
  const basic = paymentReadiness();
  if (!basic.secret) throw new Error('Hiányzó vagy hibás STRIPE_SECRET_KEY.');
  const priceId = priceIdFor(plan, cycle);
  if (!priceId || !basic.prices[key]) throw new Error(`Hiányzó vagy hibás ${PRICE_ENV[key] || 'Stripe Price ID'}.`);
  const fingerprint = stripeFingerprint();
  if (stripeValidationCache.key === fingerprint && stripeValidationCache.value && stripeValidationCache.expiresAt > Date.now()) {
    const cached = stripeValidationCache.value;
    if (!cached.prices[key]) throw new Error(cached.details.prices[key]?.message || 'A kiválasztott Stripe Price hibás.');
    return cached.details.prices[key];
  }
  const price = await stripeRequest(`/prices/${encodeURIComponent(priceId)}`);
  const problem = validateStripePriceObject(price, plan, cycle, stripeMode());
  if (problem) throw new Error(problem);
  return { ready: true, message: `${PLAN_CATALOG[plan].name} Stripe Price ellenőrizve.`, priceId };
}

async function createCheckoutSession({ guildId, discordUserId, plan: planValue, cycle: cycleValue, returnUrl }) {
  const plan = normalizedPlan(planValue);
  const cycle = normalizedCycle(cycleValue);
  const priceId = priceIdFor(plan, cycle);
  if (!/^\d{16,22}$/.test(String(guildId || '')) || !/^\d{16,22}$/.test(String(discordUserId || ''))) {
    throw new Error('Érvénytelen Discord szerver vagy felhasználó ID.');
  }
  if (!plan || !cycle || !priceId) throw new Error('Ez a csomag még nincs összekötve Stripe Price azonosítóval.');
  await validateSelectedPrice(plan, cycle);
  const root = String(returnUrl || '').replace(/\/$/, '');
  if (!/^https:\/\//i.test(root) && !/^http:\/\/localhost(?::\d+)?$/i.test(root)) throw new Error('A Stripe visszatérési címnek érvényes HTTPS URL-nek kell lennie.');
  const body = {
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    client_reference_id: String(guildId),
    success_url: `${root}/billing?guild=${encodeURIComponent(guildId)}&success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${root}/billing?guild=${encodeURIComponent(guildId)}&canceled=1`,
    allow_promotion_codes: 'true',
    locale: 'auto',
    'metadata[guild_id]': String(guildId),
    'metadata[discord_user_id]': String(discordUserId),
    'metadata[plan]': plan,
    'metadata[billing_cycle]': cycle,
    'subscription_data[metadata][guild_id]': String(guildId),
    'subscription_data[metadata][discord_user_id]': String(discordUserId),
    'subscription_data[metadata][plan]': plan,
    'subscription_data[metadata][billing_cycle]': cycle
  };
  if (String(process.env.STRIPE_AUTOMATIC_TAX || '').toLowerCase() === 'true') {
    body['automatic_tax[enabled]'] = 'true';
    body.billing_address_collection = 'required';
    body['tax_id_collection[enabled]'] = 'true';
  }
  const stored = getGuildSubscription(guildId);
  if (stored?.customerId) body.customer = stored.customerId;
  const fiveMinuteWindow = Math.floor(Date.now() / 300_000);
  const checkout = await stripeRequest('/checkout/sessions', {
    method: 'POST',
    body,
    idempotencyKey: `nexa-checkout-${guildId}-${discordUserId}-${plan}-${cycle}-${fiveMinuteWindow}`
  });
  if (!checkout?.id?.startsWith('cs_') || !/^https:\/\/checkout\.stripe\.com\//i.test(String(checkout.url || ''))) {
    throw new Error('A Stripe nem adott vissza érvényes Checkout oldalt.');
  }
  return checkout;
}

async function createCustomerPortalSession(customerId, returnUrl, guildId = null) {
  if (!String(customerId || '').startsWith('cus_')) throw new Error('Ehhez a szerverhez még nem tartozik Stripe-ügyfél.');
  const root = String(returnUrl || '').replace(/\/$/, '');
  const returnPath = /^\d{16,22}$/.test(String(guildId || '')) ? `/billing?guild=${encodeURIComponent(guildId)}` : '/billing';
  const portal = await stripeRequest('/billing_portal/sessions', {
    method: 'POST',
    body: { customer: customerId, return_url: `${root}${returnPath}` }
  });
  if (!/^https:\/\/billing\.stripe\.com\//i.test(String(portal?.url || ''))) throw new Error('A Stripe ügyfélportál nem adott vissza érvényes URL-t.');
  return portal;
}

async function retrieveSubscription(subscriptionId) {
  if (!String(subscriptionId || '').startsWith('sub_')) throw new Error('Érvénytelen Stripe előfizetés-azonosító.');
  return stripeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

async function retrieveCheckoutSession(sessionId) {
  const id = String(sessionId || '').trim();
  if (!/^cs_(?:test_|live_)?[A-Za-z0-9_]+$/.test(id)) throw new Error('Érvénytelen Stripe Checkout Session azonosító.');
  return stripeRequest(`/checkout/sessions/${encodeURIComponent(id)}?expand%5B%5D=subscription`);
}

function verifyWebhookSignature(rawBody, signatureHeader, secret = process.env.STRIPE_WEBHOOK_SECRET, nowSeconds = Math.floor(Date.now() / 1000)) {
  const pairs = String(signatureHeader || '').split(',').map((part) => part.trim().split('='));
  const timestamp = Number(pairs.find(([key]) => key === 't')?.[1]);
  const signatures = pairs.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || !signatures.length || !String(secret || '').startsWith('whsec_')) return false;
  if (Math.abs(nowSeconds - timestamp) > 300) return false;
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ''), 'utf8');
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest('hex');
  return signatures.some((candidate) => {
    const a = Buffer.from(String(candidate), 'utf8');
    const b = Buffer.from(expected, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

function subscriptionPeriodEnd(subscription, item) {
  const seconds = Number(subscription?.current_period_end || item?.current_period_end || 0);
  return seconds > 0 ? new Date(seconds * 1000) : null;
}

async function syncStripeSubscription(subscription, fallback = {}) {
  const item = subscription?.items?.data?.[0];
  const priceId = String(item?.price?.id || '');
  const mapped = planForPriceId(priceId);
  if (!mapped) throw new Error(`Ismeretlen Stripe Price ID: ${priceId || 'hiányzik'}`);
  const metadata = { ...(fallback || {}), ...(subscription?.metadata || {}) };
  const guildId = String(metadata.guild_id || metadata.guildId || '');
  const discordUserId = String(metadata.discord_user_id || metadata.discordUserId || '');
  if (!/^\d{16,22}$/.test(guildId) || !/^\d{16,22}$/.test(discordUserId)) throw new Error('A Stripe előfizetés Discord-metaadata hiányos.');
  return upsertGuildSubscription({
    guildId,
    discordUserId,
    customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
    subscriptionId: subscription.id,
    priceId,
    plan: mapped.plan,
    billingCycle: mapped.cycle,
    status: subscription.status,
    currentPeriodEnd: subscriptionPeriodEnd(subscription, item),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    createdAt: subscription.created ? new Date(Number(subscription.created) * 1000) : null
  });
}

async function reconcileCheckoutSession({ sessionId, guildId, discordUserId }) {
  const expectedGuildId = String(guildId || '');
  const expectedUserId = String(discordUserId || '');
  if (!/^\d{16,22}$/.test(expectedGuildId) || !/^\d{16,22}$/.test(expectedUserId)) {
    throw new Error('Érvénytelen Discord szerver vagy felhasználó ID.');
  }
  const checkout = await retrieveCheckoutSession(sessionId);
  const metadata = checkout?.metadata || {};
  if (checkout.mode !== 'subscription') throw new Error('Ez a Checkout Session nem előfizetéshez tartozik.');
  if (checkout.status !== 'complete' || !['paid', 'no_payment_required'].includes(String(checkout.payment_status || ''))) {
    throw new Error('A Stripe szerint a fizetés még nincs sikeresen befejezve.');
  }
  if (String(checkout.client_reference_id || '') !== expectedGuildId || String(metadata.guild_id || '') !== expectedGuildId) {
    throw new Error('A Checkout Session másik Discord-szerverhez tartozik.');
  }
  if (String(metadata.discord_user_id || '') !== expectedUserId) {
    throw new Error('A Checkout Session másik Discord-felhasználóhoz tartozik.');
  }
  const subscription = typeof checkout.subscription === 'string'
    ? await retrieveSubscription(checkout.subscription)
    : checkout.subscription;
  if (!subscription?.id?.startsWith('sub_')) throw new Error('A kész fizetéshez nem található Stripe-előfizetés.');
  const subscriptionGuildId = String(subscription.metadata?.guild_id || expectedGuildId);
  const subscriptionUserId = String(subscription.metadata?.discord_user_id || expectedUserId);
  if (subscriptionGuildId !== expectedGuildId || subscriptionUserId !== expectedUserId) {
    throw new Error('A Stripe előfizetés metaadata nem egyezik a Checkout Session adataival.');
  }
  const itemPriceId = String(subscription.items?.data?.[0]?.price?.id || '');
  const mapped = planForPriceId(itemPriceId);
  if (!mapped || (metadata.plan && mapped.plan !== metadata.plan) || (metadata.billing_cycle && mapped.cycle !== metadata.billing_cycle)) {
    throw new Error('A kifizetett Stripe Price nem egyezik a kiválasztott NEXA csomaggal.');
  }
  const entitlement = await syncStripeSubscription(subscription, metadata);
  return { checkout, subscription, entitlement };
}

async function claimEvent(event) {
  const result = await dbQuery(
    `INSERT INTO nexabot_payment_events (event_id, event_type, status, received_at)
     VALUES ($1, $2, 'processing', NOW())
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [event.id, event.type]
  );
  if (!result) {
    if (memoryEvents.has(event.id)) return false;
    memoryEvents.add(event.id);
    return true;
  }
  if (result.rowCount) return true;
  const previous = await dbQuery('SELECT status FROM nexabot_payment_events WHERE event_id = $1', [event.id]);
  if (previous?.rows?.[0]?.status !== 'failed') return false;
  await dbQuery("UPDATE nexabot_payment_events SET status = 'processing', last_error = NULL, received_at = NOW() WHERE event_id = $1", [event.id]);
  return true;
}

async function finishEvent(eventId, error = null) {
  if (error) {
    memoryEvents.delete(eventId);
    await dbQuery("UPDATE nexabot_payment_events SET status = 'failed', last_error = $2 WHERE event_id = $1", [eventId, String(error.message || error).slice(0, 1000)]);
    return;
  }
  await dbQuery("UPDATE nexabot_payment_events SET status = 'processed', processed_at = NOW(), last_error = NULL WHERE event_id = $1", [eventId]);
}

function invoiceSubscriptionId(invoice) {
  const direct = invoice?.subscription;
  if (typeof direct === 'string') return direct;
  return invoice?.parent?.subscription_details?.subscription || invoice?.subscription_details?.subscription || null;
}

async function recordInvoice(invoice, subscription) {
  const guildId = String(subscription?.metadata?.guild_id || '');
  if (!invoice?.id || !/^\d{16,22}$/.test(guildId)) return;
  const subscriptionId = invoiceSubscriptionId(invoice) || subscription?.id || null;
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  const amount = invoice.status === 'paid' ? Number(invoice.amount_paid || 0) : Number(invoice.amount_due || 0);
  const paidSeconds = Number(invoice.status_transitions?.paid_at || 0);
  await dbQuery(
    `INSERT INTO nexabot_payments
      (stripe_invoice_id, guild_id, stripe_customer_id, stripe_subscription_id, amount, currency, status, paid_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
     ON CONFLICT (stripe_invoice_id) DO UPDATE SET
      amount = EXCLUDED.amount,
      currency = EXCLUDED.currency,
      status = EXCLUDED.status,
      paid_at = EXCLUDED.paid_at,
      updated_at = NOW()`,
    [invoice.id, guildId, String(customerId || ''), subscriptionId, Math.max(0, Math.round(amount)), String(invoice.currency || 'eur').toLowerCase(), String(invoice.status || 'unknown'), paidSeconds ? new Date(paidSeconds * 1000) : null, new Date(Number(invoice.created || Math.floor(Date.now() / 1000)) * 1000)]
  );
}

async function processStripeEvent(event) {
  if (!event?.id || !event?.type || !event?.data?.object) throw new Error('Érvénytelen Stripe webhook esemény.');
  if (!(await claimEvent(event))) return { duplicate: true };
  try {
    const object = event.data.object;
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type) && object.mode === 'subscription' && object.subscription) {
      const subscription = await retrieveSubscription(typeof object.subscription === 'string' ? object.subscription : object.subscription.id);
      await syncStripeSubscription(subscription, object.metadata);
    } else if (['customer.subscription.created', 'customer.subscription.updated'].includes(event.type)) {
      await syncStripeSubscription(object);
    } else if (event.type === 'customer.subscription.deleted') {
      const guildId = String(object.metadata?.guild_id || '');
      if (/^\d{16,22}$/.test(guildId)) await removeGuildSubscription(guildId, 'canceled');
    } else if (['invoice.paid', 'invoice.payment_succeeded', 'invoice.payment_failed'].includes(event.type)) {
      const subscriptionId = invoiceSubscriptionId(object);
      if (subscriptionId) {
        const subscription = await retrieveSubscription(subscriptionId);
        await syncStripeSubscription(subscription);
        await recordInvoice(object, subscription);
      }
    }
    await finishEvent(event.id);
    return { duplicate: false };
  } catch (error) {
    await finishEvent(event.id, error);
    throw error;
  }
}

module.exports = {
  PLAN_CATALOG,
  PRICE_ENV,
  normalizedPlan,
  normalizedCycle,
  priceIdFor,
  planForPriceId,
  paymentReadiness,
  stripeMode,
  redactStripeMessage,
  validateStripeConfiguration,
  validateStripePriceObject,
  createCheckoutSession,
  createCustomerPortalSession,
  retrieveCheckoutSession,
  reconcileCheckoutSession,
  verifyWebhookSignature,
  syncStripeSubscription,
  processStripeEvent
};

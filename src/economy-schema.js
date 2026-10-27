module.exports=`
CREATE TABLE IF NOT EXISTS nexabot_economy_settings(
 guild_id TEXT PRIMARY KEY, config JSONB NOT NULL DEFAULT '{"enabled":true,"currency":"NEX","daily":250,"streakBonus":25,"workMin":100,"workMax":300,"workSeconds":3600,"transferTax":0,"maxBalance":1000000000}', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS nexabot_economy_accounts(
 guild_id TEXT NOT NULL,user_id TEXT NOT NULL,cash BIGINT NOT NULL DEFAULT 0 CHECK(cash>=0 AND cash<=1000000000000),bank BIGINT NOT NULL DEFAULT 0 CHECK(bank>=0 AND bank<=1000000000000),
 daily_at TIMESTAMPTZ,work_at TIMESTAMPTZ,streak INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(guild_id,user_id));
CREATE TABLE IF NOT EXISTS nexabot_economy_items(
 id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',price BIGINT NOT NULL CHECK(price>0 AND price<=1000000000),stock INTEGER NOT NULL DEFAULT -1 CHECK(stock>=-1),active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE INDEX IF NOT EXISTS nexabot_economy_items_guild ON nexabot_economy_items(guild_id,id);
CREATE TABLE IF NOT EXISTS nexabot_economy_inventory(
 guild_id TEXT NOT NULL,user_id TEXT NOT NULL,item_id BIGINT NOT NULL REFERENCES nexabot_economy_items(id),quantity INTEGER NOT NULL CHECK(quantity>=0 AND quantity<=1000000),PRIMARY KEY(guild_id,user_id,item_id));
CREATE TABLE IF NOT EXISTS nexabot_economy_ledger(
 id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,request_id TEXT NOT NULL,actor_id TEXT NOT NULL,target_id TEXT NOT NULL,action TEXT NOT NULL,amount BIGINT NOT NULL DEFAULT 0,payload_hash TEXT NOT NULL,details JSONB NOT NULL,result JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(guild_id,request_id));
CREATE INDEX IF NOT EXISTS nexabot_economy_history ON nexabot_economy_ledger(guild_id,id DESC);
CREATE OR REPLACE FUNCTION nexabot_economy_apply(g TEXT,u TEXT,r TEXT,h TEXT,b JSONB) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE c JSONB; a nexabot_economy_accounts%ROWTYPE; t nexabot_economy_accounts%ROWTYPE; item nexabot_economy_items%ROWTYPE; prev nexabot_economy_ledger%ROWTYPE;
 op TEXT:=b->>'action'; target TEXT:=COALESCE(b->>'target',u); n BIGINT:=0; fee BIGINT:=0; qty INTEGER:=1; have INTEGER; s INTEGER; limit_value BIGINT; result_value JSONB; now_value TIMESTAMPTZ:=clock_timestamp(); field_name TEXT;
BEGIN
 INSERT INTO nexabot_economy_settings(guild_id) VALUES(g) ON CONFLICT DO NOTHING;
 SELECT config INTO c FROM nexabot_economy_settings WHERE guild_id=g FOR UPDATE;
 SELECT * INTO prev FROM nexabot_economy_ledger WHERE guild_id=g AND request_id=r;
 IF FOUND THEN IF prev.actor_id<>u OR prev.payload_hash<>h THEN RAISE EXCEPTION 'ECO: A kérésazonosító másik művelethez tartozik.'; END IF; RETURN prev.result; END IF;
 IF op NOT IN ('settings','item','close-item','credit','debit') AND NOT (c->>'enabled')::boolean THEN RAISE EXCEPTION 'ECO: Ezen a szerveren a pénzrendszer szünetel.'; END IF;
 limit_value:=(c->>'maxBalance')::bigint;
 INSERT INTO nexabot_economy_accounts(guild_id,user_id) VALUES(g,u),(g,target) ON CONFLICT DO NOTHING;
 SELECT * INTO a FROM nexabot_economy_accounts WHERE guild_id=g AND user_id=u;
 IF op='settings' THEN
  c:=c||(b->'config');
  IF (c->>'workMin')::int>(c->>'workMax')::int THEN RAISE EXCEPTION 'ECO: A minimum munkabér nem lehet nagyobb a maximumnál.'; END IF;
  UPDATE nexabot_economy_settings SET config=c,updated_at=now_value WHERE guild_id=g;
  result_value:=jsonb_build_object('config',c);
 ELSIF op='item' THEN
  INSERT INTO nexabot_economy_items(guild_id,name,description,price,stock) VALUES(g,b->>'name',b->>'description',(b->>'price')::bigint,(b->>'stock')::integer) RETURNING * INTO item;
  result_value:=jsonb_build_object('itemId',item.id,'name',item.name,'price',item.price);
 ELSIF op='close-item' THEN
  UPDATE nexabot_economy_items SET active=FALSE WHERE guild_id=g AND id=(b->>'itemId')::bigint RETURNING * INTO item;
  IF NOT FOUND THEN RAISE EXCEPTION 'ECO: A termék nem található.'; END IF;
  result_value:=jsonb_build_object('itemId',item.id,'closed',TRUE);
 ELSE
  IF op IN ('daily','work') THEN
   IF op='daily' THEN
    IF a.daily_at IS NOT NULL AND a.daily_at+INTERVAL '24 hours'>now_value THEN RAISE EXCEPTION 'ECO: A napi jutalom még nem vehető fel. Következő időpont: %',a.daily_at+INTERVAL '24 hours'; END IF;
    s:=CASE WHEN a.daily_at IS NOT NULL AND a.daily_at+INTERVAL '48 hours'>now_value THEN LEAST(a.streak+1,7) ELSE 1 END;
    n:=(c->>'daily')::bigint+(s-1)*(c->>'streakBonus')::bigint;
    UPDATE nexabot_economy_accounts SET daily_at=now_value,streak=s WHERE guild_id=g AND user_id=u;
   ELSE
    IF a.work_at IS NOT NULL AND a.work_at+make_interval(secs=>(c->>'workSeconds')::int)>now_value THEN RAISE EXCEPTION 'ECO: Még pihenőidőn vagy. Következő munka: %',a.work_at+make_interval(secs=>(c->>'workSeconds')::int); END IF;
    n:=(c->>'workMin')::bigint+floor(random()*((c->>'workMax')::bigint-(c->>'workMin')::bigint+1))::bigint;
    UPDATE nexabot_economy_accounts SET work_at=now_value WHERE guild_id=g AND user_id=u;
   END IF;
   IF a.cash+a.bank+n>limit_value THEN RAISE EXCEPTION 'ECO: A jutalommal túllépnéd a szerver egyenlegkorlátját.'; END IF;
   UPDATE nexabot_economy_accounts SET cash=cash+n WHERE guild_id=g AND user_id=u;
  ELSIF op IN ('deposit','withdraw','transfer','credit','debit') THEN
   n:=CASE WHEN b->>'amount'='all' THEN CASE WHEN op='withdraw' THEN a.bank ELSE a.cash END ELSE (b->>'amount')::bigint END;
   IF n IS NULL OR n<1 OR n>1000000000000 THEN RAISE EXCEPTION 'ECO: Pozitív, érvényes egész összeget adj meg.'; END IF;
   IF op IN ('deposit','transfer') AND a.cash<n OR op='withdraw' AND a.bank<n THEN RAISE EXCEPTION 'ECO: Nincs elegendő fedezet.'; END IF;
   IF op='deposit' THEN UPDATE nexabot_economy_accounts SET cash=cash-n,bank=bank+n WHERE guild_id=g AND user_id=u;
   ELSIF op='withdraw' THEN UPDATE nexabot_economy_accounts SET cash=cash+n,bank=bank-n WHERE guild_id=g AND user_id=u;
   ELSIF op='transfer' THEN
    IF target=u THEN RAISE EXCEPTION 'ECO: Saját magadnak nem utalhatsz.'; END IF;
    fee:=floor(n*(c->>'transferTax')::numeric/100); SELECT * INTO t FROM nexabot_economy_accounts WHERE guild_id=g AND user_id=target;
    IF t.cash+t.bank+n-fee>limit_value THEN RAISE EXCEPTION 'ECO: A címzett túllépné az egyenlegkorlátot.'; END IF;
    UPDATE nexabot_economy_accounts SET cash=cash-n WHERE guild_id=g AND user_id=u;
    UPDATE nexabot_economy_accounts SET cash=cash+n-fee WHERE guild_id=g AND user_id=target;
   ELSE
    SELECT * INTO t FROM nexabot_economy_accounts WHERE guild_id=g AND user_id=target;field_name:=b->>'pocket';
    IF field_name NOT IN ('cash','bank') THEN RAISE EXCEPTION 'ECO: Érvénytelen számlatípus.'; END IF;
    IF op='debit' AND (CASE WHEN field_name='cash' THEN t.cash ELSE t.bank END)<n THEN RAISE EXCEPTION 'ECO: A levonáshoz nincs elegendő fedezet.'; END IF;
    IF op='credit' AND t.cash+t.bank+n>limit_value THEN RAISE EXCEPTION 'ECO: A jóváírás túllépné az egyenlegkorlátot.'; END IF;
    UPDATE nexabot_economy_accounts SET cash=cash+CASE WHEN field_name='cash' THEN CASE WHEN op='credit' THEN n ELSE -n END ELSE 0 END,bank=bank+CASE WHEN field_name='bank' THEN CASE WHEN op='credit' THEN n ELSE -n END ELSE 0 END WHERE guild_id=g AND user_id=target;
   END IF;
  ELSIF op IN ('buy','use') THEN
   qty:=(b->>'quantity')::integer;
   IF qty IS NULL OR qty<1 OR qty>100 THEN RAISE EXCEPTION 'ECO: 1 és 100 közötti mennyiséget adj meg.'; END IF;
   SELECT * INTO item FROM nexabot_economy_items WHERE guild_id=g AND id=(b->>'itemId')::bigint FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'ECO: A termék nem található ezen a szerveren.'; END IF;
   IF op='buy' THEN
    IF NOT item.active THEN RAISE EXCEPTION 'ECO: A termék már nem kapható.'; END IF;
    IF b ? 'expectedPrice' AND (b->>'expectedPrice')::bigint<>item.price THEN RAISE EXCEPTION 'ECO: A termék ára változott. Nyisd meg újra a boltot.'; END IF;
    IF item.stock<>-1 AND item.stock<qty THEN RAISE EXCEPTION 'ECO: Nincs elegendő készlet.'; END IF;
    n:=item.price*qty;
    IF a.cash<n THEN RAISE EXCEPTION 'ECO: A pénztárcádban nincs elegendő fedezet.'; END IF;
    UPDATE nexabot_economy_accounts SET cash=cash-n WHERE guild_id=g AND user_id=u;
    UPDATE nexabot_economy_items SET stock=CASE WHEN stock=-1 THEN -1 ELSE stock-qty END WHERE id=item.id;
    INSERT INTO nexabot_economy_inventory(guild_id,user_id,item_id,quantity) VALUES(g,u,item.id,qty) ON CONFLICT(guild_id,user_id,item_id) DO UPDATE SET quantity=nexabot_economy_inventory.quantity+EXCLUDED.quantity;
   ELSE
    SELECT quantity INTO have FROM nexabot_economy_inventory WHERE guild_id=g AND user_id=u AND item_id=item.id;
    IF have IS NULL OR have<qty THEN RAISE EXCEPTION 'ECO: Nincs ennyi termék a leltáradban.'; END IF;
    UPDATE nexabot_economy_inventory SET quantity=quantity-qty WHERE guild_id=g AND user_id=u AND item_id=item.id;
   END IF;
  ELSE RAISE EXCEPTION 'ECO: Ismeretlen pénzügyi művelet.';
  END IF;
  SELECT * INTO a FROM nexabot_economy_accounts WHERE guild_id=g AND user_id=u;
  result_value:=jsonb_build_object('cash',a.cash,'bank',a.bank,'streak',a.streak,'amount',n,'fee',fee,'quantity',qty,'itemId',item.id,'itemName',item.name,'target',target,'currency',c->>'currency');
 END IF;
 INSERT INTO nexabot_economy_ledger(guild_id,request_id,actor_id,target_id,action,amount,payload_hash,details,result) VALUES(g,r,u,target,op,n,h,b||jsonb_build_object('currency',c->>'currency'),result_value);
 RETURN result_value;
END $$;
`;

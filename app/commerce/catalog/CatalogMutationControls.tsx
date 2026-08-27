"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";

import type {
  CommerceCatalogBundle,
  CommerceCatalogProduct,
} from "@/src/lib/admin-api/commerce-catalog-v2";

import {
  createBundleAction,
  createOfferAction,
  initialCatalogActionState,
  schedulePriceAction,
  updateBundleAction,
  updateOfferAction,
  updateProductAction,
  upsertPolicyAction,
  type CatalogActionState,
} from "./actions";
import styles from "./catalog-controls.module.css";

type Action = (state: CatalogActionState, form: FormData) => Promise<CatalogActionState>;

function MutationForm({
  action,
  title,
  description,
  children,
}: {
  action: Action;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, initialCatalogActionState);
  const [key, setKey] = useState("");

  useEffect(() => {
    setKey(crypto.randomUUID());
  }, []);

  useEffect(() => {
    if (state.status === "success") setKey(crypto.randomUUID());
  }, [state.status]);

  return (
    <form action={formAction} className={styles.form} onInput={() => setKey(crypto.randomUUID())}>
      <input type="hidden" name="idempotencyKey" value={key} />
      <header>
        <strong>{title}</strong>
        <p>{description}</p>
      </header>
      {children}
      <label className={styles.full}>
        <span>Reason</span>
        <textarea
          name="reason"
          minLength={10}
          maxLength={1000}
          required
          rows={2}
          placeholder="دلیل عملیاتی قابل audit را بنویسید…"
        />
      </label>
      <div className={styles.footer}>
        <span aria-live="polite" data-status={state.status}>
          {state.message}
        </span>
        <button type="submit" disabled={pending || key.length < 8}>
          {pending ? "در حال ثبت…" : "ثبت امن تغییر"}
        </button>
      </div>
    </form>
  );
}

function Lifecycle({ value }: { value: string }) {
  return (
    <select name="status" defaultValue={value} required>
      <option value="Hidden">Hidden</option>
      <option value="Published">Published</option>
      <option value="Retired">Retired</option>
    </select>
  );
}

function GiftEligible({ value }: { value: boolean }) {
  return (
    <select name="giftEligible" defaultValue={String(value)} required>
      <option value="true">Gift eligible</option>
      <option value="false">Not gift eligible</option>
    </select>
  );
}

function ProductControls({ product }: { product: CommerceCatalogProduct }) {
  return (
    <section className={styles.entity}>
      <h4>{product.name}</h4>
      <MutationForm
        action={updateProductAction}
        title={`Product · ${product.code}`}
        description="نام و lifecycle با optimistic version از Core #560 تغییر می‌کند."
      >
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="expectedVersion" value={product.version} />
        <label>
          <span>Name</span>
          <input name="name" defaultValue={product.name} minLength={2} maxLength={120} required />
        </label>
        <label>
          <span>Status · v{product.version}</span>
          <Lifecycle value={product.status} />
        </label>
      </MutationForm>

      <MutationForm
        action={createOfferAction}
        title="Create Offer"
        description="Offer جدید به همین Product متصل می‌شود؛ قیمت جداگانه و نسخه‌دار است."
      >
        <input type="hidden" name="productId" value={product.id} />
        <label>
          <span>Code</span>
          <input name="code" pattern="[a-z0-9][a-z0-9._-]+" required />
        </label>
        <label>
          <span>Name</span>
          <input name="name" minLength={2} maxLength={120} required />
        </label>
        <label>
          <span>Duration months</span>
          <input name="durationMonths" type="number" min="1" max="120" required />
        </label>
        <label>
          <span>Status</span>
          <Lifecycle value="Hidden" />
        </label>
        <label>
          <span>Gift</span>
          <GiftEligible value={false} />
        </label>
      </MutationForm>

      {product.offers.map((offer) => (
        <div className={styles.offer} key={offer.id}>
          <MutationForm
            action={updateOfferAction}
            title={`Offer · ${offer.code}`}
            description="Update/retire بدون تغییر ID یا بازنویسی subscriptionهای تاریخی."
          >
            <input type="hidden" name="offerId" value={offer.id} />
            <input type="hidden" name="expectedVersion" value={offer.version} />
            <label>
              <span>Name</span>
              <input name="name" defaultValue={offer.name} minLength={2} maxLength={120} required />
            </label>
            <label>
              <span>Duration</span>
              <input
                name="durationMonths"
                type="number"
                min="1"
                max="120"
                defaultValue={offer.durationMonths}
                required
              />
            </label>
            <label>
              <span>Status · v{offer.version}</span>
              <Lifecycle value={offer.status} />
            </label>
            <label>
              <span>Gift</span>
              <GiftEligible value={offer.giftEligible} />
            </label>
          </MutationForm>
          <MutationForm
            action={schedulePriceAction}
            title={`Schedule price · ${offer.code}`}
            description="فقط minor-unit + currency/provider صریح؛ قیمت قبلی rewrite نمی‌شود. زمان باید ISO-8601 با Z یا offset باشد."
          >
            <input type="hidden" name="offerId" value={offer.id} />
            <label>
              <span>Country (optional)</span>
              <input name="countryCode" maxLength={2} placeholder="IR" />
            </label>
            <label>
              <span>Currency</span>
              <input name="currency" minLength={3} maxLength={3} placeholder="IRR" required />
            </label>
            <label>
              <span>Provider</span>
              <input
                name="storeProvider"
                minLength={2}
                maxLength={40}
                placeholder="direct"
                required
              />
            </label>
            <label>
              <span>Amount minor</span>
              <input name="amountMinor" inputMode="numeric" pattern="[0-9]+" required />
            </label>
            <label className={styles.full}>
              <span>Effective from (ISO-8601)</span>
              <input
                name="effectiveFromUtc"
                type="text"
                placeholder="2026-08-28T09:00:00Z"
                pattern=".*(?:[zZ]|[+-][0-9]{2}:[0-9]{2})$"
                required
              />
            </label>
          </MutationForm>
        </div>
      ))}

      {product.policies.map((policy) => (
        <MutationForm
          key={policy.key}
          action={upsertPolicyAction}
          title={`Policy · ${policy.key}`}
          description="Free-tier و سایر limits typed و versioned می‌مانند؛ mobile hardcode نمی‌شود."
        >
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="policyKey" value={policy.key} />
          <input type="hidden" name="expectedVersion" value={policy.version} />
          <label>
            <span>Type</span>
            <select name="valueType" defaultValue={policy.valueType}>
              <option value="integer">integer</option>
              <option value="boolean">boolean</option>
              <option value="string">string</option>
              <option value="json">json</option>
            </select>
          </label>
          <label>
            <span>Status · v{policy.version}</span>
            <select name="policyStatus" defaultValue="Active">
              <option value="Active">Active</option>
              <option value="Retired">Retired</option>
            </select>
          </label>
          <label className={styles.full}>
            <span>Value</span>
            <textarea
              name="value"
              defaultValue={
                typeof policy.value === "string" ? policy.value : JSON.stringify(policy.value)
              }
              rows={2}
              required
            />
          </label>
        </MutationForm>
      ))}

      <MutationForm
        action={upsertPolicyAction}
        title="Create policy"
        description="Policy جدید typed است و expectedVersion خالی یعنی create."
      >
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="expectedVersion" value="" />
        <label>
          <span>Policy key</span>
          <input name="policyKey" pattern="[a-z0-9][a-z0-9._-]+" required />
        </label>
        <label>
          <span>Type</span>
          <select name="valueType" defaultValue="integer">
            <option value="integer">integer</option>
            <option value="boolean">boolean</option>
            <option value="string">string</option>
            <option value="json">json</option>
          </select>
        </label>
        <label>
          <span>Status</span>
          <select name="policyStatus" defaultValue="Active">
            <option value="Active">Active</option>
            <option value="Retired">Retired</option>
          </select>
        </label>
        <label className={styles.full}>
          <span>Value</span>
          <textarea name="value" rows={2} required />
        </label>
      </MutationForm>
    </section>
  );
}

function BundleControls({ bundle }: { bundle: CommerceCatalogBundle }) {
  return (
    <MutationForm
      action={updateBundleAction}
      title={`Bundle · ${bundle.code}`}
      description="ترکیب Bundle اتمیک جایگزین می‌شود و version conflict جلوی overwrite را می‌گیرد."
    >
      <input type="hidden" name="bundleId" value={bundle.id} />
      <input type="hidden" name="expectedVersion" value={bundle.version} />
      <label>
        <span>Name</span>
        <input name="name" defaultValue={bundle.name} minLength={2} maxLength={120} required />
      </label>
      <label>
        <span>Status · v{bundle.version}</span>
        <Lifecycle value={bundle.status} />
      </label>
      <label>
        <span>Gift</span>
        <GiftEligible value={bundle.giftEligible} />
      </label>
      <label className={styles.full}>
        <span>Offer IDs</span>
        <textarea
          name="offerIds"
          defaultValue={bundle.items.map((item) => item.offerId).join("\n")}
          rows={3}
          required
        />
      </label>
    </MutationForm>
  );
}

export function CatalogMutationControls({
  products,
  bundles,
}: {
  products: CommerceCatalogProduct[];
  bundles: CommerceCatalogBundle[];
}) {
  return (
    <section className={styles.workspace} aria-label="Catalog mutation controls">
      <header className={styles.heading}>
        <span>commerce.catalog.write</span>
        <h3>Catalog Controls</h3>
        <p>تمام writeها server-only، idempotent، reason-required و توسط Core #560 audit می‌شوند.</p>
      </header>
      {products.map((product) => (
        <ProductControls key={product.id} product={product} />
      ))}
      <section className={styles.entity}>
        <h4>Bundles</h4>
        <MutationForm
          action={createBundleAction}
          title="Create Bundle"
          description="Bundle جدید با Offer IDهای canonical ساخته می‌شود."
        >
          <label>
            <span>Code</span>
            <input name="code" pattern="[a-z0-9][a-z0-9._-]+" required />
          </label>
          <label>
            <span>Name</span>
            <input name="name" minLength={2} maxLength={120} required />
          </label>
          <label>
            <span>Status</span>
            <Lifecycle value="Hidden" />
          </label>
          <label>
            <span>Gift</span>
            <GiftEligible value={false} />
          </label>
          <label className={styles.full}>
            <span>Offer IDs</span>
            <textarea name="offerIds" rows={3} placeholder="یک UUID در هر خط" required />
          </label>
        </MutationForm>
        {bundles.map((bundle) => (
          <BundleControls key={bundle.id} bundle={bundle} />
        ))}
      </section>
    </section>
  );
}

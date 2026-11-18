"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CATEGORIES, PRODUCTS, formatMoney, type Product, type ProductCategory } from "@botspot/backend/shop";
import { useCart } from "./Cart";

/** Catalogo de la tienda con filtro por categoria y boton "Add to cart". */
export function ShopCatalog() {
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const { count } = useCart();
  const products = category === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.category === category);

  return (
    <>
      <div className="shop-toolbar">
        <div className="chip-row" role="tablist" aria-label="Product categories">
          <button
            type="button"
            role="tab"
            aria-selected={category === "all"}
            className={`chip${category === "all" ? " is-active" : ""}`}
            onClick={() => setCategory("all")}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              className={`chip${category === c.id ? " is-active" : ""}`}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        {count > 0 ? (
          <Link href="/cart" className="btn btn-primary btn-small">
            View cart ({count})
          </Link>
        ) : null}
      </div>

      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [variant, setVariant] = useState("");
  const [added, setAdded] = useState(false);
  const needsVariant = Boolean(product.variants);

  function addToCart() {
    if (needsVariant && !variant) return;
    add(product.id, needsVariant ? variant : null);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <article className="card product-card">
      <div className="product-media" aria-hidden={product.image ? undefined : true}>
        {product.image ? (
          <Image src={product.image} alt={product.name} fill sizes="(max-width: 700px) 100vw, 33vw" />
        ) : (
          <span className="product-icon">{product.icon}</span>
        )}
        {product.badge ? <span className="badge product-badge">{product.badge}</span> : null}
      </div>
      <h3>{product.name}</h3>
      <p className="muted small">{product.description}</p>
      <p className="product-price">
        <strong>{formatMoney(product.priceCents)}</strong>
        {product.compareAtCents ? <s className="muted">{formatMoney(product.compareAtCents)}</s> : null}
      </p>
      <p className="product-fulfillment small">
        {product.fulfillment === "email" ? "📧 Delivered by email" : "📍 Pick up at the arena"}
      </p>
      {product.variants ? (
        <label className="field">
          <span>Size</span>
          <select value={variant} onChange={(e) => setVariant(e.target.value)}>
            <option value="" disabled>
              Choose a size
            </option>
            {product.variants.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        type="button"
        className="btn btn-primary product-add"
        onClick={addToCart}
        disabled={needsVariant && !variant}
        aria-live="polite"
      >
        {added ? "✓ Added" : needsVariant && !variant ? "Choose a size" : "Add to cart"}
      </button>
    </article>
  );
}

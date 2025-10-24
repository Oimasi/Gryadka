export function getCart() {
  try {
    const raw = localStorage.getItem("cart");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent("cart:updated"));
  } catch (e) { }
}

export function addItem(product, qty = 1) {
  const cart = getCart();
  const idx = cart.findIndex(c => c.product.id === product.id);
  const max = product.stock ?? 9999;
  if (idx >= 0) {
    cart[idx].qty = Math.min((cart[idx].qty || 0) + qty, max);
  } else {
    cart.push({ product, qty: Math.min(Math.max(1, qty), max) });
  }
  saveCart(cart);
  return cart;
}

export function updateQty(productId, qty) {
  const cart = getCart();
  const idx = cart.findIndex(c => c.product.id === productId);
  if (idx >= 0) {
    const max = cart[idx].product.stock ?? 9999;
    cart[idx].qty = Math.min(Math.max(1, qty), max);
    saveCart(cart);
  }
  return cart;
}

export function removeItem(productId) {
  const cart = getCart().filter(c => c.product.id !== productId);
  saveCart(cart);
  return cart;
}

export function clearCart() {
  saveCart([]);
  return [];
}

export function getTotals(cart = null) {
  const c = cart || getCart();
  return c.reduce((acc, it) => {
    const price = Number(it.product.price ?? it.product.price_value ?? 0) || 0;
    acc.items += (it.qty || 0);
    acc.sum += price * (it.qty || 0);
    return acc;
  }, { items: 0, sum: 0 });
}

export function subscribe(cb) {
  const handler = () => cb(getCart());
  window.addEventListener("cart:updated", handler);
  try { cb(getCart()); } catch (e) { }
  return () => window.removeEventListener("cart:updated", handler);
}
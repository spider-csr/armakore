/* ==========================================================================
   ARMAKORE · armakore.js
   Capa de SIMULACIÓN compartida por todas las páginas.
   - Todo se guarda en localStorage del navegador (no hay servidor real).
   - Las contraseñas se guardan con un hash simple: NO es seguro, es solo
     para que la simulación no guarde texto plano.
   - Nunca se guarda el número completo de una tarjeta (solo los 4 últimos).
   ========================================================================== */
(function () {
    'use strict';

    const K = {
        cart: 'armakore_cart',
        user: 'armakore_user',
        users: 'armakore_users',
        orders: 'armakore_orders',
        devices: 'armakore_devices',
        coupon: 'armakore_coupon',
        notify: 'armakore_notify',
        config: 'armakore_config'
    };

    /* ---------- utilidades ---------- */
    function read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (e) { return fallback; }
    }
    function write(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch (e) { return false; }
    }
    function esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function money(n) {
        return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function hash(str) { // cyrb53: simulación, no es criptografía
        let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
        for (let i = 0; i < str.length; i++) {
            const ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
    }
    const SALT = 'armakore-sim-';
    const passHash = p => hash(SALT + p);
    const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
    function initials(name) {
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return 'AK';
        return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
    }
    function safeNext(next) { // solo páginas locales .html
        return /^[a-z0-9\-]+\.html(#[\w\-]*)?$/i.test(next || '') ? next : null;
    }
    function qs(name) { return new URLSearchParams(location.search).get(name); }

    /* ---------- catálogo (para el dashboard y el buscador) ---------- */
    const MODELS = {
        'ARMAKORE P16 Max': { cat: 'p', cpu: 'AMD Ryzen 9 / Intel Ultra 9', gpu: 'RTX 4080 12GB', ram: '64GB DDR5', storage: '2TB NVMe M.2' },
        'ARMAKORE P15 Pro': { cat: 'p', cpu: 'Intel Core i9 14th Gen', gpu: 'RTX 4070 SUPER 8GB', ram: '32GB DDR5', storage: '1TB NVMe M.2' },
        'ARMAKORE P17 Studio': { cat: 'p', cpu: 'AMD Ryzen 9 7950X', gpu: 'RTX 4090 16GB', ram: '128GB DDR5', storage: '4TB NVMe M.2' },
        'ARMAKORE P14 Compact': { cat: 'p', cpu: 'Intel Core i7 14th Gen', gpu: 'RTX 4060 8GB', ram: '32GB DDR5', storage: '1TB NVMe M.2' },
        'ARMAKORE P18 Extreme': { cat: 'p', cpu: 'Dual Intel Ultra 9', gpu: 'Dual RTX 4090 32GB', ram: '256GB DDR5', storage: '8TB NVMe RAID' },
        'ARMAKORE P15 Air': { cat: 'p', cpu: 'AMD Ryzen 7 7800HS', gpu: 'RTX 4060 8GB', ram: '32GB DDR5', storage: '1TB NVMe M.2' },
        'ARMAKORE H15 Pro': { cat: 'h', cpu: 'Intel Core i7 14th Gen', gpu: 'RTX 4060 8GB', ram: '32GB DDR5', storage: '1TB NVMe M.2' },
        'ARMAKORE H14 Everyday': { cat: 'h', cpu: 'AMD Ryzen 5 7530U', gpu: 'Radeon Integrada', ram: '16GB DDR5', storage: '512GB NVMe M.2' },
        'ARMAKORE H15 Stream': { cat: 'h', cpu: 'Intel Core i5 13th Gen', gpu: 'RTX 3050 6GB', ram: '16GB DDR5', storage: '512GB NVMe M.2' },
        'ARMAKORE H14 Student': { cat: 'h', cpu: 'AMD Ryzen 5 7530U', gpu: 'Radeon Integrada', ram: '16GB DDR5', storage: '512GB NVMe M.2' },
        'ARMAKORE H16 Media': { cat: 'h', cpu: 'Intel Core i5 13th Gen', gpu: 'RTX 3050 6GB', ram: '16GB DDR5', storage: '1TB NVMe M.2' },
        'ARMAKORE H13 Mini': { cat: 'h', cpu: 'AMD Ryzen 5 7530U', gpu: 'Radeon Integrada', ram: '16GB DDR5', storage: '512GB NVMe M.2' },
        'ARMAKORE E14 Business': { cat: 'e', cpu: 'Intel Core i7 vPro 14th', gpu: 'Iris Xe Integrada', ram: '32GB DDR5', storage: '1TB NVMe M.2' },
        'ARMAKORE E15 Executive': { cat: 'e', cpu: 'Intel Core i7 vPro 14th', gpu: 'Iris Xe Integrada', ram: '32GB DDR5', storage: '1TB NVMe M.2' },
        'ARMAKORE E14 Slim': { cat: 'e', cpu: 'AMD Ryzen 7 PRO 7840U', gpu: 'Radeon 780M', ram: '16GB DDR5', storage: '512GB NVMe M.2' }
    };
    const CAT_LABEL = { p: 'Serie P · Potencia', h: 'Serie H · Hogar', e: 'Serie E · Empresarial', a: 'Serie A · Ahorro' };
    const DEVICE_CATS = ['p', 'h', 'e', 'a', 'Personalización PC', 'Escritorio'];
    const isDevice = item => DEVICE_CATS.includes(item.category);
    const catLabel = c => CAT_LABEL[c] || c || 'Producto';

    /* ---------- toast ---------- */
    function toast(message, opts) {
        opts = opts || {};
        let host = document.getElementById('ak-toasts');
        if (!host) {
            host = document.createElement('div');
            host.id = 'ak-toasts';
            host.setAttribute('role', 'status');
            host.setAttribute('aria-live', 'polite');
            host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:100000;display:flex;flex-direction:column;gap:8px;max-width:calc(100vw - 32px)';
            document.body.appendChild(host);
        }
        const el = document.createElement('div');
        el.style.cssText = 'background:#0a0a0a;border:1px solid ' + (opts.type === 'error' ? '#7f1d1d' : '#2a2a2a') + ';color:#fff;font:500 13px Inter,sans-serif;padding:10px 14px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.6);display:flex;gap:12px;align-items:center';
        const txt = document.createElement('span');
        txt.textContent = message;
        el.appendChild(txt);
        if (opts.action) {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = opts.action.label;
            b.style.cssText = 'background:none;border:0;color:#fff;text-decoration:underline;font:700 12px Inter,sans-serif;cursor:pointer';
            b.addEventListener('click', () => { opts.action.run(); el.remove(); });
            el.appendChild(b);
        }
        host.appendChild(el);
        setTimeout(() => el.remove(), opts.duration || 3500);
    }

    /* ---------- modal genérico ---------- */
    function modal(opts) {
        const prevFocus = document.activeElement;
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto';
        const box = document.createElement('div');
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        box.setAttribute('aria-label', opts.title || 'Diálogo');
        box.style.cssText = 'background:#0a0a0a;border:1px solid #222;border-radius:16px;width:100%;max-width:' + (opts.width || '440px') + ';padding:24px;color:#fff;font-family:Inter,sans-serif;box-shadow:0 30px 80px rgba(0,0,0,.8);max-height:calc(100vh - 32px);overflow-y:auto';
        box.innerHTML = '<h2 style="font-size:18px;font-weight:700;margin:0 0 4px">' + esc(opts.title || '') + '</h2>' +
            (opts.subtitle ? '<p style="font-size:12px;color:#9ca3af;margin:0 0 16px">' + esc(opts.subtitle) + '</p>' : '<div style="height:12px"></div>') +
            '<div data-body></div><div data-actions style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;flex-wrap:wrap"></div>';
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        const body = box.querySelector('[data-body]');
        if (typeof opts.body === 'string') body.innerHTML = opts.body; else if (opts.body) body.appendChild(opts.body);

        function close() {
            overlay.remove();
            document.body.style.overflow = '';
            document.removeEventListener('keydown', onKey);
            if (prevFocus && prevFocus.focus) prevFocus.focus();
        }
        function onKey(e) { if (e.key === 'Escape') close(); }
        document.addEventListener('keydown', onKey);
        overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });

        const actions = box.querySelector('[data-actions]');
        (opts.actions || [{ label: 'Cerrar' }]).forEach((a, i, arr) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = a.label;
            const primary = a.primary || (i === arr.length - 1 && arr.length > 1 && a.primary !== false);
            b.style.cssText = 'font:700 13px Inter,sans-serif;padding:10px 16px;border-radius:8px;cursor:pointer;' +
                (a.danger ? 'background:#b91c1c;color:#fff;border:1px solid #b91c1c' :
                    primary ? 'background:#fff;color:#000;border:1px solid #fff' : 'background:transparent;color:#fff;border:1px solid #444');
            b.addEventListener('click', () => {
                const keepOpen = a.onClick ? a.onClick({ close, box }) === false : false;
                if (!keepOpen) close();
            });
            actions.appendChild(b);
        });
        const firstField = box.querySelector('input,select,textarea') || actions.lastChild;
        if (firstField) firstField.focus();
        return { close, box, body };
    }
    function confirmBox(title, text, okLabel, danger) {
        return new Promise(resolve => {
            let done = false;
            const finish = v => { if (!done) { done = true; resolve(v); } };
            const m = modal({
                title, body: '<p style="font-size:13px;color:#d1d5db;margin:0">' + esc(text) + '</p>',
                actions: [
                    { label: 'Cancelar', onClick: () => finish(false) },
                    { label: okLabel || 'Aceptar', danger: !!danger, primary: true, onClick: () => finish(true) }
                ]
            });
            // si se cierra con ESC o clic fuera
            const obs = new MutationObserver(() => { if (!document.body.contains(m.box)) { finish(false); obs.disconnect(); } });
            obs.observe(document.body, { childList: true });
        });
    }

    /* ---------- cuentas ---------- */
    function seedUsers() {
        const users = read(K.users, null);
        if (users === null) {
            write(K.users, [{ name: 'Cuenta Demo', email: 'demo@armakore.com', pass: passHash('Demo1234'), createdAt: new Date().toISOString() }]);
        }
    }
    const getUsers = () => { seedUsers(); return read(K.users, []); };
    function currentUser() {
        const u = read(K.user, null);
        return u && u.email ? u : null;
    }
    function startSession(u, provider) {
        write(K.user, { name: u.name, email: u.email, provider: provider || 'email', loggedAt: new Date().toISOString() });
    }
    function register(data) {
        const name = String(data.name || '').trim();
        const email = String(data.email || '').trim().toLowerCase();
        const password = String(data.password || '');
        if (name.length < 2) return { ok: false, field: 'nombre', error: 'Escribe tu nombre completo.' };
        if (!validEmail(email)) return { ok: false, field: 'email', error: 'Escribe un correo válido, por ejemplo tu@correo.com.' };
        if (password.length < 8) return { ok: false, field: 'password', error: 'La contraseña debe tener al menos 8 caracteres.' };
        if (data.confirm !== undefined && data.confirm !== password) return { ok: false, field: 'verify-password', error: 'Las contraseñas no coinciden.' };
        const users = getUsers();
        if (users.some(u => u.email === email)) return { ok: false, field: 'email', error: 'Ya existe una cuenta con ese correo. Inicia sesión.' };
        const user = { name, email, pass: passHash(password), createdAt: new Date().toISOString() };
        users.push(user);
        write(K.users, users);
        startSession(user);
        return { ok: true, user };
    }
    function login(emailRaw, password) {
        const email = String(emailRaw || '').trim().toLowerCase();
        if (!validEmail(email)) return { ok: false, field: 'email', error: 'Escribe un correo válido.' };
        if (!password) return { ok: false, field: 'password', error: 'Escribe tu contraseña.' };
        const user = getUsers().find(u => u.email === email);
        if (!user) return { ok: false, field: 'email', error: 'No encontramos una cuenta con ese correo. Puedes crearla en "Crear cuenta".' };
        if (user.pass !== passHash(password)) return { ok: false, field: 'password', error: 'La contraseña es incorrecta.' };
        startSession(user);
        return { ok: true, user };
    }
    function socialLogin(provider) {
        const email = provider.toLowerCase() + '.usuario@ejemplo.com';
        const users = getUsers();
        let user = users.find(u => u.email === email);
        if (!user) {
            user = { name: 'Usuario ' + provider, email, pass: passHash(Math.random().toString(36)), createdAt: new Date().toISOString() };
            users.push(user);
            write(K.users, users);
        }
        startSession(user, provider);
        return { ok: true, user };
    }
    function logout() { try { localStorage.removeItem(K.user); } catch (e) { } }
    function requireAuth() {
        if (currentUser()) return true;
        const here = location.pathname.split('/').pop() || 'index.html';
        location.href = 'inicio-sesion.html?next=' + encodeURIComponent(here);
        return false;
    }
    function updateProfile(changes) {
        const me = currentUser();
        if (!me) return { ok: false, error: 'Inicia sesión primero.' };
        const users = getUsers();
        const u = users.find(x => x.email === me.email);
        if (!u) return { ok: false, error: 'No se encontró la cuenta.' };
        if (changes.name !== undefined) {
            const n = String(changes.name).trim();
            if (n.length < 2) return { ok: false, error: 'El nombre es demasiado corto.' };
            u.name = n;
        }
        if (changes.newPassword) {
            if (u.pass !== passHash(changes.currentPassword || '')) return { ok: false, error: 'La contraseña actual no es correcta.' };
            if (changes.newPassword.length < 8) return { ok: false, error: 'La nueva contraseña debe tener al menos 8 caracteres.' };
            u.pass = passHash(changes.newPassword);
        }
        write(K.users, users);
        startSession(u, me.provider);
        return { ok: true, user: u };
    }
    function resetPassword(emailRaw, newPass) {
        const email = String(emailRaw || '').trim().toLowerCase();
        if (String(newPass || '').length < 8) return { ok: false, error: 'La nueva contraseña debe tener al menos 8 caracteres.' };
        const users = getUsers();
        const u = users.find(x => x.email === email);
        if (!u) return { ok: false, error: 'No hay ninguna cuenta con ese correo.' };
        u.pass = passHash(newPass);
        write(K.users, users);
        return { ok: true };
    }
    function resetSimulation() {
        Object.values(K).forEach(k => { try { localStorage.removeItem(k); } catch (e) { } });
    }

    /* ---------- carrito ---------- */
    const cart = {
        get: () => read(K.cart, []),
        save(items) {
            write(K.cart, items);
            updateBadge();
            window.dispatchEvent(new CustomEvent('armakore:cart-updated'));
        },
        count: () => cart.get().reduce((s, i) => s + Number(i.quantity || 1), 0),
        add(product, qty) {
            const items = cart.get();
            const found = items.find(i => i.name === product.name);
            const q = Math.max(1, Number(qty || 1));
            if (found) found.quantity = Math.min(10, Number(found.quantity || 1) + q);
            else items.push(Object.assign({}, product, { quantity: Math.min(10, q) }));
            cart.save(items);
        },
        setQty(name, qty) {
            const items = cart.get();
            const it = items.find(i => i.name === name);
            if (!it) return;
            it.quantity = Math.max(1, Math.min(10, Number(qty) || 1));
            cart.save(items);
        },
        remove(name) { cart.save(cart.get().filter(i => i.name !== name)); },
        clear() { cart.save([]); },
        subtotal: () => cart.get().reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0)
    };
    function updateBadge() {
        const n = cart.count();
        document.querySelectorAll('#cart-count').forEach(b => {
            b.textContent = n > 99 ? '99+' : n;
            b.classList.toggle('hidden', n === 0);
            b.setAttribute('aria-label', n + ' producto' + (n === 1 ? '' : 's') + ' en el carrito');
        });
    }

    /* ---------- cupones y precios ---------- */
    const COUPONS = {
        ARMAKORE10: { type: 'pct', value: 10, label: '10% de descuento' },
        ESTUDIANTE15: { type: 'pct', value: 15, label: '15% de descuento estudiantil' },
        ENVIOGRATIS: { type: 'ship', label: 'Envío gratis' }
    };
    const SHIPPING = {
        standard: { label: 'Estándar (3–7 días)', price: 49, freeFrom: 1500, days: [3, 7] },
        express: { label: 'Express (24–48 h)', price: 99, freeFrom: Infinity, days: [1, 2] }
    };
    const TAX_RATE = 0.15; // IVA simulado
    const getCoupon = () => read(K.coupon, null);
    function applyCoupon(codeRaw) {
        const code = String(codeRaw || '').trim().toUpperCase();
        if (!code) return { ok: false, error: 'Escribe un código.' };
        if (!COUPONS[code]) return { ok: false, error: 'Ese cupón no existe o ya venció.' };
        write(K.coupon, code);
        return { ok: true, code, info: COUPONS[code] };
    }
    function removeCoupon() { try { localStorage.removeItem(K.coupon); } catch (e) { } }
    function quote(items, shippingKey) {
        items = items || cart.get();
        // Todo se calcula en centavos (enteros) para evitar errores de redondeo.
        const toC = n => Math.round(Number(n || 0) * 100);
        const subtotalC = items.reduce((s, i) => s + toC(i.price) * Number(i.quantity || 1), 0);
        const code = getCoupon();
        const c = code && COUPONS[code];
        const discountC = c && c.type === 'pct' ? Math.round(subtotalC * c.value / 100) : 0;
        const baseC = subtotalC - discountC;
        const ship = SHIPPING[shippingKey || 'standard'];
        let shippingC = !items.length ? 0 : (baseC >= ship.freeFrom * 100 ? 0 : ship.price * 100);
        if (c && c.type === 'ship') shippingC = 0;
        const taxC = Math.round(baseC * TAX_RATE);
        const totalC = baseC + shippingC + taxC;
        return { subtotal: subtotalC / 100, discount: discountC / 100, shipping: shippingC / 100, tax: taxC / 100, total: totalC / 100, code: c ? code : null };
    }

    /* ---------- pedidos ---------- */
    function luhn(num) {
        let sum = 0, alt = false;
        for (let i = num.length - 1; i >= 0; i--) {
            let n = Number(num[i]);
            if (alt) { n *= 2; if (n > 9) n -= 9; }
            sum += n; alt = !alt;
        }
        return sum % 10 === 0;
    }
    function cardBrand(num) {
        if (/^4/.test(num)) return 'Visa';
        if (/^(5[1-5]|2[2-7])/.test(num)) return 'Mastercard';
        if (/^3[47]/.test(num)) return 'American Express';
        return 'Tarjeta';
    }
    const STAGES = [
        { label: 'Pago confirmado', minutes: 0 },
        { label: 'Ensamblando', minutes: 1 },
        { label: 'Enviado', minutes: 3 },
        { label: 'Entregado', minutes: 6 }
    ];
    function orderStage(order) {
        const mins = (Date.now() - new Date(order.date).getTime()) / 60000;
        let idx = 0;
        STAGES.forEach((s, i) => { if (mins >= s.minutes) idx = i; });
        return idx;
    }
    function placeOrder(info) {
        const me = currentUser();
        const items = cart.get();
        if (!me || !items.length) return null;
        const q = quote(items, info.shipping);
        const ship = SHIPPING[info.shipping || 'standard'];
        const id = 'AK-' + Date.now().toString(36).slice(-5).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
        const now = new Date();
        const eta = new Date(now.getTime() + ship.days[1] * 86400000);
        const order = {
            id, email: me.email, date: now.toISOString(), eta: eta.toISOString(),
            items: items.map(i => Object.assign({}, i)),
            subtotal: q.subtotal, discount: q.discount, shipping: q.shipping, tax: q.tax, total: q.total, coupon: q.code,
            shippingMethod: info.shipping || 'standard',
            address: info.address,
            payment: info.payment // solo marca y últimos 4
        };
        const orders = read(K.orders, []);
        orders.unshift(order);
        write(K.orders, orders);
        cart.clear();
        removeCoupon();
        return order;
    }
    const getOrders = email => read(K.orders, []).filter(o => !email || o.email === email);

    /* ---------- equipos del usuario ---------- */
    function getDevices(email) {
        const list = [];
        getOrders(email).slice().reverse().forEach(o => {
            o.items.filter(isDevice).forEach((it, idx) => {
                const base = MODELS[it.name] || {};
                for (let n = 0; n < Number(it.quantity || 1); n++) {
                    list.push({
                        id: 'AK-' + hash(o.id + it.name + idx + n).slice(0, 4).toUpperCase() + '-' + o.id.slice(3),
                        model: it.name, category: it.category, acquired: o.date, source: 'pedido ' + o.id,
                        cpu: it.cpu || base.cpu || '', gpu: it.gpu || base.gpu || '',
                        ram: it.ram || base.ram || '', storage: it.storage || base.storage || ''
                    });
                }
            });
        });
        read(K.devices, []).filter(d => d.email === email).forEach(d => list.push(Object.assign({ source: 'registro manual' }, d)));
        return list.sort((a, b) => new Date(b.acquired) - new Date(a.acquired));
    }
    function addDevice(email, data) {
        const model = String(data.model || '');
        const serial = String(data.serial || '').trim().toUpperCase();
        if (!model) return { ok: false, error: 'Elige un modelo.' };
        if (!/^[A-Z0-9\-]{8,20}$/.test(serial)) return { ok: false, error: 'El número de serie debe tener entre 8 y 20 letras, números o guiones.' };
        const when = new Date(data.date);
        if (isNaN(when) || when > new Date()) return { ok: false, error: 'La fecha de compra no puede estar en el futuro.' };
        const all = read(K.devices, []);
        if (all.some(d => d.id === serial)) return { ok: false, error: 'Ese número de serie ya está registrado.' };
        const base = MODELS[model] || {};
        all.push({ email, id: serial, model, category: base.cat || 'Escritorio', acquired: when.toISOString(), cpu: base.cpu || '', gpu: base.gpu || '', ram: base.ram || '', storage: base.storage || '' });
        write(K.devices, all);
        return { ok: true };
    }
    function warranty(device) {
        const months = 24;
        const end = new Date(device.acquired);
        end.setMonth(end.getMonth() + months);
        const left = Math.max(0, Math.ceil((end - Date.now()) / (30.44 * 86400000)));
        return { end, left, total: months, active: end > Date.now() };
    }
    function battery(device) { // simulada: se desgasta con los días
        if (device.category === 'Escritorio') return null;
        const days = Math.max(0, Math.floor((Date.now() - new Date(device.acquired)) / 86400000));
        return { health: Math.max(70, 100 - Math.floor(days / 20)), cycles: Math.floor(days * 0.6) };
    }

    /* ---------- avisos de stock ---------- */
    const getNotify = () => read(K.notify, []);
    function toggleNotify(name) {
        const list = getNotify();
        const i = list.indexOf(name);
        if (i >= 0) list.splice(i, 1); else list.push(name);
        write(K.notify, list);
        return i < 0;
    }

    /* ---------- barra de navegación ---------- */
    function routeSearch(q) {
        const t = q.toLowerCase();
        const has = words => words.some(w => t.includes(w));
        let page = 'laptops.html';
        if (has(['ram', 'memoria', 'ssd', 'nvme', 'almacenamiento', 'usb', 'puerto', 'bater', 'módulo', 'modulo', 'componente'])) page = 'componentes.html';
        else if (has(['torre', 'tower', 'studio node', 'vision', 'escritorio', 'desktop'])) page = 'escritorio.html';
        else if (has(['personaliz', 'armar', 'config', 'ensambl'])) page = 'personalizacion.html';
        location.href = page === 'laptops.html' ? 'laptops.html?q=' + encodeURIComponent(q) : page;
    }
    function initNav() {
        const nav = document.querySelector('nav');
        if (!nav) return;
        // cuenta: avatar si hay sesión
        const me = currentUser();
        nav.querySelectorAll('a[href="inicio-sesion.html"]').forEach(a => {
            if (!a.querySelector('svg')) return;
            if (me) {
                a.href = 'dashboard.html';
                a.title = 'Mi cuenta (' + me.email + ')';
                a.innerHTML = '<span class="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs">' + esc(initials(me.name)) + '</span>';
            } else {
                a.title = 'Iniciar sesión';
            }
        });
        // buscador: solo los que no tienen lógica propia
        nav.querySelectorAll('input[placeholder^="Buscar"]').forEach(input => {
            if (input.id === 'site-search' || input.id === 'catalog-search' || input.dataset.akBound) return;
            input.dataset.akBound = '1';
            input.setAttribute('aria-label', 'Buscar productos');
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter' && input.value.trim()) routeSearch(input.value.trim());
            });
        });
        updateBadge();
    }

    window.AK = {
        K, read, write, esc, money, initials, safeNext, qs, validEmail, luhn, cardBrand,
        MODELS, CAT_LABEL, catLabel, isDevice, COUPONS, SHIPPING, STAGES, TAX_RATE,
        toast, modal, confirm: confirmBox,
        currentUser, register, login, socialLogin, logout, requireAuth, updateProfile, resetPassword, resetSimulation, getUsers,
        cart, updateBadge, quote, applyCoupon, removeCoupon, getCoupon,
        placeOrder, getOrders, orderStage,
        getDevices, addDevice, warranty, battery,
        getNotify, toggleNotify, initNav
    };

    document.addEventListener('DOMContentLoaded', initNav);
    window.addEventListener('storage', e => { if (e.key === K.cart) updateBadge(); });
})();

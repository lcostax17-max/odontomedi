/* ═══════════════════════════════════════════════════════
   OdontoMedi Center — app.js  (Supabase)
   ═══════════════════════════════════════════════════════ */
'use strict';

// ── SUPABASE CONFIG ───────────────────────────────────────
// ⚠️  Substitua pelos seus valores do painel Supabase:
//     Project Settings → API → Project URL e anon key
const SUPABASE_URL  = 'https://qvigrxtmlwgshuqpxmxm.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_b3jZBpIqU-FEBxxdpHE7rw_2CZ6K89L';
let supabaseClient;

// ── CONSTANTS ─────────────────────────────────────────────
const CATS = [
  { id: 'all',          label: 'Todos',           icon: '🏥' },
  { id: 'descartaveis', label: 'Descartáveis',    icon: '🧤' },
  { id: 'limpeza',      label: 'Limpeza',          icon: '🧴' },
  { id: 'equipamentos', label: 'Equipamentos',     icon: '🔬' },
  { id: 'odontologico', label: 'Odontológico',     icon: '🦷' },
  { id: 'hospitalar',   label: 'Hospitalar',       icon: '🏨' },
  { id: 'epi',          label: 'EPI',              icon: '🦺' },
  { id: 'penso',        label: 'Curativo / Penso', icon: '🩹' },
  { id: 'outros',       label: 'Outros',           icon: '📦' },
];
const CAT_MAP = Object.fromEntries(CATS.map(c => [c.id, c]));

const STATUS_LABELS = {
  pendente:   '⏳ Pendente',
  confirmado: '✅ Confirmado',
  enviado:    '🚚 Enviado',
  entregue:   '📦 Entregue',
  cancelado:  '❌ Cancelado',
};

const DEFAULT_CONFIG = {
  whatsapp:    '5574998067720',   // ← fallback: número sempre disponível
  phone:       '', email: '', site: '',
  company:     'OdontoMedi Center', razaoSocial: '', cnpj: '',
  ie:          '', im: '', segment: 'Varejo e Atacado',
  address:     '', logoBase64: '',
};

// ── CREDENCIAIS ADM (altere aqui para personalizar) ───────
// Para adicionar mais usuários, copie o padrão abaixo:
const ADM_USERS_DEFAULT = [
  { user: 'admin',      pass: 'odonto2024' },
  { user: 'odontomedi', pass: 'adm@2024'   },
];
// ─────────────────────────────────────────────────────────

// Carrega credenciais — localStorage como cache, Supabase como fonte verdadeira
function loadCredentials() {
  try {
    const saved = localStorage.getItem('om:admin:creds');
    return saved ? JSON.parse(saved) : ADM_USERS_DEFAULT;
  } catch(_) { return ADM_USERS_DEFAULT; }
}
function saveCredentials(creds) {
  // Salva localmente
  try { localStorage.setItem('om:admin:creds', JSON.stringify(creds)); } catch(_) {}
  // Salva no Supabase para sincronizar entre dispositivos
  if (supabaseClient) {
    supabaseClient.from('config')
      .upsert({ id: 'main', adminCreds: JSON.stringify(creds) }, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) console.warn('Erro ao salvar credenciais no Supabase:', error);
        else console.log('Credenciais salvas no Supabase');
      });
  }
}
// Carrega credenciais do Supabase ao iniciar
async function syncCredentialsFromSupabase() {
  try {
    const { data, error } = await supabaseClient
      .from('config').select('adminCreds').eq('id', 'main').single();
    if (!error && data?.adminCreds) {
      const creds = JSON.parse(data.adminCreds);
      localStorage.setItem('om:admin:creds', JSON.stringify(creds));
    }
  } catch(_) {}
}

// ── SAMPLE DATA (usada apenas na 1ª execução) ─────────────
const SAMPLE_PRODUCTS = [
  { name:'Luva Nitrílica S/ Pó G', category:'descartaveis', unit:'Cx c/ 100 un.', description:'Alta resistência e sensibilidade tátil. Ideal para procedimentos clínicos e laboratoriais. Livre de látex.', price:45.90, promoPrice:39.90, imageUrl:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=700&q=80', videoUrl:'', inStock:true,  featured:true,  createdAt:Date.now() },
  { name:'Máscara Cirúrgica Tripla', category:'epi', unit:'Cx c/ 50 un.', description:'Com clipe nasal anatômico e elástico confortável. Filtração tríplice camada. Aprovado ANVISA.', price:18.50, promoPrice:null, imageUrl:'https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?w=700&q=80', videoUrl:'', inStock:true,  featured:false, createdAt:Date.now() },
  { name:'Gaze Estéril 7,5×7,5 cm', category:'penso', unit:'Pct c/ 10 env.', description:'Não tecida, estéril, para curativos e procedimentos cirúrgicos e ambulatoriais.', price:12.00, promoPrice:null, imageUrl:'https://images.unsplash.com/photo-1583912267550-d974cbeaf8ae?w=700&q=80', videoUrl:'', inStock:true,  featured:false, createdAt:Date.now() },
  { name:'Seringa Descartável 5 ml', category:'descartaveis', unit:'Cx c/ 100 un.', description:'Com agulha, esterilização a raios gama. Alta precisão e segurança no procedimento.', price:28.00, promoPrice:22.00, imageUrl:'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=700&q=80', videoUrl:'', inStock:true,  featured:true,  createdAt:Date.now() },
  { name:'Álcool Gel 70% — 5 L', category:'limpeza', unit:'Galão 5L', description:'Bactericida e virucida. Formulação com hidratante. Aprovado pela ANVISA.', price:89.90, promoPrice:79.90, imageUrl:'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=700&q=80', videoUrl:'', inStock:true,  featured:true,  createdAt:Date.now() },
  { name:'Autoclave Vertical 21 L', category:'equipamentos', unit:'Unidade', description:'Esterilização por vapor saturado sob pressão. Painel digital com timer e alarme.', price:3800.00, promoPrice:null, imageUrl:'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=700&q=80', videoUrl:'', inStock:false, featured:false, createdAt:Date.now() },
  { name:'Esparadrapo Impermeável', category:'penso', unit:'Rolo 4,5m × 2,5cm', description:'Hipoalergênico, impermeável, com boa aderência à pele.', price:8.90, promoPrice:null, imageUrl:'https://images.unsplash.com/photo-1612349316228-5942a9b489c5?w=700&q=80', videoUrl:'', inStock:true,  featured:false, createdAt:Date.now() },
  { name:'Avental Descartável SMS', category:'epi', unit:'Unidade', description:'Manga longa, punho em tricô. Proteção contra fluidos biológicos. Grau cirúrgico.', price:3.50, promoPrice:2.90, imageUrl:'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=700&q=80', videoUrl:'', inStock:true,  featured:false, createdAt:Date.now() },
];

// ── SUPABASE CHANNELS (realtime) ──────────────────────────
let realtimeProducts, realtimeOrders, realtimeConfig;

// ── STATE ─────────────────────────────────────────────────
let products      = [];
let orders        = [];
let config        = { ...DEFAULT_CONFIG };
let cartItems     = [];
let manualItems   = [];
let currentView   = 'catalog';
let catFilter     = 'all';
let catalogSearch = '';
let adminSearch   = '';
let orderSearch   = '';
let selectedIds   = new Set();
let editingId     = null;
let editingOrderId = null;
let appReady      = false;
let isAdmin       = false;
let loggedUser    = '';           // usuário logado atual
let catalogPrintHTML = '';

// ── UTILS ─────────────────────────────────────────────────
const fmtBRL = v => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
const genId  = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const getCat = id => CAT_MAP[id] || CATS[0];

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function setField(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val != null ? val : '';
}
function showToast(msg, ms = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), ms);
}
function getEmbedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

// ── LOADING SCREEN ────────────────────────────────────────
function showLoadingScreen() {
  ['catalog','admin','orders','generator'].forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) el.innerHTML = `<div class="empty-state" style="padding:80px">
      <div class="empty-icon">🔄</div>
      <div class="empty-title">Conectando ao banco de dados...</div>
      <div class="empty-sub">Aguarde um momento</div>
    </div>`;
  });
}

// ══════════════════════════════════════════════════════════
// SUPABASE OPERATIONS
// ══════════════════════════════════════════════════════════

// Products
async function fbSaveProduct(data) {
  const { error } = await supabaseClient
    .from('products')
    .upsert(data, { onConflict: 'id' });
  if (error) throw error;
}
async function fbDeleteProduct(id) {
  const { error } = await supabaseClient
    .from('products')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Orders
async function fbSaveOrder(data) {
  const { error } = await supabaseClient
    .from('orders')
    .upsert(data, { onConflict: 'id' });
  if (error) throw error;
}
async function fbDeleteOrder(id) {
  const { error } = await supabaseClient
    .from('orders')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
async function fbUpdateOrderStatus(id, status) {
  const { error } = await supabaseClient
    .from('orders')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

// Config
async function fbSaveConfig() {
  // Envia apenas campos conhecidos — nunca logoBase64 (não existe no Supabase)
  const payload = {
    id:          'main',
    whatsapp:    config.whatsapp    || '',
    phone:       config.phone       || '',
    email:       config.email       || '',
    site:        config.site        || '',
    company:     config.company     || 'OdontoMedi Center',
    razaoSocial: config.razaoSocial || '',
    cnpj:        config.cnpj        || '',
    ie:          config.ie          || '',
    im:          config.im          || '',
    segment:     config.segment     || 'Varejo e Atacado',
    address:     config.address     || '',
  };
  const { data, error } = await supabaseClient
    .from('config')
    .upsert(payload, { onConflict: 'id' })
    .select();
  if (error) { console.error('fbSaveConfig error:', error); throw error; }
  console.log('Config salva no Supabase:', data);
}

// Seed sample data on first run
async function seedSampleData() {
  const rows = SAMPLE_PRODUCTS.map(p => ({ ...p, id: p.id || genId() }));
  const { error } = await supabaseClient.from('products').upsert(rows, { onConflict: 'id' });
  if (error) console.error('Seed error:', error);
}

// ══════════════════════════════════════════════════════════
// AUTENTICAÇÃO ADMINISTRATIVA
// ══════════════════════════════════════════════════════════
function checkAdminSession() {
  try {
    const saved = sessionStorage.getItem('om:admin');
    if (saved === 'true') {
      isAdmin    = true;
      loggedUser = sessionStorage.getItem('om:admin:user') || 'admin';
      applyAdminUI();
    }
  } catch(_) {}
}

function applyAdminUI() {
  // Mostra/oculta elementos conforme estado de login
  document.querySelectorAll('.adm-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
  const loginBtn = document.getElementById('btn-login');
  if (loginBtn) {
    loginBtn.title = isAdmin ? 'Logado como Administrador' : 'Área Administrativa';
    loginBtn.textContent = isAdmin ? '👤' : '🔒';
    if (isAdmin) loginBtn.classList.add('logged');
    else loginBtn.classList.remove('logged');
  }
  // Se saiu da sessão e estava em área protegida, volta ao catálogo
  if (!isAdmin && ['admin','orders','generator'].includes(currentView)) {
    switchView('catalog');
  }
}

function openLogin() {
  if (isAdmin) { openSettings(); return; } // já logado → abre configurações
  setField('login-user', '');
  setField('login-pass', '');
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('login-bg').classList.add('open');
  setTimeout(() => document.getElementById('login-user')?.focus(), 150);
}
function closeLogin()      { document.getElementById('login-bg').classList.remove('open'); }
function closeLoginIfBg(e) { if (e.target === document.getElementById('login-bg')) closeLogin(); }

function doLogin() {
  const user  = document.getElementById('login-user').value.trim();
  const pass  = document.getElementById('login-pass').value.trim();
  const creds = loadCredentials();
  const valid = creds.some(u => u.user === user && u.pass === pass);

  if (!valid) {
    document.getElementById('login-error').style.display = 'block';
    document.getElementById('login-pass').value = '';
    document.getElementById('login-pass').focus();
    return;
  }

  isAdmin    = true;
  loggedUser = user;
  try {
    sessionStorage.setItem('om:admin', 'true');
    sessionStorage.setItem('om:admin:user', user);
  } catch(_) {}
  applyAdminUI();
  closeLogin();
  showToast(`✅ Bem-vindo, ${user}!`);
  switchView('admin');
}

function adminLogout() {
  if (!confirm('Sair da área administrativa?')) return;
  isAdmin    = false;
  loggedUser = '';
  try { sessionStorage.removeItem('om:admin'); sessionStorage.removeItem('om:admin:user'); } catch(_) {}
  applyAdminUI();
  switchView('catalog');
  showToast('🔒 Sessão encerrada');
}

// ══════════════════════════════════════════════════════════
// CART
// ══════════════════════════════════════════════════════════
function addToCart(id, qty = 1) {
  const p = products.find(x => x.id === id);
  if (!p || !p.inStock) return;
  const ex = cartItems.find(x => x.product.id === id);
  if (ex) ex.qty += qty; else cartItems.push({ product: p, qty });
  updateCartBadge();
  showToast(`✓ ${p.name} adicionado ao pedido`);
}
function removeFromCart(id) {
  cartItems = cartItems.filter(x => x.product.id !== id);
  updateCartBadge(); renderCartSidebar();
}
function setCartQty(id, qty) {
  const item = cartItems.find(x => x.product.id === id);
  if (!item) return;
  if (qty <= 0) { removeFromCart(id); return; }
  item.qty = qty;
  updateCartBadge(); renderCartSidebar();
}
const cartTotal = () => cartItems.reduce((s, { product: p, qty }) => s + (p.promoPrice || p.price) * qty, 0);
const cartCount = () => cartItems.reduce((s, i) => s + i.qty, 0);

function updateCartBadge() {
  const n = cartCount();
  const b = document.getElementById('cart-badge');
  b.textContent = n;
  if (n > 0) b.classList.add('show'); else b.classList.remove('show');
}

function renderCartSidebar() {
  const body   = document.getElementById('cart-body');
  const footer = document.getElementById('cart-footer');
  if (!body) return;
  if (!cartItems.length) {
    body.innerHTML = `<div class="cart-empty"><div class="empty-icon">🛒</div><p style="font-weight:700;margin-bottom:4px">Nenhum item no pedido</p><p style="font-size:12px;color:var(--muted)">Adicione produtos do catálogo</p></div>`;
    footer.innerHTML = '';
    return;
  }
  body.innerHTML = cartItems.map(({ product: p, qty }) => {
    const price = p.promoPrice || p.price;
    const img = p.imageUrl
      ? `<img src="${escHtml(p.imageUrl)}" class="cart-item-img" onerror="this.style.display='none'">`
      : `<div class="cart-item-img" style="display:flex;align-items:center;justify-content:center;font-size:22px">${getCat(p.category).icon}</div>`;
    return `<div class="cart-item">${img}
      <div class="cart-item-info">
        <div class="cart-item-name">${escHtml(p.name)}</div>
        <div class="cart-item-price">${fmtBRL(price)} ${p.unit ? '· ' + escHtml(p.unit) : ''}</div>
        <div class="cart-item-qty">
          <button class="cart-qty-btn" onclick="setCartQty('${p.id}',${qty-1})">−</button>
          <span class="cart-qty-val">${qty}</span>
          <button class="cart-qty-btn" onclick="setCartQty('${p.id}',${qty+1})">+</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div class="cart-item-total">${fmtBRL(price * qty)}</div>
        <button class="cart-remove" onclick="removeFromCart('${p.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');

  const waIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
  footer.innerHTML = `
    <div class="cart-total-row">
      <span class="cart-total-label">Total do Pedido</span>
      <span class="cart-total-val">${fmtBRL(cartTotal())}</span>
    </div>
    <div class="cart-actions">
      <button class="btn-ghost" onclick="clearCart()">Limpar</button>
      <button class="btn-whatsapp" onclick="openCheckout()">${waIcon} Finalizar Pedido</button>
    </div>`;
}

function clearCart() {
  if (cartItems.length && !confirm('Limpar todos os itens?')) return;
  cartItems = []; updateCartBadge(); renderCartSidebar();
}
function openCart()  { renderCartSidebar(); document.getElementById('cart-overlay').classList.add('open'); }
function closeCart() { document.getElementById('cart-overlay').classList.remove('open'); }
function closeCartIfBg(e) { if (e.target === document.getElementById('cart-overlay')) closeCart(); }

// ══════════════════════════════════════════════════════════
// CHECKOUT / WHATSAPP
// ══════════════════════════════════════════════════════════
function openCheckout() {
  if (!cartItems.length) { showToast('⚠️ Adicione produtos antes de finalizar'); return; }
  closeCart();
  // Clear fields
  ['co-name','co-phone','co-cpf','co-company','co-notes'].forEach(id => setField(id, ''));
  const items = cartItems.map(({ product: p, qty }) => {
    const price = p.promoPrice || p.price;
    return `<div class="order-summary-item"><span>${escHtml(p.name)} × ${qty}</span><span>${fmtBRL(price * qty)}</span></div>`;
  }).join('');
  document.getElementById('co-summary').innerHTML =
    `<div class="order-summary-title">Resumo do Pedido</div>${items}<div class="order-summary-total"><span>Total</span><span>${fmtBRL(cartTotal())}</span></div>`;
  document.getElementById('checkout-bg').classList.add('open');
}
function closeCheckout() { document.getElementById('checkout-bg').classList.remove('open'); }
function closeCheckoutIfBg(e) { if (e.target === document.getElementById('checkout-bg')) closeCheckout(); }

async function sendWhatsApp() {
  try {
    const name    = (document.getElementById('co-name')?.value    || '').trim();
    const phone   = (document.getElementById('co-phone')?.value   || '').trim();
    const cpf     = (document.getElementById('co-cpf')?.value     || '').trim();
    const company = (document.getElementById('co-company')?.value || '').trim();
    const notes   = (document.getElementById('co-notes')?.value   || '').trim();

    if (!name)  { showToast('⚠️ Informe seu nome');     return; }
    if (!phone) { showToast('⚠️ Informe seu telefone'); return; }
    if (!cpf || cpf.replace(/\D/g,'').length < 11) {
      showToast('⚠️ Informe um CPF válido (11 dígitos)'); return;
    }
    if (!config.whatsapp) {
      showToast('Entre em contato pelo telefone da loja para finalizar seu pedido.');
      return;
    }

    const companyName = config.company || 'OdontoMedi Center';
    const snapshot    = [...cartItems];
    const total       = cartTotal();

    // Monta a mensagem (tudo síncrono, sem await)
    const linhas = [];
    linhas.push(`*Pedido — ${companyName}*`);
    linhas.push('');
    linhas.push(`*Nome:* ${name}`);
    linhas.push(`*CPF:* ${cpf}`);
    linhas.push(`*Telefone:* ${phone}`);
    if (company) linhas.push(`*Empresa:* ${company}`);
    linhas.push('');
    linhas.push(`*Itens do Pedido:*`);
    snapshot.forEach(({ product: p, qty }) => {
      const price = p.promoPrice || p.price;
      linhas.push(`• ${p.name}${p.unit ? ' (' + p.unit + ')' : ''}`);
      linhas.push(`  ${qty}x ${fmtBRL(price)} = *${fmtBRL(price * qty)}*`);
    });
    linhas.push('');
    linhas.push(`*Total: ${fmtBRL(total)}*`);
    if (notes) { linhas.push(''); linhas.push(`*Observacoes:* ${notes}`); }

    const mensagem = linhas.join('\n');
    const waUrl    = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(mensagem)}`;

    // Abre WhatsApp SINCRONAMENTE (sem nenhum await antes = não bloqueado)
    window.open(waUrl, '_blank');

    // Limpa carrinho e fecha modal
    cartItems = [];
    updateCartBadge();
    closeCheckout();
    showToast('Abrindo WhatsApp...');

    // Salva pedido no Supabase em background
    const order = {
      id: genId(), date: new Date().toISOString(),
      customer: { name, phone, cpf, company }, notes,
      status: 'pendente', origin: 'whatsapp',
      items: snapshot.map(({ product: p, qty }) => ({
        productId: p.id, name: p.name, category: p.category,
        unit: p.unit, price: p.promoPrice || p.price, qty,
        total: (p.promoPrice || p.price) * qty,
      })),
      total,
    };
    fbSaveOrder(order)
      .then(() => {
        // Dá baixa no estoque de cada produto pedido (se tiver controle ativo)
        snapshot.forEach(({ product: p, qty }) => {
          if (p.currentStock != null && p.currentStock > 0) {
            const novoEstoque = Math.max(0, p.currentStock - qty);
            const updateData  = { currentStock: novoEstoque };
            // Se zerou, marca como fora de estoque
            if (novoEstoque === 0) updateData.inStock = false;
            supabaseClient.from('products')
              .update(updateData)
              .eq('id', p.id)
              .then(({ error }) => { if (error) console.warn('Erro baixa estoque:', error); });
          }
        });
      })
      .catch(e => console.warn('Erro ao salvar pedido:', e));

  } catch(e) {
    console.error('sendWhatsApp error:', e);
    showToast('Erro inesperado: ' + e.message);
  }
}

// ══════════════════════════════════════════════════════════
// VIEW SWITCHING
// ══════════════════════════════════════════════════════════
function switchView(v) {
  // Protege áreas administrativas
  if (['admin','orders','generator'].includes(v) && !isAdmin) {
    openLogin();
    return;
  }
  currentView = v;
  ['catalog','admin','orders','generator'].forEach(x => {
    document.getElementById('view-' + x).style.display = x === v ? 'block' : 'none';
    const btn = document.getElementById('nb-' + x);
    if (btn) btn.className = 'nav-btn adm-only' + (x === v ? ' active' : '');
  });
  // Garante que nb-catalog não tenha classe adm-only
  const nbCat = document.getElementById('nb-catalog');
  if (nbCat) nbCat.className = 'nav-btn' + (v === 'catalog' ? ' active' : '');
  renderAll();
}
function renderAll() {
  renderCatalog(); renderAdmin(); renderOrders(); renderGenerator();
}

// ══════════════════════════════════════════════════════════
// CATALOG VIEW
// ══════════════════════════════════════════════════════════
function renderCatalog() {
  const el = document.getElementById('view-catalog');
  const filtered = products.filter(p => {
    const mc = catFilter === 'all' || p.category === catFilter;
    const ms = !catalogSearch
      || p.name.toLowerCase().includes(catalogSearch.toLowerCase())
      || (p.description||'').toLowerCase().includes(catalogSearch.toLowerCase());
    return mc && ms;
  });
  const pills = CATS.map(c =>
    `<button class="cat-pill${catFilter===c.id?' active':''}" onclick="setCat('${c.id}')">${c.icon} ${c.label}</button>`
  ).join('');
  const cards = filtered.length === 0
    ? `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><div class="empty-title">Nenhum produto encontrado</div></div>`
    : filtered.map(buildProdCard).join('');
  el.innerHTML = `
    <div class="section-header">
      <div><h1 class="section-title">Catálogo de Produtos</h1>
        <p class="section-sub">${products.length} produto${products.length!==1?'s':''} · ${escHtml(config.segment||'Distribuidora Hospitalar')}</p></div>
      <div class="search-bar"><span class="search-icon">🔍</span>
        <input value="${escHtml(catalogSearch)}" oninput="catalogSearch=this.value;renderCatalog()" placeholder="Buscar produtos..."></div>
    </div>
    <div class="cat-pills">${pills}</div>
    <div class="prod-grid">${cards}</div>`;
}
// Helper: collect all images of a product in order
function getAllImages(p) {
  return [p.imageUrl, ...(p.imageUrls || [])].filter(Boolean);
}

function buildProdCard(p) {
  const cat     = getCat(p.category);
  const allImgs = getAllImages(p);
  const mainImg = allImgs[0] || '';

  const img = mainImg
    ? `<img src="${escHtml(mainImg)}" class="prod-img" alt="${escHtml(p.name)}"
            onclick="openDetail('${p.id}')" style="cursor:pointer"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const ph = `<div class="prod-img-ph" style="${mainImg?'display:none':''};cursor:pointer"
                   onclick="openDetail('${p.id}')">${cat.icon}</div>`;

  const priceHtml = p.promoPrice
    ? `<div class="prod-price"><span class="price-old">${fmtBRL(p.price)}</span><span class="price-promo">${fmtBRL(p.promoPrice)}</span></div>`
    : `<div class="prod-price"><span class="price-main">${fmtBRL(p.price)}</span></div>`;

  const badges = [
    p.promoPrice ? `<span class="badge badge-promo">🔥 PROMOÇÃO</span>` : '',
    p.inStock
      ? (p.currentStock != null && p.minStock != null && p.currentStock <= p.minStock && p.currentStock > 0
          ? `<span class="badge badge-lowstock">⚠️ Últimas unidades</span>`
          : `<span class="badge badge-stock-y">✓ Em Estoque</span>`)
      : `<span class="badge badge-stock-n">✗ Indisponível</span>`,
  ].filter(Boolean).join('');

  return `<div class="prod-card">
    ${p.featured ? `<div class="featured-ribbon">★ DESTAQUE</div>` : ''}
    ${img}${ph}
    <div class="prod-body">
      <div class="prod-name" style="cursor:pointer" onclick="openDetail('${p.id}')">${escHtml(p.name)}</div>
      ${p.unit ? `<div class="prod-unit">📦 ${escHtml(p.unit)}</div>` : ''}
      <div class="prod-desc">${escHtml(p.description||'')}</div>
      ${priceHtml}
      <div class="prod-badges">${badges}</div>
      <div class="prod-actions">
        <button class="btn-detail" onclick="openDetail('${p.id}')">🔍 Ver Detalhes</button>
        <button class="btn-add-cart" onclick="addToCart('${p.id}')" ${!p.inStock?'disabled':''}>
          ${p.inStock ? '🛒 Adicionar' : 'Indisponível'}
        </button>
      </div>
    </div>
  </div>`;
}
function setCat(id) { catFilter = id; renderCatalog(); }

// ══════════════════════════════════════════════════════════
// PRODUCT DETAIL MODAL
// ══════════════════════════════════════════════════════════
function openDetail(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const cat      = getCat(p.category);
  const allImgs  = getAllImages(p);
  const embedUrl = getEmbedUrl(p.videoUrl);

  document.getElementById('detail-header-label').textContent = escHtml(p.name);

  // Build media section: gallery or video
  let mediaHtml = '';
  if (embedUrl) {
    mediaHtml = `<iframe class="detail-video" src="${escHtml(embedUrl)}" allowfullscreen></iframe>`;
    if (allImgs.length > 0) {
      mediaHtml += `<img src="${escHtml(allImgs[0])}" class="gallery-main" style="height:180px" onerror="this.style.display='none'">`;
    }
  } else if (allImgs.length > 1) {
    // Gallery with thumbnails
    mediaHtml = `
      <img id="gallery-main-img" src="${escHtml(allImgs[0])}" class="gallery-main"
           alt="${escHtml(p.name)}" onerror="this.style.display='none'">
      <div class="gallery-thumbs">
        ${allImgs.map((url, i) => `
          <img src="${escHtml(url)}" class="gallery-thumb ${i===0?'active':''}"
               onclick="switchGalleryImg(this,'${escHtml(url)}')"
               onerror="this.style.display='none'">`).join('')}
      </div>`;
  } else if (allImgs.length === 1) {
    mediaHtml = `<img src="${escHtml(allImgs[0])}" class="gallery-main"
                      alt="${escHtml(p.name)}" onerror="this.outerHTML='<div class=gallery-main-ph>${cat.icon}</div>'">`;
  } else {
    mediaHtml = `<div class="gallery-main-ph">${cat.icon}</div>`;
  }

  const priceBlock = p.promoPrice
    ? `<div class="detail-price-block">
         <div class="detail-price-label">Preço Promocional</div>
         <div><span class="detail-price-old">${fmtBRL(p.price)}</span></div>
         <div class="detail-price-promo">${fmtBRL(p.promoPrice)}</div>
         <span class="badge badge-promo" style="margin-top:6px;display:inline-block">🔥 PROMOÇÃO ATIVA</span>
       </div>`
    : `<div class="detail-price-block">
         <div class="detail-price-label">Preço</div>
         <div class="detail-price-main">${fmtBRL(p.price)}</div>
       </div>`;

  document.getElementById('detail-body').innerHTML = `
    <div class="detail-layout">
      <div class="detail-media">${mediaHtml}</div>
      <div class="detail-info">
        <div class="detail-name">${escHtml(p.name)}</div>
        ${p.unit ? `<div class="detail-unit">📦 ${escHtml(p.unit)}</div>` : ''}
        ${p.description ? `<div class="detail-desc">${escHtml(p.description)}</div>` : ''}
        ${priceBlock}
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${p.inStock ? '<span class="badge badge-stock-y">✓ Em Estoque</span>' : '<span class="badge badge-stock-n">✗ Indisponível</span>'}
          ${p.featured ? '<span class="badge badge-featured">★ Destaque</span>' : ''}
        </div>
        ${p.inStock ? `
        <div class="detail-qty-row">
          <div class="qty-ctrl">
            <button class="qty-btn" onclick="detailQtyChange(-1)">−</button>
            <input class="qty-val" id="detail-qty" type="number" value="1" min="1">
            <button class="qty-btn" onclick="detailQtyChange(1)">+</button>
          </div>
          <button class="btn-add-cart-lg" onclick="addToCartFromDetail('${p.id}')">🛒 Adicionar ao Pedido</button>
        </div>` : ''}
      </div>
    </div>`;

  document.getElementById('detail-bg').classList.add('open');
}

function switchGalleryImg(thumb, url) {
  document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
  const main = document.getElementById('gallery-main-img');
  if (main) main.src = url;
}
function detailQtyChange(d) {
  const inp = document.getElementById('detail-qty');
  if (inp) inp.value = Math.max(1, parseInt(inp.value||1) + d);
}
function addToCartFromDetail(id) {
  addToCart(id, Math.max(1, parseInt(document.getElementById('detail-qty')?.value||1)));
  closeDetail();
}
function closeDetail() { document.getElementById('detail-bg').classList.remove('open'); }
function closeDetailIfBg(e) { if (e.target === document.getElementById('detail-bg')) closeDetail(); }

// ══════════════════════════════════════════════════════════
// ADMIN VIEW
// ══════════════════════════════════════════════════════════
function renderAdmin() {
  const el = document.getElementById('view-admin');
  if (!isAdmin) {
    el.innerHTML = `<div class="access-blocked"><div class="lock-icon">🔒</div><h2>Acesso Restrito</h2><p>Esta área é exclusiva para administradores.</p><br><button class="btn-primary" onclick="openLogin()">🔑 Fazer Login</button></div>`;
    return;
  }
  const f  = products.filter(p =>
    !adminSearch || p.name.toLowerCase().includes(adminSearch.toLowerCase())
    || (p.description||'').toLowerCase().includes(adminSearch.toLowerCase())
  );
  const rows = f.map(p => {
    const cat = getCat(p.category);
    const th  = p.imageUrl
      ? `<img src="${escHtml(p.imageUrl)}" class="admin-thumb" onerror="this.outerHTML='<div class=admin-thumb-ph>${cat.icon}</div>'">`
      : `<div class="admin-thumb-ph">${cat.icon}</div>`;

    const hasStock  = p.currentStock != null;
    const hasMin    = p.minStock != null && p.minStock > 0;
    const isLow     = hasStock && hasMin && p.currentStock <= p.minStock;
    const isEmpty   = hasStock && p.currentStock === 0;
    const stockCell = hasStock
      ? `<div style="font-weight:700;color:${isEmpty?'#dc2626':isLow?'#d97706':'#16a34a'};font-size:13px">
           ${isEmpty?'⛔':''}${isLow&&!isEmpty?'⚠️':''} ${p.currentStock}
           ${hasMin ? `<span style="font-size:10px;color:var(--muted);font-weight:400">/ mín ${p.minStock}</span>` : ''}
         </div>`
      : '<span style="color:var(--muted)">—</span>';

    return `<tr style="${isLow?'background:#fffbeb':''}">
      <td>${th}</td>
      <td><div class="prod-name-cell">${escHtml(p.name)}</div>${p.unit?`<div class="prod-unit-cell">${escHtml(p.unit)}</div>`:''}</td>
      <td>${cat.icon} ${cat.label}</td>
      <td style="font-weight:700">${fmtBRL(p.price)}</td>
      <td>${p.promoPrice?`<span style="color:var(--danger);font-weight:700">${fmtBRL(p.promoPrice)}</span>`:'<span style="color:var(--muted)">—</span>'}</td>
      <td>${stockCell}</td>
      <td>${p.inStock?'<span class="badge badge-stock-y">✓</span>':'<span class="badge badge-stock-n">✗</span>'}</td>
      <td>${p.featured?'<span class="badge badge-featured">★</span>':'—'}</td>
      <td><div class="table-actions">
        <button class="btn-ghost" style="padding:6px 12px;font-size:12px" onclick="openEdit('${p.id}')">✏️ Editar</button>
        <button class="btn-danger" onclick="deleteProduct('${p.id}')">🗑️</button>
      </div></td>
    </tr>`;
  }).join('');
  el.innerHTML = `
    <div class="section-header">
      <div><h1 class="section-title">Gerenciar Produtos</h1><p class="section-sub">Dados salvos no Firebase · ${products.length} produtos</p></div>
      <div class="section-actions">
        <button class="btn-excel-import" onclick="document.getElementById('excel-import-input').click()">📥 Importar Excel</button>
        <button class="btn-excel" onclick="downloadTemplate()">📋 Modelo Excel</button>
        <button class="btn-excel" onclick="exportProducts()">📤 Exportar Excel</button>
        <button class="btn-yellow" onclick="openNew()">+ Novo Produto</button>
      </div>
    </div>
    <div class="toolbar">
      <div class="search-bar" style="max-width:290px"><span class="search-icon">🔍</span>
        <input value="${escHtml(adminSearch)}" oninput="adminSearch=this.value;renderAdmin()" placeholder="Buscar produto..."></div>
      <div class="stat-pill">📦 <strong>${products.length}</strong> produtos</div>
      <div class="stat-pill">✓ <strong>${products.filter(p=>p.inStock).length}</strong> em estoque</div>
      <div class="stat-pill">🔥 <strong>${products.filter(p=>p.promoPrice).length}</strong> em promoção</div>
      ${(() => {
        const lowStock = products.filter(p => p.currentStock != null && p.minStock != null && p.currentStock <= p.minStock);
        return lowStock.length ? `<div class="stat-pill" style="background:#faf5e4;border-color:#fde68a">⚠️ <strong style="color:#7a4f0e">${lowStock.length}</strong> <span style="color:#92400e">estoque baixo</span></div>` : '';
      })()}
    </div>
    <div class="card" style="overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th style="width:58px">Img</th><th>Nome</th><th>Categoria</th><th>Preço</th><th>Promoção</th><th>Qtd Estoque</th><th>Ativo</th><th>★</th><th>Ações</th></tr></thead>
        <tbody>${rows||`<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">Nenhum produto</div></div></td></tr>`}</tbody>
      </table>
    </div>`;
}

async function deleteProduct(id) {
  if (!confirm('Excluir este produto permanentemente?')) return;
  try {
    await fbDeleteProduct(id);
    showToast('🗑️ Produto excluído');
  } catch(e) { showToast('❌ Erro: ' + e.message); }
}

// ══════════════════════════════════════════════════════════
// ORDERS VIEW
// ══════════════════════════════════════════════════════════
function renderOrders() {
  const el = document.getElementById('view-orders');
  if (!isAdmin) {
    el.innerHTML = `<div class="access-blocked"><div class="lock-icon">🔒</div><h2>Acesso Restrito</h2><p>Esta área é exclusiva para administradores.</p><br><button class="btn-primary" onclick="openLogin()">🔑 Fazer Login</button></div>`;
    return;
  }
  const filtered = orders.filter(o =>
    !orderSearch
    || o.customer.name.toLowerCase().includes(orderSearch.toLowerCase())
    || o.id.includes(orderSearch)
    || (o.customer.company||'').toLowerCase().includes(orderSearch.toLowerCase())
  );
  const total   = orders.reduce((s,o) => s + o.total, 0);
  const pending = orders.filter(o => o.status === 'pendente').length;

  const cards = filtered.length === 0
    ? `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">Nenhum pedido encontrado</div><div class="empty-sub">Pedidos via carrinho ou cadastrados manualmente aparecerão aqui</div></div>`
    : filtered.map(o => {
        const dateStr = new Date(o.date).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
        return `<div class="order-card">
          <div class="order-card-header">
            <span class="order-id">#${o.id.slice(-8).toUpperCase()}</span>
            <span class="status-pill status-${o.status||'pendente'}">${STATUS_LABELS[o.status]||o.status}</span>
            <span class="order-date">${dateStr}</span>
            <span style="margin-left:auto;display:flex;gap:6px">
              <button class="btn-ghost" style="padding:5px 10px;font-size:11px" onclick="openEditOrder('${o.id}')">✏️ Editar</button>
              <button class="btn-danger" onclick="deleteOrder('${o.id}')">🗑️</button>
            </span>
          </div>
          <div class="order-customer">👤 ${escHtml(o.customer.name)}${o.customer.cpf?' · 🪪 '+escHtml(o.customer.cpf):''}${o.customer.company?' · '+escHtml(o.customer.company):''}${o.customer.phone?' · '+escHtml(o.customer.phone):''}</div>
          <div class="order-items-list">${o.items.map(i=>`<span>• ${escHtml(i.name)} × ${i.qty} — ${fmtBRL(i.total)}</span>`).join('')}</div>
          ${o.notes?`<div style="font-size:12px;color:var(--muted);margin-top:4px">📝 ${escHtml(o.notes)}</div>`:''}
          <div class="order-footer-row">
            <select onchange="updateOrderStatus('${o.id}',this.value)" style="width:auto;padding:5px 10px;font-size:12px">
              ${Object.entries(STATUS_LABELS).map(([k,v])=>`<option value="${k}" ${o.status===k?'selected':''}>${v}</option>`).join('')}
            </select>
            <div class="order-total">${fmtBRL(o.total)}</div>
          </div>
        </div>`;
      }).join('');

  el.innerHTML = `
    <div class="section-header">
      <div><h1 class="section-title">Pedidos</h1><p class="section-sub">${orders.length} pedido${orders.length!==1?'s':''} · sincronizados na nuvem</p></div>
      <div class="section-actions">
        <button class="btn-excel" onclick="exportOrders()">📤 Exportar Excel</button>
        <button class="btn-yellow" onclick="openManualOrder()">+ Lançar Pedido</button>
      </div>
    </div>
    <div class="toolbar">
      <div class="search-bar" style="max-width:300px"><span class="search-icon">🔍</span>
        <input value="${escHtml(orderSearch)}" oninput="orderSearch=this.value;renderOrders()" placeholder="Buscar por cliente..."></div>
      <div class="stat-pill">📋 <strong>${orders.length}</strong> pedidos</div>
      <div class="stat-pill">⏳ <strong>${pending}</strong> pendentes</div>
      <div class="stat-pill">💰 Total: <strong>${fmtBRL(total)}</strong></div>
    </div>
    ${cards}`;
}

async function updateOrderStatus(id, status) {
  try {
    await fbUpdateOrderStatus(id, status);
    showToast('✅ Status atualizado');
  } catch(e) { showToast('❌ Erro: ' + e.message); }
}

async function deleteOrder(id) {
  if (!confirm('Excluir este pedido?')) return;
  try {
    await fbDeleteOrder(id);
    showToast('🗑️ Pedido excluído');
  } catch(e) { showToast('❌ Erro: ' + e.message); }
}

// ── MANUAL ORDER ──────────────────────────────────────────
let moItems = [];

function openManualOrder() {
  editingOrderId = null; moItems = [];
  document.getElementById('manual-title').textContent = '📝 Lançar Pedido Manual';
  setField('mo-id',''); setField('mo-name',''); setField('mo-phone','');
  setField('mo-company',''); setField('mo-notes',''); setField('mo-status','pendente');
  populateProductSelect(); renderManualItems();
  document.getElementById('manual-bg').classList.add('open');
}
function openEditOrder(id) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  editingOrderId = id;
  moItems = o.items.map(i => {
    const p = products.find(x => x.id === i.productId) || { id:i.productId, name:i.name, category:'outros', unit:i.unit, price:i.price, promoPrice:null, imageUrl:'', inStock:true };
    return { product:p, qty:i.qty };
  });
  document.getElementById('manual-title').textContent = '✏️ Editar Pedido';
  setField('mo-id', o.id); setField('mo-name', o.customer.name);
  setField('mo-phone', o.customer.phone||''); setField('mo-company', o.customer.company||'');
  setField('mo-notes', o.notes||''); setField('mo-status', o.status||'pendente');
  populateProductSelect(); renderManualItems();
  document.getElementById('manual-bg').classList.add('open');
}
function populateProductSelect() {
  const sel = document.getElementById('mo-prod-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecione um produto...</option>'
    + products.map(p => `<option value="${p.id}">${p.name}${p.unit?' — '+p.unit:''} (${fmtBRL(p.promoPrice||p.price)})</option>`).join('');
}
function addManualItem() {
  const sel = document.getElementById('mo-prod-select');
  const qtyI = document.getElementById('mo-qty-input');
  if (!sel?.value) { showToast('⚠️ Selecione um produto'); return; }
  const p = products.find(x => x.id === sel.value);
  if (!p) return;
  const qty = Math.max(1, parseInt(qtyI?.value||1));
  const ex = moItems.find(x => x.product.id === p.id);
  if (ex) ex.qty += qty; else moItems.push({ product:p, qty });
  sel.value = ''; if (qtyI) qtyI.value = 1;
  renderManualItems();
}
function removeMoItem(id) { moItems = moItems.filter(x => x.product.id !== id); renderManualItems(); }
function renderManualItems() {
  const list = document.getElementById('mo-items-list');
  const box  = document.getElementById('mo-total-box');
  if (!list) return;
  if (!moItems.length) { list.innerHTML = `<div style="color:var(--muted);font-size:12px;padding:8px">Nenhum item adicionado</div>`; box.innerHTML=''; return; }
  list.innerHTML = moItems.map(({ product:p, qty }) => {
    const price = p.promoPrice||p.price;
    return `<div class="mo-item-row">
      <span class="mo-item-name">${escHtml(p.name)}</span>
      <span class="mo-item-price">${p.unit?escHtml(p.unit)+' · ':''}${fmtBRL(price)}</span>
      <span class="mo-item-qty">×${qty}</span>
      <span style="font-weight:800;color:var(--navy)">${fmtBRL(price*qty)}</span>
      <button onclick="removeMoItem('${p.id}')" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:14px;padding:2px 6px">🗑️</button>
    </div>`;
  }).join('');
  const total = moItems.reduce((s,{product:p,qty}) => s+(p.promoPrice||p.price)*qty, 0);
  box.innerHTML = `<div class="order-summary-total"><span>Total do Pedido</span><span>${fmtBRL(total)}</span></div>`;
}

async function saveManualOrder() {
  const name = document.getElementById('mo-name').value.trim();
  if (!name)          { showToast('⚠️ Informe o nome do cliente'); return; }
  if (!moItems.length){ showToast('⚠️ Adicione pelo menos um produto'); return; }
  const total = moItems.reduce((s,{product:p,qty}) => s+(p.promoPrice||p.price)*qty, 0);
  const data = {
    id: document.getElementById('mo-id').value || genId(),
    date: new Date().toISOString(),
    status: document.getElementById('mo-status').value,
    origin: 'manual',
    customer: { name, phone: document.getElementById('mo-phone').value.trim(), company: document.getElementById('mo-company').value.trim() },
    notes: document.getElementById('mo-notes').value.trim(),
    items: moItems.map(({product:p,qty}) => ({ productId:p.id, name:p.name, category:p.category, unit:p.unit, price:p.promoPrice||p.price, qty, total:(p.promoPrice||p.price)*qty })),
    total,
  };
  try {
    await fbSaveOrder(data);
    showToast(editingOrderId ? '✅ Pedido atualizado' : '✅ Pedido lançado!');
    closeManual();
  } catch(e) { showToast('❌ Erro: ' + e.message); }
}
function closeManual()       { document.getElementById('manual-bg').classList.remove('open'); }
function closeManualIfBg(e)  { if (e.target === document.getElementById('manual-bg')) closeManual(); }

// ══════════════════════════════════════════════════════════
// GENERATOR VIEW
// ══════════════════════════════════════════════════════════
function renderGenerator() {
  const el = document.getElementById('view-generator');
  if (!isAdmin) {
    el.innerHTML = `<div class="access-blocked"><div class="lock-icon">🔒</div><h2>Acesso Restrito</h2><p>Esta área é exclusiva para administradores.</p><br><button class="btn-primary" onclick="openLogin()">🔑 Fazer Login</button></div>`;
    return;
  }
  const selCount = [...selectedIds].filter(id => products.find(p => p.id === id)).length;
  const allSel   = products.length > 0 && selCount === products.length;
  const bycat    = {};
  products.forEach(p => { if (!bycat[p.category]) bycat[p.category]=[]; bycat[p.category].push(p); });
  const sections = Object.entries(bycat).map(([catId, prods]) => {
    const c = getCat(catId);
    const items = prods.map(p => {
      const sel = selectedIds.has(p.id);
      return `<div class="gen-item${sel?' sel':''}" onclick="toggleSel('${p.id}')">
        <input type="checkbox" ${sel?'checked':''} onclick="event.stopPropagation();toggleSel('${p.id}')">
        <div class="gen-thumb">${p.imageUrl?`<img src="${escHtml(p.imageUrl)}" onerror="this.parentNode.textContent='${c.icon}'">`:`${c.icon}`}</div>
        <div class="gen-info"><div class="gen-name">${escHtml(p.name)}</div><div class="gen-price">${p.promoPrice?fmtBRL(p.promoPrice)+' 🔥':fmtBRL(p.price)}${p.unit?' · '+escHtml(p.unit):''}</div></div>
        ${p.featured?`<span class="badge badge-featured" style="flex-shrink:0">★</span>`:''}
      </div>`;
    }).join('');
    return `<div style="margin-bottom:22px"><div class="gen-cat-label">${c.icon} ${c.label}</div><div class="gen-grid">${items}</div></div>`;
  }).join('');
  el.innerHTML = `
    <div class="section-header">
      <div><h1 class="section-title">Gerar Catálogo PDF</h1><p class="section-sub">Selecione os produtos para o catálogo de impressão</p></div>
      <div class="section-actions">
        <button class="btn-ghost" onclick="toggleAll()">${allSel?'✗ Desmarcar Todos':'✓ Selecionar Todos'}</button>
        <button class="btn-yellow" onclick="generatePreview()" ${selCount===0?'disabled':''}>📄 Gerar Catálogo (${selCount})</button>
      </div>
    </div>
    ${!products.length ? `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">Nenhum produto cadastrado</div></div>` : `<div class="card" style="padding:20px 24px">${sections}</div>`}`;
}
function toggleSel(id) { if(selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id); renderGenerator(); }
function toggleAll()   { const a=products.every(p=>selectedIds.has(p.id)); if(a) products.forEach(p=>selectedIds.delete(p.id)); else products.forEach(p=>selectedIds.add(p.id)); renderGenerator(); }

// ══════════════════════════════════════════════════════════
// EXCEL IMPORT / EXPORT
// ══════════════════════════════════════════════════════════
function exportProducts() {
  if (!window.XLSX) { alert('Biblioteca Excel não carregada.'); return; }
  const data = products.map(p => ({
    'Nome': p.name, 'Categoria': getCat(p.category).label, 'Categoria_ID': p.category,
    'Unidade_Embalagem': p.unit||'', 'Descricao': p.description||'',
    'Preco': p.price, 'Preco_Promocional': p.promoPrice||'',
    'Em_Estoque': p.inStock?'Sim':'Não', 'Destaque': p.featured?'Sim':'Não',
    'URL_Imagem': p.imageUrl||'', 'URL_Video': p.videoUrl||'',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [40,20,20,25,60,12,15,12,12,60,60].map(w=>({wch:w}));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
  XLSX.writeFile(wb, `OdontoMedi_Produtos_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.xlsx`);
  showToast('✅ Planilha exportada!');
}
function downloadTemplate() {
  if (!window.XLSX) return;
  const cab = [['Categorias válidas para Categoria_ID:','descartaveis | limpeza | equipamentos | odontologico | hospitalar | epi | penso | outros'],['Em_Estoque e Destaque:','Sim ou Não'],['']];
  const tmpl = [{ Nome:'Luva Nitrílica G (EXEMPLO)', Categoria_ID:'descartaveis', Unidade_Embalagem:'Cx c/ 100 un.', Descricao:'Descrição do produto', Preco:45.90, Preco_Promocional:39.90, Em_Estoque:'Sim', Destaque:'Sim', URL_Imagem:'https://...', URL_Video:'' }];
  const ws = XLSX.utils.aoa_to_sheet(cab);
  XLSX.utils.sheet_add_json(ws, tmpl, { origin:'A4' });
  ws['!cols'] = [40,20,25,60,12,15,12,12,50,50].map(w=>({wch:w}));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
  XLSX.writeFile(wb, 'OdontoMedi_Modelo_Importacao.xlsx');
  showToast('📋 Modelo baixado!');
}
async function handleExcelImport(event) {
  const file = event.target.files[0];
  if (!file || !window.XLSX) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const wb   = XLSX.read(e.target.result, { type:'binary' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval:'' });
      const validIds = new Set(CATS.slice(1).map(c=>c.id));
      const lblToId  = Object.fromEntries(CATS.slice(1).map(c=>[c.label.toLowerCase(),c.id]));
      const batch = [];
      rows.forEach(row => {
        const name  = String(row['Nome']||'').trim();
        const price = parseFloat(String(row['Preco']||'').replace(',','.'));
        if (!name || !price || price <= 0) return;
        const catRaw = String(row['Categoria_ID']||row['Categoria']||'').trim().toLowerCase();
        const cat    = validIds.has(catRaw) ? catRaw : (lblToId[catRaw]||'outros');
        const promo  = parseFloat(String(row['Preco_Promocional']||'').replace(',','.'));
        batch.push({ id: genId(), name, category:cat, unit:String(row['Unidade_Embalagem']||'').trim(), description:String(row['Descricao']||'').trim(), price, promoPrice:(!isNaN(promo)&&promo>0)?promo:null, imageUrl:String(row['URL_Imagem']||'').trim(), videoUrl:String(row['URL_Video']||'').trim(), inStock:String(row['Em_Estoque']||'Sim').toLowerCase()!=='não', featured:String(row['Destaque']||'').toLowerCase()==='sim', createdAt:Date.now() });
      });
      if (!batch.length) { showToast('⚠️ Nenhum produto válido encontrado'); return; }
      const { error } = await supabaseClient.from('products').upsert(batch, { onConflict: 'id' });
      if (error) throw error;
      showToast(`✅ ${batch.length} produto(s) importado(s)!`);
    } catch(err) { alert('Erro ao importar: ' + err.message); }
  };
  reader.readAsBinaryString(file);
  event.target.value = '';
}
function exportOrders() {
  if (!window.XLSX) return;
  if (!orders.length) { showToast('⚠️ Nenhum pedido para exportar'); return; }
  const rows = [];
  orders.forEach(o => {
    const d = new Date(o.date);
    o.items.forEach(item => rows.push({
      'Nº Pedido': o.id.slice(-8).toUpperCase(), 'Data': d.toLocaleDateString('pt-BR'), 'Hora': d.toLocaleTimeString('pt-BR'),
      'Status': STATUS_LABELS[o.status]||o.status, 'Origem': o.origin==='whatsapp'?'WhatsApp':'Manual',
      'Cliente': o.customer.name, 'Telefone': o.customer.phone||'', 'Empresa': o.customer.company||'',
      'Produto': item.name, 'Categoria': getCat(item.category).label, 'Unidade': item.unit||'',
      'Preço Unit.': item.price, 'Qtd': item.qty, 'Total Item': item.total, 'Total Pedido': o.total, 'Observações': o.notes||'',
    }));
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [14,12,8,14,10,24,16,24,30,18,18,12,6,12,12,40].map(w=>({wch:w}));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
  XLSX.writeFile(wb, `OdontoMedi_Pedidos_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.xlsx`);
  showToast('✅ Pedidos exportados!');
}

// ══════════════════════════════════════════════════════════
// PRODUCT FORM MODAL
// ══════════════════════════════════════════════════════════
// ── MULTI-IMAGE FORM ──────────────────────────────────────
function addImageField(url = '') {
  const wrap = document.getElementById('f-images-wrap');
  if (!wrap) return;
  const idx = wrap.children.length;
  const div = document.createElement('div');
  div.className = 'img-field-row';
  div.innerHTML = `
    <img class="img-field-preview" alt="">
    <input type="text" placeholder="URL da foto ${idx + 1}... (https://...)"
           value="${escHtml(url)}"
           oninput="previewFieldImg(this)">
    <button type="button" class="img-field-remove" onclick="removeImageField(this)" title="Remover">✕</button>`;
  wrap.appendChild(div);
  if (url) {
    const imgEl = div.querySelector('.img-field-preview');
    imgEl.src = url;
    imgEl.style.display = 'block';
  }
}

function previewFieldImg(input) {
  const imgEl = input.parentElement?.querySelector('.img-field-preview');
  if (!imgEl) return;
  const url = input.value.trim();
  if (url) {
    imgEl.src = url;
    imgEl.style.display = 'block';
    imgEl.onerror = () => { imgEl.style.display = 'none'; };
  } else {
    imgEl.style.display = 'none';
  }
  // Renumber placeholders
  renumberImageFields();
}

function removeImageField(btn) {
  btn.closest('.img-field-row').remove();
  renumberImageFields();
}

function renumberImageFields() {
  const wrap = document.getElementById('f-images-wrap');
  if (!wrap) return;
  wrap.querySelectorAll('input').forEach((inp, i) => {
    inp.placeholder = `URL da foto ${i + 1}... (https://...)`;
  });
}

function getImageFields() {
  const wrap = document.getElementById('f-images-wrap');
  if (!wrap) return [];
  return Array.from(wrap.querySelectorAll('input'))
    .map(inp => inp.value.trim())
    .filter(Boolean);
}

function clearImageFields() {
  const wrap = document.getElementById('f-images-wrap');
  if (wrap) wrap.innerHTML = '';
}

function previewImg() {
  // kept for compatibility — no-op now (using addImageField instead)
}

function openNew() {
  editingId = null;
  document.getElementById('modal-title').textContent = 'Novo Produto';
  ['f-id','f-name','f-unit','f-description','f-price','f-promo','f-stock','f-minstock','f-video'].forEach(id=>setField(id,''));
  setField('f-category','descartaveis');
  document.getElementById('f-instock').checked = true;
  document.getElementById('f-featured').checked = false;
  clearImageFields();
  addImageField(); // Start with one empty field
  document.getElementById('modal-bg').classList.add('open');
  document.getElementById('f-name').focus();
}
function openEdit(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('modal-title').textContent = 'Editar Produto';
  setField('f-id', p.id); setField('f-name', p.name||'');
  setField('f-category', p.category||'descartaveis'); setField('f-unit', p.unit||'');
  setField('f-description', p.description||''); setField('f-price', p.price||'');
  setField('f-promo', p.promoPrice||'');
  setField('f-video', p.videoUrl||'');
  setField('f-stock',    p.currentStock != null ? p.currentStock : '');
  setField('f-minstock', p.minStock     != null ? p.minStock     : '');
  document.getElementById('f-instock').checked  = !!p.inStock;
  document.getElementById('f-featured').checked = !!p.featured;
  // Populate image fields
  clearImageFields();
  const allImgs = getAllImages(p);
  if (allImgs.length === 0) addImageField();
  else allImgs.forEach(url => addImageField(url));
  checkStockAlert();
  document.getElementById('modal-bg').classList.add('open');
}
function closeModal()      { document.getElementById('modal-bg').classList.remove('open'); }
function closeModalIfBg(e) { if(e.target===document.getElementById('modal-bg')) closeModal(); }

function checkStockAlert() {
  const stock    = parseInt(document.getElementById('f-stock')?.value || '');
  const minStock = parseInt(document.getElementById('f-minstock')?.value || '');
  const alert    = document.getElementById('stock-alert-preview');
  if (!alert) return;
  if (!isNaN(stock) && !isNaN(minStock) && minStock > 0 && stock <= minStock) {
    alert.style.display = 'block';
  } else {
    alert.style.display = 'none';
  }
}

async function saveProduct() {
  const name  = document.getElementById('f-name').value.trim();
  const price = parseFloat(document.getElementById('f-price').value);
  if (!name)                { showToast('⚠️ Informe o nome do produto'); return; }
  if (!price || price <= 0) { showToast('⚠️ Informe um preço válido');   return; }
  const promoRaw    = parseFloat(document.getElementById('f-promo').value);
  const stockRaw    = parseInt(document.getElementById('f-stock').value);
  const minStockRaw = parseInt(document.getElementById('f-minstock').value);
  const allImgs     = getImageFields();
  const data = {
    id:          editingId || genId(),
    name,
    category:    document.getElementById('f-category').value,
    unit:        document.getElementById('f-unit').value.trim(),
    description: document.getElementById('f-description').value.trim(),
    price,
    promoPrice:  (!isNaN(promoRaw) && promoRaw > 0) ? promoRaw : null,
    imageUrl:    allImgs[0] || '',          // primary image (backward compat)
    imageUrls:   allImgs.slice(1),          // additional images
    videoUrl:    document.getElementById('f-video').value.trim(),
    inStock:     document.getElementById('f-instock').checked,
    featured:    document.getElementById('f-featured').checked,
    currentStock: !isNaN(stockRaw)    && stockRaw >= 0    ? stockRaw    : null,
    minStock:     !isNaN(minStockRaw) && minStockRaw >= 0 ? minStockRaw : null,
    createdAt:   Date.now(),
  };
  try {
    await fbSaveProduct(data);
    closeModal();
    showToast(editingId ? '✅ Produto atualizado' : '✅ Produto cadastrado');
  } catch(e) { showToast('❌ Erro ao salvar: ' + e.message); }
}

// ══════════════════════════════════════════════════════════
// SETTINGS MODAL
// ══════════════════════════════════════════════════════════
function openSettings() {
  setField('s-whatsapp', config.whatsapp||''); setField('s-phone',   config.phone||'');
  setField('s-email',    config.email||'');    setField('s-site',    config.site||'');
  setField('s-company',  config.company||'');  setField('s-razao',   config.razaoSocial||'');
  setField('s-cnpj',     config.cnpj||'');     setField('s-ie',      config.ie||'');
  setField('s-im',       config.im||'');       setField('s-address', config.address||'');
  setField('s-segment',  config.segment||'Varejo e Atacado');
  // Senha
  setField('pw-current',''); setField('pw-new',''); setField('pw-confirm','');
  const pwFb = document.getElementById('pw-feedback');
  if (pwFb) pwFb.style.display = 'none';
  const userLabel = document.getElementById('current-user-label');
  if (userLabel) userLabel.textContent = loggedUser || 'admin';
  // Logo
  const prev = document.getElementById('s-logo-preview');
  const ph   = document.getElementById('logo-placeholder');
  if (config.logoBase64) { prev.src=config.logoBase64; prev.style.display='block'; ph.style.display='none'; }
  else { prev.style.display='none'; ph.style.display='block'; }
  document.getElementById('settings-bg').classList.add('open');
}
function closeSettings()      { document.getElementById('settings-bg').classList.remove('open'); }
function closeSettingsIfBg(e) { if(e.target===document.getElementById('settings-bg')) closeSettings(); }

function changePassword() {
  const current  = (document.getElementById('pw-current')?.value  || '').trim();
  const newPass  = (document.getElementById('pw-new')?.value      || '').trim();
  const confirm  = (document.getElementById('pw-confirm')?.value  || '').trim();
  const feedback = document.getElementById('pw-feedback');

  const showFb = (msg, ok) => {
    feedback.textContent  = msg;
    feedback.style.display = 'block';
    feedback.style.background = ok ? '#f0fdf4' : '#fef2f2';
    feedback.style.border     = `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`;
    feedback.style.color      = ok ? '#15803d' : '#b91c1c';
  };

  if (!current) { showFb('⚠️ Informe a senha atual', false); return; }
  if (!newPass)  { showFb('⚠️ Informe a nova senha', false);  return; }
  if (newPass.length < 6) { showFb('⚠️ A nova senha deve ter pelo menos 6 caracteres', false); return; }
  if (newPass !== confirm) { showFb('⚠️ As senhas não coincidem', false); return; }

  const creds = loadCredentials();
  const idx   = creds.findIndex(u => u.user === loggedUser && u.pass === current);
  if (idx === -1) { showFb('❌ Senha atual incorreta', false); return; }

  creds[idx].pass = newPass;
  saveCredentials(creds);
  setField('pw-current',''); setField('pw-new',''); setField('pw-confirm','');
  showFb('✅ Senha alterada com sucesso!', true);
  setTimeout(() => { feedback.style.display = 'none'; }, 3000);
}

async function saveSettings() {
  try {
    const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

    config.whatsapp    = g('s-whatsapp').replace(/\D/g,'');
    config.phone       = g('s-phone');
    config.email       = g('s-email');
    config.site        = g('s-site');
    config.company     = g('s-company') || 'OdontoMedi Center';
    config.razaoSocial = g('s-razao');
    config.cnpj        = g('s-cnpj');
    config.ie          = g('s-ie');
    config.im          = g('s-im');
    config.address     = g('s-address');
    const segEl = document.getElementById('s-segment');
    if (segEl) config.segment = segEl.value;

    // Salva no localStorage imediatamente
    try { localStorage.setItem('om:cache:config', JSON.stringify(config)); } catch(_) {}

    // Salva no Supabase e aguarda confirmação
    const payload = {
      id:          'main',
      whatsapp:    config.whatsapp,
      phone:       config.phone,
      email:       config.email,
      site:        config.site,
      company:     config.company,
      razaoSocial: config.razaoSocial,
      cnpj:        config.cnpj,
      ie:          config.ie,
      im:          config.im,
      segment:     config.segment,
      address:     config.address,
    };
    const { error } = await supabaseClient
      .from('config')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;

    closeSettings();
    showToast('✅ Configurações salvas!');

  } catch(e) {
    console.error('saveSettings error:', e);
    showToast('❌ Erro ao salvar: ' + e.message);
  }
}

function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    config.logoBase64 = e.target.result;
    const prev = document.getElementById('s-logo-preview');
    const ph   = document.getElementById('logo-placeholder');
    prev.src = config.logoBase64; prev.style.display='block'; ph.style.display='none';
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}
function clearLogo() {
  config.logoBase64 = '';
  document.getElementById('s-logo-preview').style.display = 'none';
  document.getElementById('logo-placeholder').style.display = 'block';
}
function maskCPF(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 9)      v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
  else if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
  else if (v.length > 3) v = v.replace(/^(\d{3})(\d{0,3})/, '$1.$2');
  input.value = v;
}
function maskCNPJ(input) {
  let v = input.value.replace(/\D/g,'').slice(0,14);
  if (v.length>12) v=v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,'$1.$2.$3/$4-$5');
  else if(v.length>8) v=v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/,'$1.$2.$3/$4');
  else if(v.length>5) v=v.replace(/^(\d{2})(\d{3})(\d{0,3})/,'$1.$2.$3');
  else if(v.length>2) v=v.replace(/^(\d{2})(\d{0,3})/,'$1.$2');
  input.value = v;
}

// ══════════════════════════════════════════════════════════
// CATALOG GENERATION (PDF print)
// ══════════════════════════════════════════════════════════
function generatePreview() {
  const sel = products.filter(p => selectedIds.has(p.id));
  if (!sel.length) return;

  const featured    = sel.filter(p => p.featured);
  const promo       = sel.filter(p => p.promoPrice);
  const year        = new Date().getFullYear();
  const nowFull     = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
  const companyName = config.company || 'OdontoMedi Center';
  const segment     = (config.segment || 'Distribuidora Hospitalar').toUpperCase();
  const waNum       = config.whatsapp ? `+${config.whatsapp}` : (config.phone || '');
  const pages       = [];

  // ── helpers ──────────────────────────────────────────────
  const ctaBar = waNum ? `
    <div style="background:#c9a227;padding:10px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0">
      <span style="font-size:15px">📞</span>
      <div>
        <div style="font-size:8px;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:1px;font-weight:700">Solicite seu Orçamento</div>
        <div style="font-size:11px;font-weight:800;color:#fff">${escHtml(waNum)}</div>
      </div>
    </div>` : '';

  const prodCard = (p) => {
    const cat = getCat(p.category);
    return `
      <div style="border:1px solid #e5e9f4;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;break-inside:avoid">
        <div style="height:122px;overflow:hidden;position:relative;background:#f0f4fa;flex-shrink:0">
          ${p.imageUrl
            ? `<img src="${escHtml(p.imageUrl)}" style="width:100%;height:100%;object-fit:cover">`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:42px">${cat.icon}</div>`}
          ${p.featured ? `<div style="position:absolute;top:7px;left:7px;background:#c9a227;color:#0d1e3a;font-size:8px;font-weight:800;padding:2px 8px;border-radius:20px">★ DESTAQUE</div>` : ''}
          ${p.promoPrice ? `<div style="position:absolute;top:7px;right:7px;background:#dc2626;color:#fff;font-size:8px;font-weight:800;padding:2px 8px;border-radius:20px">PROMO</div>` : ''}
          ${!p.inStock ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center"><span style="color:#fff;font-size:9px;font-weight:800;background:rgba(0,0,0,.4);padding:3px 10px;border-radius:20px">INDISPONIVEL</span></div>` : ''}
        </div>
        <div style="padding:11px 13px;flex:1;display:flex;flex-direction:column">

          <div style="font-family:Poppins,sans-serif;font-weight:900;font-size:12px;color:#1a3668;line-height:1.3;margin-bottom:4px">${escHtml(p.name)}</div>
          ${p.unit ? `<div style="font-size:9px;color:#9ca3af;margin-bottom:5px">📦 ${escHtml(p.unit)}</div>` : ''}
          <div style="font-size:9px;color:#6b7280;line-height:1.5;flex:1;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escHtml(p.description||'')}</div>
          <div style="border-top:1px solid #f0f0f0;padding-top:7px">
            ${p.promoPrice
              ? `<div style="font-size:9px;color:#9ca3af;text-decoration:line-through">${fmtBRL(p.price)}</div><div style="font-size:15px;font-weight:900;color:#dc2626;font-family:Poppins,sans-serif">${fmtBRL(p.promoPrice)}</div>`
              : `<div style="font-size:15px;font-weight:900;color:#1a3668;font-family:Poppins,sans-serif">${fmtBRL(p.price)}</div>`}
          </div>
        </div>
        ${ctaBar}
      </div>`;
  };

  const catHeader = (c, count) => `
    <div style="background:#0d1e3a;border-radius:12px;padding:20px 28px;margin-bottom:18px;position:relative;overflow:hidden">
      <div style="position:absolute;right:-10px;top:-30px;width:130px;height:130px;border:2px solid rgba(201,162,39,.15);border-radius:50%"></div>
      <div style="position:absolute;right:30px;top:10px;width:60px;height:60px;border:1px solid rgba(201,162,39,.08);border-radius:50%"></div>
      <div style="font-size:9px;color:#c9a227;font-weight:800;text-transform:uppercase;letter-spacing:3px;margin-bottom:6px">${c.icon} Categoria</div>
      <div style="font-family:Poppins,sans-serif;font-weight:900;font-size:24px;color:#fff;position:relative;z-index:1">${c.label.toUpperCase()}</div>
      <div style="width:36px;height:2px;background:#c9a227;margin-top:10px;border-radius:2px"></div>
      <div style="position:absolute;right:28px;bottom:20px;font-size:11px;color:rgba(255,255,255,.3)">${count} produto${count!==1?'s':''}</div>
    </div>`;

  const pFooter = (page) => `
    <div style="position:absolute;bottom:22px;left:44px;right:44px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #e5e9f4;padding-top:9px">
      <div style="display:flex;align-items:center;gap:8px">
        ${config.logoBase64
          ? `<img src="${config.logoBase64}" style="height:16px;object-fit:contain">`
          : `<div style="width:18px;height:18px;background:#1a3668;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px">🦷</div>`}
        <span style="font-size:9px;color:#9ca3af;font-weight:700">${escHtml(companyName)}</span>
      </div>
      <div style="font-size:9px;color:#c4cada">${nowFull}</div>
      <div style="background:#c9a227;color:#0d1e3a;font-size:9px;font-weight:800;padding:2px 10px;border-radius:20px">Pág. ${page}</div>
    </div>`;

  // ══ CAPA ══════════════════════════════════════════════════
  pages.push(`<div class="cpage" style="background:#0d1e3a;overflow:hidden;position:relative">
    <div style="position:absolute;right:0;top:0;border-style:solid;border-width:0 280px 1122px 0;border-color:transparent rgba(201,162,39,.1) transparent transparent"></div>
    <div style="position:absolute;right:80px;bottom:250px;width:180px;height:180px;border:2px solid rgba(201,162,39,.08);border-radius:50%"></div>
    <div style="position:absolute;right:30px;bottom:150px;width:70px;height:70px;border:1px solid rgba(201,162,39,.06);border-radius:50%"></div>
    ${featured[0]?.imageUrl ? `<div style="position:absolute;right:0;top:0;width:340px;height:100%;overflow:hidden"><img src="${escHtml(featured[0].imageUrl)}" style="width:100%;height:100%;object-fit:cover;opacity:.12"></div>` : ''}

    <div style="position:relative;z-index:1;height:100%;display:flex;flex-direction:column;padding:64px">
      <div>
        ${config.logoBase64
          ? `<img src="${config.logoBase64}" style="max-height:96px;max-width:300px;object-fit:contain;margin-bottom:52px">`
          : `<div style="display:flex;align-items:center;gap:16px;margin-bottom:52px">
               <div style="width:64px;height:64px;background:#c9a227;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px">🦷</div>
               <div>
                 <div style="font-family:Poppins,sans-serif;font-weight:900;font-size:28px;color:#fff;line-height:1">${escHtml(companyName)}</div>
                 <div style="font-size:10px;color:#c9a227;letter-spacing:3px;font-weight:700">${segment}</div>
               </div>
             </div>`}

        <div style="width:52px;height:3px;background:#c9a227;margin-bottom:28px;border-radius:2px"></div>

        <div style="font-family:Poppins,sans-serif;font-weight:900;font-size:54px;color:#fff;line-height:1.05;margin-bottom:16px">
          CATÁLOGO<br>DE <span style="color:#c9a227">PRODUTOS</span>
        </div>

        <div style="font-size:12px;color:rgba(255,255,255,.35);font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:56px">
          QUALIDADE &nbsp;·&nbsp; CONFIANÇA &nbsp;·&nbsp; COMPROMISSO
        </div>

        <div style="display:flex;gap:48px">
          <div><div style="font-family:Poppins,sans-serif;font-size:38px;font-weight:900;color:#c9a227">${sel.length}</div><div style="font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:1px;margin-top:2px">Produtos</div></div>
          ${featured.length ? `<div><div style="font-family:Poppins,sans-serif;font-size:38px;font-weight:900;color:#c9a227">${featured.length}</div><div style="font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:1px;margin-top:2px">Destaques</div></div>` : ''}
          ${promo.length ? `<div><div style="font-family:Poppins,sans-serif;font-size:38px;font-weight:900;color:#c9a227">${promo.length}</div><div style="font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:1px;margin-top:2px">Promoções</div></div>` : ''}
        </div>
      </div>

      <div style="margin-top:auto;border-top:1px solid rgba(255,255,255,.1);padding-top:24px;display:flex;justify-content:space-between;align-items:flex-end">
        <div style="display:flex;flex-direction:column;gap:8px">
          ${waNum ? `<div style="display:flex;align-items:center;gap:10px;color:rgba(255,255,255,.65);font-size:13px;font-weight:600"><span>📞</span>${escHtml(waNum)}</div>` : ''}
          ${config.email ? `<div style="display:flex;align-items:center;gap:10px;color:rgba(255,255,255,.35);font-size:12px"><span>✉</span>${escHtml(config.email)}</div>` : ''}
          ${config.site ? `<div style="display:flex;align-items:center;gap:10px;color:rgba(255,255,255,.35);font-size:12px"><span>🌐</span>${escHtml(config.site)}</div>` : ''}
          ${config.address ? `<div style="display:flex;align-items:center;gap:10px;color:rgba(255,255,255,.3);font-size:11px"><span>📍</span>${escHtml(config.address.split('\n')[0])}</div>` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;color:rgba(255,255,255,.2);text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">Catálogo de Produtos</div>
          <div style="font-family:Poppins,sans-serif;font-weight:900;font-size:36px;color:#c9a227;line-height:1">${year}</div>
        </div>
      </div>
    </div>
  </div>`);

  // ══ DESTAQUES ═════════════════════════════════════════════
  if (featured.length > 0) {
    const cols = Math.min(featured.length, 3);
    const featCards = featured.map(p => {
      const cat = getCat(p.category);
      return `<div style="border:1px solid #e5e9f4;border-radius:12px;overflow:hidden;display:flex;flex-direction:column">
        <div style="height:${featured.length === 1 ? 380 : featured.length === 2 ? 300 : 220}px;overflow:hidden;position:relative;background:#f0f4fa;flex-shrink:0">
          ${p.imageUrl
            ? `<img src="${escHtml(p.imageUrl)}" style="width:100%;height:100%;object-fit:cover">`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:80px">${cat.icon}</div>`}
          <div style="position:absolute;top:12px;left:12px;background:#c9a227;color:#0d1e3a;font-size:9px;font-weight:800;padding:4px 12px;border-radius:20px">★ DESTAQUE</div>
          ${p.promoPrice ? `<div style="position:absolute;top:12px;right:12px;background:#dc2626;color:#fff;font-size:9px;font-weight:800;padding:4px 12px;border-radius:20px">PROMOÇÃO</div>` : ''}
        </div>
        <div style="padding:18px 20px;flex:1;display:flex;flex-direction:column">

          <div style="font-family:Poppins,sans-serif;font-weight:900;font-size:${featured.length===1?22:18}px;color:#1a3668;line-height:1.2;margin-bottom:6px">${escHtml(p.name)}</div>
          ${p.unit ? `<div style="font-size:11px;color:#9ca3af;margin-bottom:8px">📦 ${escHtml(p.unit)}</div>` : ''}
          <div style="font-size:11px;color:#6b7280;line-height:1.6;flex:1;margin-bottom:12px">${escHtml((p.description||'').substring(0,200))}</div>
          <div style="border-top:1px solid #f0f0f0;padding-top:12px">
            ${p.promoPrice
              ? `<div style="font-size:11px;color:#9ca3af;text-decoration:line-through">${fmtBRL(p.price)}</div><div style="font-size:26px;font-weight:900;color:#dc2626;font-family:Poppins,sans-serif">${fmtBRL(p.promoPrice)}</div>`
              : `<div style="font-size:26px;font-weight:900;color:#1a3668;font-family:Poppins,sans-serif">${fmtBRL(p.price)}</div>`}
          </div>
        </div>
        ${ctaBar}
      </div>`;
    }).join('');

    pages.push(`<div class="cpage" style="padding:44px 48px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:8px">
        <div style="width:5px;height:30px;background:#c9a227;border-radius:3px"></div>
        <div>
          <div style="font-size:10px;color:#c9a227;font-weight:800;text-transform:uppercase;letter-spacing:2px">Selecao Especial</div>
          <div style="font-family:Poppins,sans-serif;font-weight:900;font-size:24px;color:#1a3668">PRODUTOS EM DESTAQUE</div>
        </div>
      </div>
      <div style="height:2px;background:linear-gradient(90deg,#c9a227 40%,transparent);margin-bottom:24px"></div>
      <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:18px">${featCards}</div>
      ${pFooter(2)}
    </div>`);
  }

  // ══ PÁGINAS POR CATEGORIA ══════════════════════════════════
  const bycat = {};
  sel.forEach(p => { if (!bycat[p.category]) bycat[p.category]=[]; bycat[p.category].push(p); });

  let pgNum = featured.length > 0 ? 3 : 2;

  Object.entries(bycat).forEach(([catId, prods]) => {
    const c       = getCat(catId);
    const perPage = 9; // 3 colunas × 3 linhas

    for (let i = 0; i < prods.length; i += perPage) {
      const chunk    = prods.slice(i, i + perPage);
      const isFirst  = i === 0;
      const cards    = chunk.map(prodCard).join('');

      pages.push(`<div class="cpage" style="padding:38px 44px">
        ${isFirst
          ? catHeader(c, prods.length)
          : `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
               <div style="width:4px;height:20px;background:#c9a227;border-radius:2px"></div>
               <div style="font-family:Poppins,sans-serif;font-weight:900;font-size:14px;color:#1a3668">${c.label.toUpperCase()} — continuação</div>
             </div>`}
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">${cards}</div>
        ${pFooter(pgNum)}
      </div>`);
      pgNum++;
    }
  });

  // ══ CONTRACAPA ════════════════════════════════════════════
  const contacts = [
    waNum         ? { icon:'📞', lbl:'WhatsApp / Telefone',  val: waNum }           : null,
    config.phone  ? { icon:'📱', lbl:'Telefone Fixo',         val: config.phone }    : null,
    config.email  ? { icon:'✉️',  lbl:'E-mail',               val: config.email }    : null,
    config.site   ? { icon:'🌐', lbl:'Site',                  val: config.site }     : null,
    config.address? { icon:'📍', lbl:'Endereço',              val: config.address }  : null,
  ].filter(Boolean);

  const legal = [
    config.razaoSocial ? `Razão Social: ${config.razaoSocial}` : '',
    config.cnpj        ? `CNPJ: ${config.cnpj}` : '',
    config.ie          ? `IE: ${config.ie}` : '',
  ].filter(Boolean).join(' · ');

  pages.push(`<div class="cpage" style="background:#0d1e3a;display:flex;flex-direction:column;overflow:hidden;position:relative">
    <div style="position:absolute;left:-60px;bottom:-60px;width:320px;height:320px;background:rgba(201,162,39,.05);border-radius:50%"></div>
    <div style="position:absolute;right:80px;top:80px;width:160px;height:160px;border:2px solid rgba(201,162,39,.08);border-radius:50%"></div>
    <div style="position:absolute;right:40px;top:40px;width:60px;height:60px;border:1px solid rgba(201,162,39,.06);border-radius:50%"></div>

    <div style="position:relative;z-index:1;flex:1;padding:56px 64px;display:flex;flex-direction:column;justify-content:center">
      ${config.logoBase64
        ? `<img src="${config.logoBase64}" style="max-height:88px;max-width:280px;object-fit:contain;margin-bottom:32px">`
        : `<div style="display:flex;align-items:center;gap:14px;margin-bottom:32px">
             <div style="width:56px;height:56px;background:#c9a227;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px">🦷</div>
             <div>
               <div style="font-family:Poppins,sans-serif;font-weight:900;font-size:26px;color:#fff;line-height:1">${escHtml(companyName)}</div>
               <div style="font-size:10px;color:#c9a227;letter-spacing:3px;font-weight:700">${segment}</div>
             </div>
           </div>`}

      <div style="font-family:Poppins,sans-serif;font-weight:900;font-size:42px;color:#fff;line-height:1.1;margin-bottom:8px">
        ENTRE EM<br><span style="color:#c9a227">CONTATO</span>
      </div>
      <div style="height:2px;background:linear-gradient(90deg,#c9a227 40%,transparent);margin-bottom:36px;width:200px"></div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${contacts.map(item => `
          <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:16px 20px">
            <div style="font-size:9px;color:#c9a227;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5px">${item.icon} ${item.lbl}</div>
            <div style="color:rgba(255,255,255,.8);font-size:13px;font-weight:600;word-break:break-word;line-height:1.4">${escHtml(item.val.replace(/\n/g,', '))}</div>
          </div>`).join('')}
      </div>

      <div style="margin-top:32px;display:flex;gap:28px">
        <div style="flex:1">
          <div style="font-size:10px;color:#c9a227;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Qualidade</div>
          <div style="font-size:11px;color:rgba(255,255,255,.4)">Produtos das melhores marcas do mercado</div>
        </div>
        <div style="flex:1">
          <div style="font-size:10px;color:#c9a227;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Confiança</div>
          <div style="font-size:11px;color:rgba(255,255,255,.4)">Assistencia tecnica autorizada e pecas originais</div>
        </div>
        <div style="flex:1">
          <div style="font-size:10px;color:#c9a227;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Compromisso</div>
          <div style="font-size:11px;color:rgba(255,255,255,.4)">Solucoes completas para o sucesso do seu negocio</div>
        </div>
      </div>
    </div>

    <div style="position:relative;z-index:1;background:rgba(0,0,0,.25);border-top:1px solid rgba(255,255,255,.07);padding:16px 64px;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:9px;color:rgba(255,255,255,.18)">${legal}</div>
      <div style="font-size:9px;color:rgba(255,255,255,.18)">Precos sujeitos a alteracao sem aviso previo · ${nowFull}</div>
    </div>
  </div>`);

  catalogPrintHTML = pages.join('');
  document.getElementById('preview-body').innerHTML = pages.map(p =>
    `<div style="margin-bottom:4px;box-shadow:0 6px 32px rgba(0,0,0,.5)">${p}</div>`
  ).join('');
  document.getElementById('preview-overlay').classList.add('open');
}

function closePrev() { document.getElementById('preview-overlay').classList.remove('open'); }

function printCatalog() {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Catalogo — ${escHtml(config.company||'OdontoMedi Center')}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@700;800;900&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Inter',sans-serif;background:#fff}
      .cpage{width:794px;min-height:1122px;position:relative;overflow:hidden;page-break-after:always}
      @media print{@page{size:A4;margin:0}body{width:794px}.cpage{page-break-after:always}}
    </style>
    </head><body>${catalogPrintHTML}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 1000);
}
// ── KEYBOARD SHORTCUTS ────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeLogin(); closeDetail(); closeCart(); closeCheckout();
    closeManual(); closeModal(); closeSettings(); closePrev();
  }
});

// ══════════════════════════════════════════════════════════
// LOCAL CACHE — bootstrap instantâneo antes do Firebase
// ══════════════════════════════════════════════════════════
const LC = {
  products: 'om:cache:products',
  orders:   'om:cache:orders',
  config:   'om:cache:config',
};

function cacheRead(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch(_) { return null; }
}
function cacheWrite(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(_) {}
}

function syncIndicator(on) {
  let el = document.getElementById('sync-dot');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sync-dot';
    el.style.cssText = 'position:fixed;bottom:16px;right:16px;background:#1a3668;color:#fff;font-size:11px;font-weight:700;padding:6px 14px;border-radius:20px;z-index:9998;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(0,0,0,.2);transition:opacity .4s';
    document.body.appendChild(el);
  }
  if (on) {
    el.innerHTML = '<span style="animation:spin 1s linear infinite;display:inline-block">⟳</span> Sincronizando...';
    el.style.opacity = '1';
  } else {
    el.innerHTML = '✓ Sincronizado';
    setTimeout(() => { el.style.opacity = '0'; }, 1800);
  }
}

// ══════════════════════════════════════════════════════════
// INIT — Supabase com cache local para carregamento rápido
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function init() {
  // 1. Carregar cache local IMEDIATAMENTE (zero espera)
  const cachedProducts = cacheRead(LC.products);
  const cachedOrders   = cacheRead(LC.orders);
  const cachedConfig   = cacheRead(LC.config);

  if (cachedProducts && cachedProducts.length > 0) {
    products = cachedProducts;
    appReady = true;
  } else {
    products = SAMPLE_PRODUCTS;
  }
  if (cachedOrders) orders = cachedOrders;
  if (cachedConfig) config = { ...DEFAULT_CONFIG, ...cachedConfig };

  // Renderizar imediatamente com dados do cache
  checkAdminSession();
  renderAll();
  updateCartBadge();

  // 2. Inicializar Supabase
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  syncIndicator(true);

  // 2.1 Sincronizar credenciais de admin do Supabase
  syncCredentialsFromSupabase();

  // 3. Carregar dados iniciais via fetch
  Promise.all([
    supabaseClient.from('products').select('*').order('created_at', { ascending: true }),
    supabaseClient.from('orders').select('*').order('date', { ascending: false }),
    supabaseClient.from('config').select('*').eq('id', 'main').single(),
  ]).then(([prodRes, ordRes, cfgRes]) => {

    // ── Products ──
    if (!prodRes.error) {
      if (prodRes.data && prodRes.data.length > 0) {
        const fresh = prodRes.data;
        if (JSON.stringify(fresh) !== JSON.stringify(products)) {
          products = fresh;
          cacheWrite(LC.products, products);
          appReady = true;
          renderAll();
          updateCartBadge();
        } else {
          appReady = true;
        }
      } else if (!appReady) {
        // Sem dados → semear amostra
        seedSampleData().then(() => {
          products = SAMPLE_PRODUCTS.map((p, i) => ({ ...p, id: p.id || genId() }));
          cacheWrite(LC.products, products);
          appReady = true;
          renderAll();
        });
      }
    } else {
      console.error('Supabase products error:', prodRes.error);
      if (!appReady) showToast('⚠️ Sem conexão — exibindo dados em cache');
    }

    // ── Orders ──
    if (!ordRes.error && ordRes.data) {
      const fresh = ordRes.data;
      if (JSON.stringify(fresh) !== JSON.stringify(orders)) {
        orders = fresh;
        cacheWrite(LC.orders, orders);
        if (currentView === 'orders') renderOrders();
      }
    }

    // ── Config — Supabase SEMPRE tem prioridade sobre cache local ──
    if (!cfgRes.error && cfgRes.data) {
      const localLogo = cacheRead(LC.config)?.logoBase64 || '';
      config = { ...DEFAULT_CONFIG, ...cfgRes.data, logoBase64: localLogo };
      cacheWrite(LC.config, config);
      console.log('Config carregada do Supabase:', config.company, config.whatsapp);
    } else {
      // Sem config no Supabase → gravar padrão
      console.warn('Config não encontrada no Supabase, gravando padrão...', cfgRes.error);
      fbSaveConfig().catch(e => console.warn('Config seed error:', e));
    }

    syncIndicator(false);
  }).catch(err => {
    console.error('Supabase init error:', err);
    syncIndicator(false);
  });

  // 4. Realtime — Products
  realtimeProducts = supabaseClient
    .channel('products-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
      supabaseClient.from('products').select('*').order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            products = data;
            cacheWrite(LC.products, products);
            renderAll();
            updateCartBadge();
          }
        });
    })
    .subscribe();

  // 5. Realtime — Orders
  realtimeOrders = supabaseClient
    .channel('orders-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      supabaseClient.from('orders').select('*').order('date', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            orders = data;
            cacheWrite(LC.orders, orders);
            if (currentView === 'orders') renderOrders();
          }
        });
    })
    .subscribe();

  // 6. Realtime — Config
  realtimeConfig = supabaseClient
    .channel('config-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'config' }, () => {
      supabaseClient.from('config').select('*').eq('id', 'main').single()
        .then(({ data, error }) => {
          if (!error && data) {
            const localLogo = cacheRead(LC.config)?.logoBase64 || '';
            config = { ...DEFAULT_CONFIG, ...data, logoBase64: localLogo };
            cacheWrite(LC.config, config);
          }
        });
    })
    .subscribe();

});

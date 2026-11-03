/**
 * FNX RESTAURANT — CONSOLA DE RESTAURANTE (index.js)
 * Conexión en tiempo real con WhatAuth Pixel, KDS de Cocina y PDA de Camareros
 * Soporte Multi-idioma (ES / EN), Estado Entrando (Borrador) y Rondas Multi-Ticket
 */

(function () {
  'use strict';

  // Configuración del Restaurante
  const RESTAURANT_CONFIG = {
    wsUrl: 'https://api.whatauth.com',
    domain: 'carta.fenix.ninja',
    phone: '34631490990',
    logoUrl: 'src/img/logo.png',
    currentTable: 'Mesa 04',
    currentZone: 'Terraza Principal',
    currentPin: 'N-401'
  };

  // Detección inicial de idioma: inglés por defecto para el mundo, español para navegadores de habla hispana
  const navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  let currentAppLang = navLang.startsWith('es') ? 'es' : 'en';

  // Diccionario I18N de Consola
  const I18N = {
    es: {
      brandTagline: 'Smart Table · KDS & PDA Live System',
      serviceActive: 'SERVICIO ACTIVO',
      soundOn: 'Sonido ON',
      soundOff: 'Sonido OFF',
      openMobileMenu: 'Abrir Carta Móvil',
      tab01Name: 'Mesa 01',
      tab01Zone: 'Salón',
      tab04Name: 'Mesa 04',
      tab04Zone: 'Terraza',
      tab07Name: 'Mesa 07',
      tab07Zone: 'VIP',
      tablePrefix: 'MESA',
      zoneTerrace: 'Terraza Principal',
      statusWaiting: 'Escanea con WhatsApp para ver la carta y pedir',
      statusConnected: '¡Mesa Conectada!',
      verifiedBadge: '✓ VERIFICADO',
      openWhatsApp: 'Abrir en WhatsApp',
      noQrTitle: 'COMANDA DE SALA DIRECTA',
      noQrDesc: 'Esta mesa opera sin código QR interactivo. El servicio y las marchas se gestionan de forma presencial por camarero en el KDS y PDA contiguos.',
      btnGotoMesa04: '🔄 Ver Mesa 04 (Con WhatAuth QR)',
      kdsTitle: 'KDS Cocina',
      kdsSubtag: 'PANTALLA DE MARCHAS',
      kdsDesc: 'Comandas de paellas y arroces en tiempo real',
      kdsMetric: 'EN FUEGO',
      kdsEmptyTitle: 'Cocina en Espera de Comanda',
      kdsEmptyDesc: 'Escanea el QR de la Mesa 04 o pulsa "Abrir Carta Móvil" para marchar paellas en tiempo real.',
      pdaTitle: 'PDA Camarero',
      pdaSubtag: 'COMANDERO DE SALA',
      pdaDesc: 'Bebidas y servicio a mesa',
      pdaMetric: 'POR SERVIR',
      pdaEmptyTitle: 'Sin Bebidas Pendientes',
      pdaEmptyDesc: 'Las bebidas añadidas desde la carta móvil aparecerán aquí para el servicio de sala.',
      draftTitleKds: '⚡ {table} · Comensal añadiendo platos: {item} (Borrador)...',
      draftTitlePda: '⚡ {table} · Comensal seleccionando bebidas: {item} (Borrador)...',
      ticketRoundLabel: 'TICKET #{round} · RONDA {round}',
      dinerLabel: 'Comensal: {name}',
      cookingStatus: 'Fuego Activo',
      readyStatus: '✓ Listo para Servir',
      btnMarkReady: '🍽️ Marcar Listo para Servir',
      btnMarkReady: '✓ Marcar Listo para Servir',
      btnServe: '✓ Servir',
      btnServed: '✓ Servido',
      kitchenAlertTitle: '¡Plato de Cocina Listo!',
      kitchenAlertText: 'Llevar Paellas a {table}',
      btnDelivered: 'Entregado',
      ghostBadge: 'BORRADOR EN VIVO',
      ghostStatusDrafting: 'Eligiendo en móvil',
      ghostItemNote: 'Añadido en carta móvil · Sin confirmar',
      ghostStatusPill: 'En Borrador',
      ghostNotice: 'Comensal seleccionando en su móvil · Se descarta en 5 min si no se envía',
      ghostPendingBtn: '⏳ En elección...',
      guest: 'Comensal'
    },
    en: {
      brandTagline: 'Smart Table · KDS & PDA Live System',
      serviceActive: 'ACTIVE SERVICE',
      soundOn: 'Sound ON',
      soundOff: 'Sound OFF',
      openMobileMenu: 'Open Mobile Menu',
      tab01Name: 'Table 01',
      tab01Zone: 'Lounge',
      tab04Name: 'Table 04',
      tab04Zone: 'Terrace',
      tab07Name: 'Table 07',
      tab07Zone: 'VIP',
      tablePrefix: 'TABLE',
      zoneTerrace: 'Main Terrace',
      statusWaiting: 'Scan with WhatsApp to see menu and order',
      statusConnected: 'Table Connected!',
      verifiedBadge: '✓ VERIFIED',
      openWhatsApp: 'Open in WhatsApp',
      noQrTitle: 'DIRECT FLOOR ORDER',
      noQrDesc: 'This table operates without an interactive QR code. Service is managed directly by floor staff on adjacent KDS & PDA.',
      btnGotoMesa04: '🔄 View Table 04 (With WhatAuth QR)',
      kdsTitle: 'KDS Kitchen',
      kdsSubtag: 'ORDERS DISPLAY',
      kdsDesc: 'Live paella and rice orders in real time',
      kdsMetric: 'COOKING',
      kdsEmptyTitle: 'Kitchen Awaiting Orders',
      kdsEmptyDesc: 'Scan Table 04 QR or click "Open Mobile Menu" to fire paellas in real time.',
      pdaTitle: 'Waiter PDA',
      pdaSubtag: 'FLOOR COMMISSARY',
      pdaDesc: 'Drinks & table service',
      pdaMetric: 'TO SERVE',
      pdaEmptyTitle: 'No Pending Drinks',
      pdaEmptyDesc: 'Drinks added from the mobile menu will appear here for floor service.',
      draftTitleKds: '⚡ {table} · Guest adding dishes: {item} (Drafting)...',
      draftTitlePda: '⚡ {table} · Guest selecting drinks: {item} (Drafting)...',
      ticketRoundLabel: 'TICKET #{round} · ROUND {round}',
      dinerLabel: 'Guest: {name}',
      cookingStatus: 'Cooking Active',
      readyStatus: '✓ Ready to Serve',
      btnMarkReady: '🍽️ Mark Ready to Serve',
      btnMarkReady: '✓ Mark Ready to Serve',
      btnServe: '✓ Serve',
      btnServed: '✓ Served',
      kitchenAlertTitle: 'Kitchen Dish Ready!',
      kitchenAlertText: 'Deliver Paellas to {table}',
      btnDelivered: 'Delivered',
      ghostBadge: 'LIVE DRAFT',
      ghostStatusDrafting: 'Selecting on mobile',
      ghostItemNote: 'Added on mobile menu · Unconfirmed',
      ghostStatusPill: 'In Draft',
      ghostNotice: 'Guest selecting on mobile · Discards in 5 min if not submitted',
      ghostPendingBtn: '⏳ In selection...',
      guest: 'Guest'
    }
  };

  // Estado global de la aplicación
  let whatAuthSocket = null;
  let activeQrStyling = null;
  let soundEnabled = true;
  let audioContext = null;

  // Canal de difusión local para sincronización instantánea en el mismo navegador
  const broadcast = (typeof BroadcastChannel !== 'undefined')
    ? new BroadcastChannel('fnx_restaurant_orders')
    : null;

  // Estado del comensal verificado en mesa
  let activeDiner = null;
  let currentQrSession = {
    sessionId: null,
    walink: null,
    pin: RESTAURANT_CONFIG.currentPin
  };

  // Almacenamiento de Tickets por Mesa (Soporte Multi-Ticket / Rondas)
  // liveTableTickets[tableName] = [ { id, round, diner, createdAt, kds: [...], pda: [...], kdsElapsed: 0, timerInterval } ]
  const liveTableTickets = {
    'Mesa 04': []
  };

  // Borradores en curso antes de enviar a cocina
  const tableDrafts = {};
  let draftTimeoutKds = null;
  let draftTimeoutPda = null;
  let lastItemChimeTs = 0;

  // Registro de deduplicación de comandas procesadas (anti-rebote WS + BroadcastChannel)
  const processedOrderIds = new Set();

  // Lista de vídeos para el carrusel de fondo
  const bgVideos = [
    'src/video/chef_cooking.mp4',
    'src/video/waiter_taking_order.mp4',
    'src/video/patrons_dining_terrace.mp4',
    'src/video/bartender_pouring_wine.mp4',
    'src/video/chef_garnishing_paella.mp4',
    'src/video/outdoor_dining_atmosphere.mp4'
  ];
  let currentVideoIndex = 0;

  // ========================================================
  // INICIALIZACIÓN
  // ========================================================
  window.addEventListener('DOMContentLoaded', () => {
    initClock();
    initVideoBackground();
    initAudioSystem();
    initLanguageSelectors();
    applyLanguage(currentAppLang);
    initTableTabs();
    initSoundToggle();
    initWhatAuthSocket();
    initBroadcastChannel();
  });

  // ========================================================
  // 1. SELECTORES DE IDIOMA & DICCIONARIO
  // ========================================================
  function initLanguageSelectors() {
    // 1. Selector en Cabecera
    const headerBtnEs = document.getElementById('header-lang-es');
    const headerBtnEn = document.getElementById('header-lang-en');

    headerBtnEs?.addEventListener('click', () => switchLanguage('es'));
    headerBtnEn?.addEventListener('click', () => switchLanguage('en'));

    // 2. Selector en Atril de Mesa
    const standBtnEs = document.getElementById('stand-lang-es');
    const standBtnEn = document.getElementById('stand-lang-en');

    standBtnEs?.addEventListener('click', () => switchLanguage('es'));
    standBtnEn?.addEventListener('click', () => switchLanguage('en'));
  }

  function switchLanguage(lang) {
    if (lang === currentAppLang) return;
    currentAppLang = lang;
    applyLanguage(lang);
    playChime(600, 'sine', 0.1);

    // Si estamos en Mesa 04, regenerar el QR con el PIN correspondiente
    if (RESTAURANT_CONFIG.currentTable === 'Mesa 04') {
      const pin = lang === 'en' ? 'EN-401' : 'N-401';
      RESTAURANT_CONFIG.currentPin = pin;
      currentQrSession.pin = pin;
      requestTableQr(RESTAURANT_CONFIG.currentTable, pin);
    }
  }

  function applyLanguage(lang) {
    const dict = I18N[lang] || I18N.en;

    // Actualizar botones activos
    ['header-lang', 'stand-lang'].forEach((prefix) => {
      const bEs = document.getElementById(`${prefix}-es`);
      const bEn = document.getElementById(`${prefix}-en`);
      if (bEs) bEs.classList.toggle('active', lang === 'es');
      if (bEn) bEn.classList.toggle('active', lang === 'en');
    });

    // Textos cabecera
    setElemText('brand-tagline', dict.brandTagline);
    setElemText('live-status-label', dict.serviceActive);
    setElemText('sound-label', soundEnabled ? dict.soundOn : dict.soundOff);
    setElemText('btn-open-mobile-text', dict.openMobileMenu);

    // Pestañas de mesas
    setElemText('tab-name-01', dict.tab01Name);
    setElemText('tab-zone-01', dict.tab01Zone);
    setElemText('tab-name-04', dict.tab04Name);
    setElemText('tab-zone-04', dict.tab04Zone);
    setElemText('tab-name-07', dict.tab07Name);
    setElemText('tab-zone-07', dict.tab07Zone);

    // Atril
    updateStandTexts(dict);

    // KDS & PDA Cabeceras y placeholders
    setElemText('kds-title-text', dict.kdsTitle);
    setElemText('kds-subtag-text', dict.kdsSubtag);
    setElemText('kds-desc-text', dict.kdsDesc);
    setElemText('kds-metric-label', dict.kdsMetric);
    setElemText('kds-empty-title', dict.kdsEmptyTitle);
    setElemText('kds-empty-desc', dict.kdsEmptyDesc);

    setElemText('pda-title-text', dict.pdaTitle);
    setElemText('pda-subtag-text', dict.pdaSubtag);
    setElemText('pda-desc-text', dict.pdaDesc);
    setElemText('pda-metric-label', dict.pdaMetric);
    setElemText('pda-empty-title', dict.pdaEmptyTitle);
    setElemText('pda-empty-desc', dict.pdaEmptyDesc);

    // Vista No-QR
    setElemText('no-qr-pill', dict.noQrTitle);
    setElemText('no-qr-desc-text', dict.noQrDesc);
    setElemText('btn-goto-mesa04-text', dict.btnGotoMesa04);

    // Actualizar enlace directo a carta móvil
    updateMobileMenuButton();

    // Re-renderizar tickets con los nuevos textos
    renderTableOrders(RESTAURANT_CONFIG.currentTable);
  }

  function updateStandTexts(dict) {
    const isEn = currentAppLang === 'en';
    const isMesa04 = RESTAURANT_CONFIG.currentTable === 'Mesa 04';

    const standTableTitle = document.getElementById('stand-table-title');
    const standZoneTitle = document.getElementById('stand-zone-title');

    if (standTableTitle) {
      standTableTitle.textContent = isEn ? 'TABLE 04' : 'MESA 04';
    }
    if (standZoneTitle) {
      standZoneTitle.textContent = isEn ? dict.zoneTerrace : 'Terraza Principal';
    }

    setElemText('status-waiting-text', dict.statusWaiting);
    setElemText('verified-title-text', dict.statusConnected);
    setElemText('verified-badge-pill', dict.verifiedBadge);
    setElemText('btn-wa-text', dict.openWhatsApp);
  }

  function setElemText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ========================================================
  // 2. RELOJ DE SERVICIO
  // ========================================================
  function initClock() {
    const clockEl = document.getElementById('live-clock');
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      if (clockEl) clockEl.textContent = `${h}:${m}:${s}`;
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  // ========================================================
  // 3. FONDO DE VÍDEO EN BUCLE
  // ========================================================
  function initVideoBackground() {
    const video = document.getElementById('bg-video-player');
    if (!video) return;

    video.addEventListener('ended', () => {
      currentVideoIndex = (currentVideoIndex + 1) % bgVideos.length;
      video.src = bgVideos[currentVideoIndex];
      video.play().catch(() => { });
    });

    video.addEventListener('error', () => {
      currentVideoIndex = (currentVideoIndex + 1) % bgVideos.length;
      video.src = bgVideos[currentVideoIndex];
      video.play().catch(() => { });
    });

    video.play().catch(() => {
      document.addEventListener('click', () => video.play().catch(() => { }), { once: true });
    });
  }

  // ========================================================
  // 4. CONTROL DE AUDIO
  // 4. CONTROL DE AUDIO & SINTETIZADOR RESILIENTE
  // ========================================================
  function initAudioSystem() {
    const unlock = () => {
      ensureAudioContext();
    };
    ['click', 'pointerdown', 'touchstart', 'keydown'].forEach((evt) => {
      document.addEventListener(evt, unlock, { once: true, passive: true });
    });
  }

  function ensureAudioContext() {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(() => { });
      }
    } catch (_) { }
    return audioContext;
  }

  function initSoundToggle() {
    const btn = document.getElementById('btn-sound-toggle');
    const icon = document.getElementById('sound-icon');
    const label = document.getElementById('sound-label');

    // Sonido ON por defecto
    soundEnabled = true;
    if (btn) btn.classList.add('sound-on');
    const dict = I18N[currentAppLang] || I18N.en;
    if (icon) icon.textContent = '🔔';
    if (label) label.textContent = dict.soundOn;

    btn?.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      const dict = I18N[currentAppLang] || I18N.en;
      if (icon) icon.textContent = soundEnabled ? '🔔' : '🔕';
      if (label) label.textContent = soundEnabled ? dict.soundOn : dict.soundOff;
      if (btn) btn.classList.toggle('sound-on', soundEnabled);
      if (soundEnabled) {
        ensureAudioContext();
        playChime(784.0, 'triangle', 0.25, 0.28);
      }
    });
  }

  function playChime(freq = 659.25, type = 'triangle', duration = 0.3, volume = 0.25) {
    if (!soundEnabled) return;
    try {
      const ctx = ensureAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) { }
  }

    // ========================================================
    // 5. SELECTOR DE MESAS (TABS)
    // ========================================================
    function initTableTabs() {
      const tabBtns = document.querySelectorAll('.table-tab-btn');
      tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          tabBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');

          const table = btn.dataset.table;
          const zone = currentAppLang === 'en' ? (btn.dataset.zoneEn || btn.dataset.zoneEs) : (btn.dataset.zoneEs || btn.dataset.zoneEn);
          const pin = btn.dataset.pin || (currentAppLang === 'en' ? 'EN-401' : 'N-401');

          RESTAURANT_CONFIG.currentTable = table;
          RESTAURANT_CONFIG.currentZone = zone;
          RESTAURANT_CONFIG.currentPin = pin;

          updateStandViewForTable(table, zone, pin);
          updateMobileMenuButton();
          renderTableOrders(table);
          playChime(523.25, 'sine', 0.15);
        });
      });
    }

    function updateStandViewForTable(table, zone, pin) {
      const standQrView = document.getElementById('stand-qr-view');
      const standNoQrView = document.getElementById('stand-no-qr-view');
      const noQrTableName = document.getElementById('no-qr-table-name');
      const noQrZoneName = document.getElementById('no-qr-zone-name');

      if (table === 'Mesa 04') {
        if (standQrView) standQrView.classList.remove('hidden');
        if (standNoQrView) standNoQrView.classList.add('hidden');

        const dict = I18N[currentAppLang] || I18N.en;
        updateStandTexts(dict);

        const effectivePin = currentAppLang === 'en' ? 'EN-401' : 'N-401';
        RESTAURANT_CONFIG.currentPin = effectivePin;
        currentQrSession.pin = effectivePin;
        requestTableQr('Mesa 04', effectivePin);
      } else {
        if (standQrView) standQrView.classList.add('hidden');
        if (standNoQrView) standNoQrView.classList.remove('hidden');
        if (noQrTableName) noQrTableName.textContent = table.toUpperCase();
        if (noQrZoneName) noQrZoneName.textContent = zone;
      }
    }

    function updateMobileMenuButton() {
      const btn = document.getElementById('btn-open-mobile-menu');
      if (!btn) return;
      const isMesa04 = RESTAURANT_CONFIG.currentTable === 'Mesa 04';
      const tableName = isMesa04 && currentAppLang === 'en' ? 'Table 04' : RESTAURANT_CONFIG.currentTable;
      const sessionPart = currentQrSession.sessionId ? `&session=${currentQrSession.sessionId}` : '';
      btn.href = `carta.html?table=${encodeURIComponent(tableName)}&lang=${currentAppLang}${sessionPart}`;
    }

    // ========================================================
    // 6. CONEXIÓN SOCKET.IO CON WHATAUTH API
    // ========================================================
    function initWhatAuthSocket() {
      try {
        const socket = io(RESTAURANT_CONFIG.wsUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true
        });

        socket.on('connect', () => {
          console.log('[WhatAuth WS] Conectado a socket:', socket.id);
          socket.emit('subscribe_table', {
            table: RESTAURANT_CONFIG.currentTable,
            domain: RESTAURANT_CONFIG.domain
          });
          const initialPin = currentAppLang === 'en' ? 'EN-401' : 'N-401';
          requestTableQr(RESTAURANT_CONFIG.currentTable, initialPin);
        });

        socket.on('qr_ready', (data) => {
          console.log('[WhatAuth WS] 🎫 qr_ready:', data);
          if (data && data.sessionId) {
            currentQrSession.sessionId = data.sessionId;
            socket.emit('join_qr_session', { sessionId: data.sessionId });
          }
          let walink = data.walink || data.url || '';
          if (walink) {
            try {
              const u = new URL(walink);
              if (!u.searchParams.get('phone') && RESTAURANT_CONFIG.phone) {
                u.searchParams.set('phone', RESTAURANT_CONFIG.phone);
              }
              walink = u.toString();
            } catch (_) { }
          }
          currentQrSession.walink = walink;

          const btnWa = document.getElementById('btn-direct-wa');
          if (btnWa && walink) btnWa.href = walink;

          renderStandQr(walink);
          updateMobileMenuButton();
        });

        // Escaneo verificado de WhatsApp
        socket.on('res_pixel_qr', handleScanVerified);
        socket.on('qr_verified', handleScanVerified);
        socket.on('pixel_qr_verified', handleScanVerified);

        // Eventos de comanda interactiva desde carta móvil vía Socket.IO
        socket.on('order_item_added', handleIncomingOrderItem);
        socket.on('order_submitted', handleIncomingOrderSubmitted);

        whatAuthSocket = socket;
      } catch (err) {
        console.warn('[WhatAuth WS] Error inicializando socket:', err);
      }
    }

    // ========================================================
    // 6B. CANAL LOCAL BROADCASTCHANNEL (SIN LATENCIA)
    // ========================================================
    function initBroadcastChannel() {
      if (!broadcast) return;
      broadcast.onmessage = (event) => {
        const { type, data } = event.data || {};
        if (type === 'order_item_added') {
          handleIncomingOrderItem(data);
        } else if (type === 'order_submitted') {
          handleIncomingOrderSubmitted(data);
        }
      };
    }

    function requestTableQr(tableName, pin) {
      if (!whatAuthSocket || !whatAuthSocket.connected) return;
      const isEn = currentAppLang === 'en';
      const qrText = (tableName === 'Mesa 04' && isEn) ? 'Table 04' : tableName;
      // IDs de ClientBranding en WhatAuth para Mesa 04 en ES y EN
      const brandingId = isEn
        ? '2cae5e2b-fa7d-4df9-afd2-245a50107b6b'
        : '694449f2-e021-4435-bca8-2d2b79458fc7';

      whatAuthSocket.emit('req_pixel_qr', {
        domain: RESTAURANT_CONFIG.domain,
        id: brandingId,
        text: qrText,
        pin: pin
      });
    }

    // ========================================================
    // 7. RENDERIZADO DEL QR PIXEL EN EL ATRIL (SIN MARGEN BLANCO)
    // ========================================================
    function renderStandQr(walink) {
      const target = document.getElementById('stand-qr-target');
      if (!target || !walink || typeof QRCodeStyling === 'undefined') return;

      target.innerHTML = '';

      try {
        activeQrStyling = new QRCodeStyling({
          width: 240,
          height: 240,
          type: 'svg',
          data: walink,
          image: RESTAURANT_CONFIG.logoUrl,
          margin: 0,
          qrOptions: { mode: 'Byte', errorCorrectionLevel: 'M' },
          dotsOptions: {
            color: '#121624',
            type: 'rounded'
          },
          backgroundOptions: { color: '#ffffff' },
          imageOptions: {
            crossOrigin: 'anonymous',
            margin: 3,
            imageSize: 0.24
          },
          cornersSquareOptions: {
            color: '#9B51E0',
            type: 'extra-rounded'
          },
          cornersDotOptions: {
            color: '#E056FD',
            type: 'dot'
          }
        });

        activeQrStyling.append(target);

        const fitSvgViewBox = () => {
          const svg = target.querySelector('svg');
          if (!svg) return;
          try {
            const qr = activeQrStyling._qr;
            const opts = activeQrStyling._options;
            if (qr && opts) {
              const count = qr.getModuleCount();
              const margin = opts.margin || 0;
              const avail = Math.min(opts.width, opts.height) - 2 * margin;
              const dotSize = Math.floor(avail / count);
              const qrSize = count * dotSize;
              const offsetX = Math.floor((opts.width - qrSize) / 2);
              const offsetY = Math.floor((opts.height - qrSize) / 2);
              const pad = 2;
              svg.setAttribute('viewBox', `${offsetX - pad} ${offsetY - pad} ${qrSize + 2 * pad} ${qrSize + 2 * pad}`);
            }
          } catch (err) {
            console.warn('[QR] Error recortando viewBox:', err);
          }
        };

        fitSvgViewBox();
        if (activeQrStyling._svgDrawingPromise && typeof activeQrStyling._svgDrawingPromise.then === 'function') {
          activeQrStyling._svgDrawingPromise.then(fitSvgViewBox);
        }
      } catch (e) {
        console.warn('[QR] Error renderizando QR Styling:', e);
      }
    }

    // ========================================================
    // 8. ESCANEO VERIFICADO
    // ========================================================
    function handleScanVerified(data) {
      console.log('[WhatAuth] 🎯 ¡Mesa escaneada y verificada!', data);

      const userObj = data?.user || {};
      const rawName = userObj.name || data?.senderName || data?.pushName || 'FNX Rent';
      const cleanName = String(rawName).trim();
      const rawPhone = userObj.phone || data?.senderPhone || data?.phone || RESTAURANT_CONFIG.phone;

      activeDiner = { name: cleanName, phone: rawPhone };

      const statusWaiting = document.getElementById('status-waiting');
      const statusVerified = document.getElementById('status-verified');
      const verifiedName = document.getElementById('verified-customer-name');
      const verifiedPhone = document.getElementById('verified-customer-phone');

      if (statusWaiting) statusWaiting.classList.add('hidden');
      if (statusVerified) statusVerified.classList.remove('hidden');
      if (verifiedName) verifiedName.textContent = cleanName;
      if (verifiedPhone) verifiedPhone.textContent = '🔒 ' + maskPhone(rawPhone);

      playChime(659.25, 'triangle', 0.5);
      // Doble campanada alegre y nítida al detectar el escaneo y el comensal
      playChime(659.25, 'triangle', 0.25, 0.32);
      setTimeout(() => playChime(880.0, 'triangle', 0.45, 0.35), 140);
      renderTableOrders(RESTAURANT_CONFIG.currentTable);
    }

    function maskPhone(phone) {
      if (!phone) return '+34 ••• •• 121';
      const clean = String(phone).replace(/\D/g, '');
      if (clean.length < 4) return '••••' + clean;
      return `+34 ••• •• ${clean.slice(-3)}`;
    }

    // ========================================================
    // 9. ESTADO ENTRANDO (TARJETA FANTASMA PROVISIONAL)
    // ========================================================
    function handleIncomingOrderItem(itemData) {
      if (!itemData || !itemData.name) return;
      const table = normalizeTableName(itemData.table || RESTAURANT_CONFIG.currentTable);
      const dict = I18N[currentAppLang] || I18N.en;

      // Actualizar estado en borrador (Ghost Card)
      if (!tableDrafts[table]) {
        tableDrafts[table] = {
          diner: itemData.dinerName || activeDiner?.name || dict.guest,
          items: {},
          timeoutId: null
        };
      }
      const tDraft = tableDrafts[table];
      if (itemData.dinerName) tDraft.diner = itemData.dinerName;

      const qty = typeof itemData.qty === 'number' ? itemData.qty : 1;
      if (qty > 0) {
        tDraft.items[itemData.id] = {
          id: itemData.id,
          name: itemData.name,
          category: itemData.category,
          price: itemData.price,
          qty: qty
        };
      } else {
        delete tDraft.items[itemData.id];
      }

      // Reiniciar temporizador de 5 minutos (auto-descarte si no se confirma la comanda)
      if (tDraft.timeoutId) clearTimeout(tDraft.timeoutId);
      tDraft.timeoutId = setTimeout(() => {
        console.log(`[Ghost Card] 5 minutos de inactividad en ${table}: descartando tarjeta fantasma provisional`);
        delete tableDrafts[table];
        renderTableOrders(table);
      }, 5 * 60 * 1000);

      // Sonido nítido de campana de cocina al seleccionar productos (con debounce anti-eco)
      const nowChime = Date.now();
      if (nowChime - lastItemChimeTs > 150) {
        lastItemChimeTs = nowChime;
        playChime(784.0, 'triangle', 0.25, 0.28);
      }

      // Renderizar para actualizar la tarjeta fantasma en KDS y PDA
      renderTableOrders(table);
    }

    // ========================================================
    // 10. ENVÍO DE COMANDA OFICIAL (CREACIÓN DE NUEVO TICKET CARD)
    // ========================================================
    function handleIncomingOrderSubmitted(orderData) {
      if (!orderData) return;
      const table = normalizeTableName(orderData.table || RESTAURANT_CONFIG.currentTable);

      if (!liveTableTickets[table]) {
        liveTableTickets[table] = [];
      }

      const ticketsList = liveTableTickets[table];
      const roundNumber = orderData.round || (ticketsList.length + 1);

      // Deduplicación 1: Por orderId único emitido desde la carta móvil
      if (orderData.orderId) {
        if (processedOrderIds.has(orderData.orderId)) {
          console.log(`[Orders] 🛑 Descartando orden duplicada (orderId: ${orderData.orderId})`);
          return;
        }
        processedOrderIds.add(orderData.orderId);
      }

      // Deduplicación 2: Ventana temporal anti-rebote (3.5 segundos) para misma mesa y misma ronda
      const now = Date.now();
      const isDuplicateRecent = ticketsList.some(
        (t) => t.round === roundNumber && (now - t.createdAt < 3500)
      );
      if (isDuplicateRecent) {
        console.log(`[Orders] 🛑 Descartando ticket duplicado para ${table} Ronda ${roundNumber} (<3.5s)`);
        return;
      }

      // 1. Limpiar borrador y cancelar el temporizador de 5 minutos al confirmarse la comanda
      if (tableDrafts[table]) {
        if (tableDrafts[table].timeoutId) clearTimeout(tableDrafts[table].timeoutId);
        delete tableDrafts[table];
      }

      const dinerName = orderData.dinerName || activeDiner?.name || 'Comensal en Mesa';

      // Separar comida (KDS) y bebida (PDA)
      const kdsItems = [];
      const pdaItems = [];

      if (Array.isArray(orderData.items)) {
        orderData.items.forEach((item) => {
          const isFood = item.category === 'paellas' || item.name.toLowerCase().includes('paella');
          if (isFood) {
            const note = item.name.toLowerCase().includes('señorret')
              ? 'Todo pelado · Gamba roja y sepia'
              : 'Pollo, conejo, bajoqueta y garrofó';
            kdsItems.push({
              id: item.id || ('kds_' + Date.now()),
              name: item.name,
              note,
              qty: item.qty || 1,
              status: 'cooking'
            });
          } else {
            const icon = item.name.toLowerCase().includes('rioja') ? '🍷' : (item.name.toLowerCase().includes('rueda') ? '🥂' : '💧');
            pdaItems.push({
              id: item.id || ('pda_' + Date.now()),
              name: item.name,
              qty: item.qty || 1,
              icon,
              served: false
            });
          }
        });
      }

      // Crear la nueva tarjeta de Ticket oficial con id único
      const newTicket = {
        id: orderData.orderId || ('ticket_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)),
        round: roundNumber,
        diner: dinerName,
        createdAt: Date.now(),
        kds: kdsItems,
        pda: pdaItems,
        kdsElapsed: 0,
        timerInterval: null
      };

      // Iniciar cronómetro para este ticket en KDS
      if (kdsItems.length > 0) {
        newTicket.timerInterval = setInterval(() => {
          newTicket.kdsElapsed++;
          const timerEl = document.getElementById(`timer-digits-${newTicket.id}`);
          if (timerEl) {
            timerEl.textContent = formatTimer(newTicket.kdsElapsed);
          }
        }, 1000);
      }

      // Insertar el nuevo ticket en la lista de la mesa
      ticketsList.push(newTicket);

      // Doble campana de fiesta
      playChime(784.0, 'triangle', 0.2);
      setTimeout(() => playChime(1046.5, 'triangle', 0.35), 180);

      // Renderizar KDS y PDA (el nuevo aparecerá arriba)
      renderTableOrders(table);
    }

    function normalizeTableName(table) {
      if (!table) return 'Mesa 04';
      if (table.toLowerCase().includes('04')) return 'Mesa 04';
      if (table.toLowerCase().includes('01')) return 'Mesa 01';
      if (table.toLowerCase().includes('07')) return 'Mesa 07';
      return table;
    }

    // ========================================================
    // 11. RENDERIZADO REACTIVO MULTI-TICKET DE KDS Y PDA
    // ========================================================
    function renderTableOrders(table) {
      if (table !== RESTAURANT_CONFIG.currentTable) return;

      const ticketsList = liveTableTickets[table] || [];
      const tDraft = tableDrafts[table];
      const kdsContainer = document.getElementById('kds-tickets-container');
      const pdaContainer = document.getElementById('pda-tickets-container');
      const kdsCountEl = document.getElementById('kds-count');
      const pdaCountEl = document.getElementById('pda-count');
      const dict = I18N[currentAppLang] || I18N.en;

      // Platos y bebidas en borrador (Ghost Card)
      const draftItems = tDraft ? Object.values(tDraft.items) : [];
      const draftFood = draftItems.filter((i) => i.category === 'paellas' || i.name.toLowerCase().includes('paella'));
      const draftDrinks = draftItems.filter((i) => i.category !== 'paellas' && !i.name.toLowerCase().includes('paella'));
      const draftDiner = tDraft?.diner || activeDiner?.name || dict.guest;

      // 1. KDS COCINA
      let totalFoodCount = 0;
      const ticketsWithFood = ticketsList.filter((t) => t.kds && t.kds.length > 0);
      ticketsWithFood.forEach((t) => {
        t.kds.forEach((i) => (totalFoodCount += i.qty));
      });
      if (kdsCountEl) kdsCountEl.textContent = totalFoodCount;

      if (ticketsWithFood.length === 0 && draftFood.length === 0) {
        if (kdsContainer) {
          kdsContainer.innerHTML = `
          <div class="kds-empty-placeholder" id="kds-empty-placeholder">
            <div class="empty-icon-wrap">🍳</div>
            <h4>${dict.kdsEmptyTitle}</h4>
            <p>${dict.kdsEmptyDesc}</p>
          </div>
        `;
        }
      } else {
        if (kdsContainer) {
          let kdsHtml = '';

          // Si hay platos en borrador, prepender la TARJETA FANTASMA arriba del todo
          if (draftFood.length > 0) {
            kdsHtml += `
            <article class="kds-ticket-card ghost-card" id="kds-ghost-card">
              <div class="ticket-header">
                <div class="ticket-table-tag">
                  <span class="badge-table">${table.toUpperCase()}</span>
                  <span class="badge-ghost">⚡ ${dict.ghostBadge}</span>
                  <span class="ticket-diner">${escapeHtml(draftDiner)}</span>
                </div>
                <div class="ticket-timer-badge ghost">
                  <span class="ghost-pulse-dot"></span>
                  <span class="ghost-status-lbl">${dict.ghostStatusDrafting}</span>
                </div>
              </div>

              <div class="ticket-body">
                <ul class="ticket-items-list">
                  ${draftFood
                .map(
                  (item) => `
                    <li class="ticket-item ghost-item">
                      <span class="item-qty">${item.qty}x</span>
                      <div class="item-info">
                        <span class="item-name">${escapeHtml(item.name)}</span>
                        <span class="item-note">${escapeHtml(dict.ghostItemNote)}</span>
                      </div>
                      <span class="item-status-pill ghost">${dict.ghostStatusPill}</span>
                    </li>
                  `
                )
                .join('')}
                </ul>
              </div>

              <div class="ticket-footer">
                <div class="ghost-card-notice">
                  <span>⏳ ${dict.ghostNotice}</span>
                </div>
              </div>
            </article>
          `;
          }

          // Renderizar los tickets confirmados en orden INVERSO (el último arriba)
          const sortedTickets = [...ticketsWithFood].reverse();
          kdsHtml += sortedTickets
            .map((ticket) => {
              const dinerName = ticket.diner || activeDiner?.name || dict.guest;
              const allReady = ticket.kds.every((i) => i.status === 'ready');
              const roundLabel = formatRoundTag(dict.ticketRoundLabel, ticket.round);

              return `
              <article class="kds-ticket-card ${allReady ? 'ready' : ''}" id="kds-card-${ticket.id}">
                <div class="ticket-header">
                  <div class="ticket-table-tag">
                    <span class="badge-table">${table.toUpperCase()}</span>
                    <span class="badge-round">${roundLabel}</span>
                    <span class="ticket-diner">${escapeHtml(dinerName)}</span>
                  </div>
                  <div class="ticket-timer-badge">
                    <span class="timer-dot"></span>
                    <span class="timer-digits" id="timer-digits-${ticket.id}">${formatTimer(ticket.kdsElapsed)}</span>
                  </div>
                </div>

                <div class="ticket-body">
                  <ul class="ticket-items-list">
                    ${ticket.kds
                  .map(
                    (item) => `
                      <li class="ticket-item">
                        <span class="item-qty">${item.qty}x</span>
                        <div class="item-info">
                          <span class="item-name">${escapeHtml(item.name)}</span>
                          <span class="item-note">${escapeHtml(item.note || '')}</span>
                        </div>
                        <span class="item-status-pill ${item.status === 'ready' ? 'ready' : 'cooking'}">
                          ${item.status === 'ready' ? dict.readyStatus : dict.cookingStatus}
                        </span>
                      </li>
                    `
                  )
                  .join('')}
                  </ul>
                </div>

                <div class="ticket-footer">
                  <button type="button" class="btn-kds-action btn-ready" onclick="window.markTicketReady('${table}', '${ticket.id}')">
                    <span>${dict.btnMarkReady}</span>
                  </button>
                </div>
              </article>
            `;
            })
            .join('');

          kdsContainer.innerHTML = kdsHtml;
        }
      }

      // 2. PDA SALA (BEBIDAS)
      let totalDrinkCount = 0;
      const ticketsWithDrinks = ticketsList.filter((t) => t.pda && t.pda.length > 0);
      ticketsWithDrinks.forEach((t) => {
        t.pda.forEach((i) => {
          if (!i.served) totalDrinkCount += i.qty;
        });
      });
      if (pdaCountEl) pdaCountEl.textContent = totalDrinkCount;

      if (ticketsWithDrinks.length === 0 && draftDrinks.length === 0) {
        if (pdaContainer) {
          pdaContainer.innerHTML = `
          <div class="pda-empty-placeholder" id="pda-empty-placeholder">
            <div class="empty-icon-wrap">🍷</div>
            <h4>${dict.pdaEmptyTitle}</h4>
            <p>${dict.pdaEmptyDesc}</p>
          </div>
        `;
        }
      } else {
        if (pdaContainer) {
          let pdaHtml = '';

          // Si hay bebidas en borrador, prepender la TARJETA FANTASMA arriba del todo
          if (draftDrinks.length > 0) {
            pdaHtml += `
            <article class="pda-ticket-card ghost-card" id="pda-ghost-card">
              <div class="pda-ticket-header">
                <div>
                  <span class="pda-table-badge">${table.toUpperCase()} · ${RESTAURANT_CONFIG.currentZone.toUpperCase()}</span>
                  <span class="badge-ghost" style="margin-left: 6px;">⚡ ${dict.ghostBadge}</span>
                </div>
                <div class="pda-diner-name">${escapeHtml(draftDiner)}</div>
              </div>

              <div class="pda-drinks-list">
                ${draftDrinks
                .map(
                  (item) => `
                  <div class="pda-item-row ghost-item">
                    <div class="pda-item-main">
                      <span class="pda-qty">${item.qty}x</span>
                      <span class="pda-icon">${item.name.toLowerCase().includes('rioja') ? '🍷' : (item.name.toLowerCase().includes('rueda') ? '🥂' : '💧')}</span>
                      <span class="pda-label">${escapeHtml(item.name)}</span>
                    </div>
                    <span class="btn-pda-serve ghost-btn">${dict.ghostPendingBtn}</span>
                  </div>
                `
                )
                .join('')}
              </div>

              <div class="ghost-card-notice">
                <span>⏳ ${dict.ghostNotice}</span>
              </div>
            </article>
          `;
          }

          // Renderizar los tickets confirmados en orden INVERSO (el último arriba)
          const sortedTickets = [...ticketsWithDrinks].reverse();
          pdaHtml += sortedTickets
            .map((ticket) => {
              const dinerName = ticket.diner || activeDiner?.name || dict.guest;
              const roundLabel = formatRoundTag(dict.ticketRoundLabel, ticket.round);

              return `
              <article class="pda-ticket-card" id="pda-card-${ticket.id}">
                <div class="pda-ticket-header">
                  <div>
                    <span class="pda-table-badge">${table.toUpperCase()} · ${RESTAURANT_CONFIG.currentZone.toUpperCase()}</span>
                    <span class="badge-round" style="margin-left: 6px;">${roundLabel}</span>
                  </div>
                  <div class="pda-diner-name">${escapeHtml(dinerName)}</div>
                </div>

                <div class="pda-drinks-list">
                  ${ticket.pda
                  .map(
                    (item, idx) => `
                    <div class="pda-item-row ${item.served ? 'item-served' : ''}" id="pda-row-${ticket.id}-${idx}">
                      <div class="pda-item-main">
                        <span class="pda-qty">${item.qty}x</span>
                        <span class="pda-icon">${item.icon || '🍷'}</span>
                        <span class="pda-label">${escapeHtml(item.name)}</span>
                      </div>
                      <button type="button" class="btn-pda-serve ${item.served ? 'btn-served' : ''}" 
                        onclick="window.serveDrinkInTicket('${table}', '${ticket.id}', ${idx})">
                        <span>${item.served ? dict.btnServed : dict.btnServe}</span>
                      </button>
                    </div>
                  `
                  )
                  .join('')}
                </div>

                <div class="pda-kitchen-alert hidden" id="pda-alert-${ticket.id}">
                  <div class="alert-bell">🛎️</div>
                  <div class="alert-content">
                    <strong>${dict.kitchenAlertTitle}</strong>
                    <p>${dict.kitchenAlertText.replace('{table}', table)} (${roundLabel})</p>
                  </div>
                  <button type="button" class="btn-pda-delivered" onclick="window.clearTicketKitchenAlert('${ticket.id}')">
                    <span>${dict.btnDelivered}</span>
                  </button>
                </div>
              </article>
            `;
            })
            .join('');

          pdaContainer.innerHTML = pdaHtml;
        }
      }
    }

    function formatTimer(totalSeconds) {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function formatRoundTag(template, roundNum) {
      const num = (roundNum !== undefined && roundNum !== null && !isNaN(Number(roundNum))) ? roundNum : 1;
      return String(template || 'TICKET #{round} · ROUND {round}').split('{round}').join(num);
    }

    function escapeHtml(str) {
      return String(str || '').replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[m]);
    }

    // ========================================================
    // 12. ACCIONES GLOBALES EXPUESTAS
    // ========================================================
    window.markTicketReady = function (tableName, ticketId) {
      const tickets = liveTableTickets[tableName];
      if (!tickets) return;
      const ticket = tickets.find((t) => t.id === ticketId);
      if (ticket) {
        ticket.kds.forEach((i) => (i.status = 'ready'));
        if (ticket.timerInterval) {
          clearInterval(ticket.timerInterval);
          ticket.timerInterval = null;
        }
        const alertEl = document.getElementById(`pda-alert-${ticketId}`);
        if (alertEl) alertEl.classList.remove('hidden');
        playChime(880, 'sine', 0.4);
        playChime(880.0, 'triangle', 0.35, 0.3);
        renderTableOrders(tableName);

        // Notificar en tiempo real a la carta móvil que la comanda está lista
        const statusPayload = {
          table: tableName,
          ticketId: ticketId,
          round: ticket.round,
          type: 'food',
          status: 'ready',
          timestamp: new Date().toISOString()
        };
        if (whatAuthSocket && whatAuthSocket.connected) {
          whatAuthSocket.emit('ticket_status_updated', statusPayload);
        }
        if (broadcast) {
          broadcast.postMessage({ type: 'ticket_status_updated', data: statusPayload });
        }
      }
    };

    window.serveDrinkInTicket = function (tableName, ticketId, itemIdx) {
      const tickets = liveTableTickets[tableName];
      if (!tickets) return;
      const ticket = tickets.find((t) => t.id === ticketId);
      if (ticket && ticket.pda[itemIdx]) {
        ticket.pda[itemIdx].served = !ticket.pda[itemIdx].served;
        playChime(523.25, 'sine', 0.15);
        const isServed = ticket.pda[itemIdx].served;
        playChime(523.25, 'sine', 0.18, 0.22);
        renderTableOrders(tableName);

        // Notificar en tiempo real a la carta móvil que la bebida ha sido servida
        const statusPayload = {
          table: tableName,
          ticketId: ticketId,
          round: ticket.round,
          itemName: ticket.pda[itemIdx].name,
          type: 'drink',
          status: isServed ? 'served' : 'preparing',
          timestamp: new Date().toISOString()
        };
        if (whatAuthSocket && whatAuthSocket.connected) {
          whatAuthSocket.emit('ticket_status_updated', statusPayload);
        }
        if (broadcast) {
          broadcast.postMessage({ type: 'ticket_status_updated', data: statusPayload });
        }
      }
    };

    window.clearTicketKitchenAlert = function (ticketId) {
      const alertEl = document.getElementById(`pda-alert-${ticketId}`);
      if (alertEl) alertEl.classList.add('hidden');
      playChime(659.25, 'triangle', 0.2);
    };

    window.switchToTable = function (tableName) {
      const targetTab = document.querySelector(`.table-tab-btn[data-table="${tableName}"]`);
      if (targetTab) targetTab.click();
    };
  }) ();

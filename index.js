/**
 * FNX RESTAURANT — LÓGICA DE CONTROL DESKTOP (KDS, PDA & POSA-QR)
 * Integración WhatAuth Pixel QR en tiempo real con Socket.IO y BroadcastChannel
 */

(function () {
  'use strict';

  // Configuración WhatAuth & Restaurante
  const RESTAURANT_CONFIG = {
    domain: 'carta.fenix.ninja',
    phone: '34627118121',
    wsUrl: 'https://api.whatauth.com',
    logoUrl: 'src/img/logo.png',
    currentTable: 'Mesa 04',
    currentZone: 'Terraza Principal',
    soundEnabled: true
  };

  // Vídeos gastronómicos para el carrusel de fondo (sin audio y en bucle continuo)
  const BG_VIDEOS = [
    'src/video/chef_cooking.mp4',
    'src/video/waiter_taking_order.mp4',
    'src/video/patrons_dining_terrace.mp4',
    'src/video/couple_dining.mp4',
    'src/video/chefs_kitchen.mp4',
    'src/video/waiter_arranging_plates.mp4',
    'src/video/people_cafe_terrace.mp4',
    'src/video/people_coffee_shop.mp4',
    'src/video/barista_coffee.mp4',
    'src/video/woman_smartphone.mp4'
  ];
  let currentVideoIdx = 0;

  // Estado de las comandas por mesa:
  // - Mesa 04 arranca 100% VACÍA para recibir pedidos en vivo desde carta móvil / WhatAuth
  // - Mesas 01 y 07 muestran comandas presenciales de sala
  const liveTableOrders = {
    'Mesa 01': {
      kds: [
        { id: 'arroz_horno', name: 'Arroz al Horno Tradicional', note: 'Costilla, morcilla y garbanzos', qty: 1, status: 'cooking' }
      ],
      pda: [
        { id: 'mahou', name: 'Caña Mahou 5 Estrellas', icon: '🍺', qty: 2, served: false }
      ],
      diner: 'Cliente en Salón'
    },
    'Mesa 04': {
      kds: [], // Totalmente vacía de inicio como requiere el usuario
      pda: [], // Totalmente vacía de inicio como requiere el usuario
      diner: null
    },
    'Mesa 07': {
      kds: [
        { id: 'fideua', name: 'Fideuà de Gandía con Alioli', note: 'Fideo fino, rape y gambas', qty: 1, status: 'cooking' }
      ],
      pda: [
        { id: 'moet', name: 'Champagne Moët & Chandon', icon: '🍾', qty: 1, served: false }
      ],
      diner: 'Reserva VIP'
    }
  };

  // Estado reactivo
  let whatAuthSocket = null;
  let currentQrSession = null;
  let activeQrStyling = null;
  let activeDiner = null;
  let audioContext = null;

  // Temporizadores KDS
  let kdsTimerInterval = null;
  let kdsElapsedSeconds = 0;

  // Canal local BroadcastChannel
  const broadcast = (typeof BroadcastChannel !== 'undefined')
    ? new BroadcastChannel('fnx_restaurant_orders')
    : null;

  // ========================================================
  // INICIALIZACIÓN
  // ========================================================
  window.addEventListener('DOMContentLoaded', () => {
    initClock();
    initVideoBackground();
    initTableSwitcher();
    initSoundToggle();
    renderTableOrders(RESTAURANT_CONFIG.currentTable);
    initWhatAuthSocket();
    initBroadcastChannel();
  });

  // ========================================================
  // 1. RELOJ EN VIVO
  // ========================================================
  function initClock() {
    const clockEl = document.getElementById('live-clock');
    if (!clockEl) return;

    function update() {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
    update();
    setInterval(update, 1000);
  }

  // ========================================================
  // 2. FONDO DE VÍDEO EN BUCLE SECUENCIAL (SIN AUDIO)
  // ========================================================
  function initVideoBackground() {
    const videoPlayer = document.getElementById('bg-video-player');
    if (!videoPlayer) return;

    videoPlayer.muted = true;
    videoPlayer.defaultMuted = true;
    videoPlayer.volume = 0;
    videoPlayer.playsInline = true;
    videoPlayer.removeAttribute('loop');
    videoPlayer.loop = false;

    function playNextVideo() {
      currentVideoIdx = (currentVideoIdx + 1) % BG_VIDEOS.length;
      videoPlayer.style.opacity = '0';
      setTimeout(() => {
        videoPlayer.src = BG_VIDEOS[currentVideoIdx];
        videoPlayer.muted = true;
        videoPlayer.volume = 0;
        videoPlayer.load();
        videoPlayer.play().catch((e) => {
          console.log('[Video] Autoplay espera interacción o carga:', e);
        });
        videoPlayer.style.opacity = '1';
      }, 400);
    }

    videoPlayer.addEventListener('ended', playNextVideo);
    videoPlayer.addEventListener('error', (e) => {
      console.warn('[Video] Error cargando vídeo, saltando al siguiente:', e);
      playNextVideo();
    });

    window.nextBackgroundVideo = playNextVideo;

    videoPlayer.play().catch((err) => {
      console.warn('[Video] Autoplay mitigado por política del navegador:', err);
    });
  }

  // ========================================================
  // 3. SELECTOR DE MESAS
  // - Solo Mesa 04 tiene código QR WhatAuth activo
  // - Mesas 01 y 07 ocultan el QR y muestran comanda directa de sala
  // ========================================================
  function initTableSwitcher() {
    const tabs = document.querySelectorAll('.table-tab-btn');
    const standQrView = document.getElementById('stand-qr-view');
    const standNoQrView = document.getElementById('stand-no-qr-view');
    const noQrTableName = document.getElementById('no-qr-table-name');
    const noQrZoneName = document.getElementById('no-qr-zone-name');
    const standTableTitle = document.getElementById('stand-table-title');
    const standZoneTitle = document.getElementById('stand-zone-title');
    const btnOpenMobile = document.getElementById('btn-open-mobile-menu');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        const tableName = tab.dataset.table || 'Mesa 04';
        const zoneName = tab.dataset.zone || 'Terraza';
        const pin = tab.dataset.pin || 'N-401';

        RESTAURANT_CONFIG.currentTable = tableName;
        RESTAURANT_CONFIG.currentZone = zoneName;

        // Actualizar botón de carta móvil en cabecera
        if (btnOpenMobile) {
          const sessId = currentQrSession?.sessionId || 'live';
          btnOpenMobile.href = `carta.html?session=${sessId}&table=${encodeURIComponent(tableName)}`;
        }

        // LÓGICA DE QR: Solo Mesa 04 tiene QR
        if (tableName === 'Mesa 04') {
          if (standQrView) standQrView.classList.remove('hidden');
          if (standNoQrView) standNoQrView.classList.add('hidden');
          if (standTableTitle) standTableTitle.textContent = 'MESA 04';
          if (standZoneTitle) standZoneTitle.textContent = 'Terraza Principal';

          // Solicitar QR de Mesa 04 si aún no se había generado
          if (!activeQrStyling && whatAuthSocket && whatAuthSocket.connected) {
            requestTableQr('Mesa 04', 'N-401');
          }
        } else {
          // Mesas 01 y 07: Sin QR, solo KDS y PDA
          if (standQrView) standQrView.classList.add('hidden');
          if (standNoQrView) standNoQrView.classList.remove('hidden');
          if (noQrTableName) noQrTableName.textContent = tableName.toUpperCase();
          if (noQrZoneName) noQrZoneName.textContent = zoneName;
        }

        // Renderizar KDS y PDA para la mesa seleccionada
        renderTableOrders(tableName);
        playChime(440, 'sine', 0.1);
      });
    });
  }

  // ========================================================
  // 4. SINTETIZADOR DE AUDIO (BELL CHIME)
  // ========================================================
  function initSoundToggle() {
    const btn = document.getElementById('btn-sound-toggle');
    const icon = document.getElementById('sound-icon');
    const label = document.getElementById('sound-label');

    btn?.addEventListener('click', () => {
      RESTAURANT_CONFIG.soundEnabled = !RESTAURANT_CONFIG.soundEnabled;
      if (icon) icon.textContent = RESTAURANT_CONFIG.soundEnabled ? '🔔' : '🔕';
      if (label) label.textContent = RESTAURANT_CONFIG.soundEnabled ? 'Sonido ON' : 'Silencio';
      if (RESTAURANT_CONFIG.soundEnabled) playChime(587.33, 'triangle', 0.2);
    });
  }

  function playChime(freq = 523.25, type = 'sine', duration = 0.35) {
    if (!RESTAURANT_CONFIG.soundEnabled) return;
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioContext.currentTime);
      gain.gain.setValueAtTime(0.18, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + duration);
    } catch (_) { }
  }

  // ========================================================
  // 5. TEMPORIZADOR DE MARCHAS KDS
  // ========================================================
  function startKdsTimer() {
    if (kdsTimerInterval) return;
    kdsElapsedSeconds = 0;
    kdsTimerInterval = setInterval(() => {
      kdsElapsedSeconds++;
      const digits = document.getElementById('timer-kds-digits');
      if (digits) digits.textContent = formatTimer(kdsElapsedSeconds);
    }, 1000);
  }

  function formatTimer(totalSecs) {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // ========================================================
  // 6. CONEXIÓN WEBSOCKET WHATAUTH & SALA DE MESA
  // ========================================================
  function initWhatAuthSocket() {
    try {
      const socket = io(RESTAURANT_CONFIG.wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1500
      });

      socket.on('connect', () => {
        console.log('[WhatAuth WS] Conectado a', RESTAURANT_CONFIG.wsUrl, 'ID:', socket.id);
        // Suscribirse a la mesa y al dominio
        socket.emit('subscribe_table', { table: RESTAURANT_CONFIG.currentTable, domain: RESTAURANT_CONFIG.domain });
        socket.emit('subscribe_pixel', { domain: RESTAURANT_CONFIG.domain });

        // Solo solicitar QR para Mesa 04
        if (RESTAURANT_CONFIG.currentTable === 'Mesa 04') {
          requestTableQr('Mesa 04', 'N-401');
        }
      });

      // Recepción de QR generado por el servidor
      socket.on('qr_ready', (data) => {
        if (!data || !data.success) return;
        currentQrSession = data;
        console.log('[WhatAuth WS] QR Ready para mesa:', data);

        let walink = data.walink || '';
        if (RESTAURANT_CONFIG.phone && walink) {
          try {
            const u = new URL(walink);
            if (u.hostname === 'wa.me') {
              u.pathname = `/${RESTAURANT_CONFIG.phone}`;
            } else {
              u.searchParams.set('phone', RESTAURANT_CONFIG.phone);
            }
            walink = u.toString();
          } catch (_) { }
        }
        currentQrSession.walink = walink;

        renderStandQr(walink);

        const btnDirectWa = document.getElementById('btn-direct-wa');
        if (btnDirectWa) btnDirectWa.href = walink;

        const btnOpenMobile = document.getElementById('btn-open-mobile-menu');
        if (btnOpenMobile) {
          btnOpenMobile.href = `carta.html?session=${data.sessionId}&table=${encodeURIComponent(RESTAURANT_CONFIG.currentTable)}`;
        }
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
        console.log('[BroadcastChannel] 📦 order_item_added:', data);
        handleIncomingOrderItem(data);
      } else if (type === 'order_submitted') {
        console.log('[BroadcastChannel] 🚀 order_submitted:', data);
        handleIncomingOrderSubmitted(data);
      }
    };
  }

  function requestTableQr(tableName, pin) {
    if (!whatAuthSocket || !whatAuthSocket.connected) return;
    whatAuthSocket.emit('req_pixel_qr', {
      domain: RESTAURANT_CONFIG.domain,
      id: `${tableName.replace(/\s+/g, '')}_${pin}`,
      text: tableName,
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
    if (liveTableOrders['Mesa 04']) {
      liveTableOrders['Mesa 04'].diner = cleanName;
    }

    const statusWaiting = document.getElementById('status-waiting');
    const statusVerified = document.getElementById('status-verified');
    const verifiedName = document.getElementById('verified-customer-name');
    const verifiedPhone = document.getElementById('verified-customer-phone');

    if (statusWaiting) statusWaiting.classList.add('hidden');
    if (statusVerified) statusVerified.classList.remove('hidden');
    if (verifiedName) verifiedName.textContent = cleanName;
    if (verifiedPhone) verifiedPhone.textContent = '🔒 ' + maskPhone(rawPhone);

    playChime(659.25, 'triangle', 0.5);
    renderTableOrders(RESTAURANT_CONFIG.currentTable);
  }

  function maskPhone(phone) {
    if (!phone) return '+34 ••• •• 121';
    const clean = String(phone).replace(/\D/g, '');
    if (clean.length < 4) return '••••' + clean;
    return `+34 ••• •• ${clean.slice(-3)}`;
  }

  // ========================================================
  // 9. PROCESAMIENTO DE COMANDA EN TIEMPO REAL
  // ========================================================
  function handleIncomingOrderItem(itemData) {
    if (!itemData || !itemData.name) return;
    const table = itemData.table || RESTAURANT_CONFIG.currentTable;

    if (!liveTableOrders[table]) {
      liveTableOrders[table] = { kds: [], pda: [], diner: null };
    }

    const tData = liveTableOrders[table];

    // Clasificar: paellas a KDS, bebidas a PDA
    if (itemData.category === 'paellas' || itemData.name.toLowerCase().includes('paella')) {
      const existing = tData.kds.find((i) => i.name === itemData.name);
      if (existing) {
        existing.qty += (itemData.qty || 1);
      } else {
        const note = itemData.name.toLowerCase().includes('señorret')
          ? 'Todo pelado · Gamba roja y sepia'
          : 'Pollo, conejo, bajoqueta y garrofó';
        tData.kds.push({
          id: itemData.id || ('kds_' + Date.now()),
          name: itemData.name,
          note,
          qty: itemData.qty || 1,
          status: 'cooking'
        });
      }
      startKdsTimer();
    } else {
      const existing = tData.pda.find((i) => i.name === itemData.name);
      if (existing) {
        existing.qty += (itemData.qty || 1);
      } else {
        const icon = itemData.name.toLowerCase().includes('rioja') ? '🍷' : (itemData.name.toLowerCase().includes('rueda') ? '🥂' : '💧');
        tData.pda.push({
          id: itemData.id || ('pda_' + Date.now()),
          name: itemData.name,
          qty: itemData.qty || 1,
          icon,
          served: false
        });
      }
    }

    playChime(784, 'triangle', 0.25);
    renderTableOrders(table);
  }

  function handleIncomingOrderSubmitted(orderData) {
    if (!orderData) return;
    const table = orderData.table || RESTAURANT_CONFIG.currentTable;

    if (!liveTableOrders[table]) {
      liveTableOrders[table] = { kds: [], pda: [], diner: null };
    }

    const tData = liveTableOrders[table];
    if (orderData.dinerName) {
      tData.diner = orderData.dinerName;
    }

    if (Array.isArray(orderData.items)) {
      orderData.items.forEach((item) => {
        if (item.category === 'paellas' || item.name.toLowerCase().includes('paella')) {
          const existing = tData.kds.find((i) => i.name === item.name);
          if (existing) {
            existing.qty = Math.max(existing.qty, item.qty);
          } else {
            const note = item.name.toLowerCase().includes('señorret')
              ? 'Todo pelado · Gamba roja y sepia'
              : 'Pollo, conejo, bajoqueta y garrofó';
            tData.kds.push({
              id: item.id || ('kds_' + Date.now()),
              name: item.name,
              note,
              qty: item.qty,
              status: 'cooking'
            });
          }
        } else {
          const existing = tData.pda.find((i) => i.name === item.name);
          if (existing) {
            existing.qty = Math.max(existing.qty, item.qty);
          } else {
            const icon = item.name.toLowerCase().includes('rioja') ? '🍷' : (item.name.toLowerCase().includes('rueda') ? '🥂' : '💧');
            tData.pda.push({
              id: item.id || ('pda_' + Date.now()),
              name: item.name,
              qty: item.qty,
              icon,
              served: false
            });
          }
        }
      });
    }

    // Doble campana de fiesta
    playChime(784.0, 'triangle', 0.2);
    setTimeout(() => playChime(1046.5, 'triangle', 0.35), 180);

    startKdsTimer();
    renderTableOrders(table);
  }

  // ========================================================
  // 10. RENDERIZADO REACTIVO DE KDS Y PDA
  // ========================================================
  function renderTableOrders(table) {
    if (table !== RESTAURANT_CONFIG.currentTable) return;

    const tData = liveTableOrders[table] || { kds: [], pda: [], diner: null };
    const kdsContainer = document.getElementById('kds-tickets-container');
    const pdaContainer = document.getElementById('pda-tickets-container');
    const kdsCountEl = document.getElementById('kds-count');
    const pdaCountEl = document.getElementById('pda-count');

    // 1. KDS COCINA
    let totalFoodCount = 0;
    tData.kds.forEach((i) => (totalFoodCount += i.qty));
    if (kdsCountEl) kdsCountEl.textContent = totalFoodCount;

    if (tData.kds.length === 0) {
      if (kdsContainer) {
        kdsContainer.innerHTML = `
          <div class="kds-empty-placeholder" id="kds-empty-placeholder">
            <div class="empty-icon-wrap">🍳</div>
            <h4>Cocina en Espera de Comanda</h4>
            <p>Escanea el QR de la ${table} o pulsa "Abrir Carta Móvil" para marchar paellas en tiempo real.</p>
          </div>
        `;
      }
    } else {
      const dinerName = tData.diner || activeDiner?.name || 'Comensal en Mesa';
      if (kdsContainer) {
        kdsContainer.innerHTML = `
          <article class="kds-ticket-card" id="ticket-kds-active">
            <div class="ticket-header">
              <div class="ticket-table-tag">
                <span class="badge-table">${table.toUpperCase()}</span>
                <span class="ticket-diner">Comensal: ${escapeHtml(dinerName)}</span>
              </div>
              <div class="ticket-timer-badge">
                <span class="timer-dot"></span>
                <span class="timer-digits" id="timer-kds-digits">${formatTimer(kdsElapsedSeconds)}</span>
              </div>
            </div>

            <div class="ticket-body">
              <ul class="ticket-items-list">
                ${tData.kds
                  .map(
                    (item) => `
                  <li class="ticket-item">
                    <span class="item-qty">${item.qty}x</span>
                    <div class="item-info">
                      <span class="item-name">${escapeHtml(item.name)}</span>
                      <span class="item-note">${escapeHtml(item.note || '')}</span>
                    </div>
                    <span class="item-status-pill ${item.status === 'ready' ? 'ready' : 'cooking'}">
                      ${item.status === 'ready' ? '✓ Listo para Servir' : 'Fuego Activo'}
                    </span>
                  </li>
                `
                  )
                  .join('')}
              </ul>
            </div>

            <div class="ticket-footer">
              <button type="button" class="btn-kds-action btn-ready" onclick="window.markDishReady('${table}')">
                <span>🍽️ Marcar Listo para Servir</span>
              </button>
            </div>
          </article>
        `;
      }
    }

    // 2. PDA SALA (BEBIDAS)
    let totalDrinkCount = 0;
    tData.pda.forEach((i) => {
      if (!i.served) totalDrinkCount += i.qty;
    });
    if (pdaCountEl) pdaCountEl.textContent = totalDrinkCount;

    if (tData.pda.length === 0) {
      if (pdaContainer) {
        pdaContainer.innerHTML = `
          <div class="pda-empty-placeholder" id="pda-empty-placeholder">
            <div class="empty-icon-wrap">🍷</div>
            <h4>Sin Bebidas Pendientes</h4>
            <p>Las bebidas añadidas desde la carta móvil aparecerán aquí para el servicio de sala.</p>
          </div>
        `;
      }
    } else {
      const dinerName = tData.diner || activeDiner?.name || 'Conectando...';
      if (pdaContainer) {
        pdaContainer.innerHTML = `
          <article class="pda-ticket-card" id="ticket-pda-active">
            <div class="pda-ticket-header">
              <div class="pda-table-badge">${table.toUpperCase()} · ${RESTAURANT_CONFIG.currentZone.toUpperCase()}</div>
              <div class="pda-diner-name">Comensal: ${escapeHtml(dinerName)}</div>
            </div>

            <div class="pda-drinks-list">
              ${tData.pda
                .map(
                  (item, idx) => `
                <div class="pda-item-row ${item.served ? 'item-served' : ''}" id="pda-row-${idx}">
                  <div class="pda-item-main">
                    <span class="pda-qty">${item.qty}x</span>
                    <span class="pda-icon">${item.icon || '🍷'}</span>
                    <span class="pda-label">${escapeHtml(item.name)}</span>
                  </div>
                  <button type="button" class="btn-pda-serve ${item.served ? 'btn-served' : ''}" 
                    onclick="window.serveDrinkItem('${table}', ${idx})">
                    <span>${item.served ? '✓ Servido' : '✓ Servir'}</span>
                  </button>
                </div>
              `
                )
                .join('')}
            </div>

            <div class="pda-kitchen-alert hidden" id="pda-kitchen-alert">
              <div class="alert-bell">🛎️</div>
              <div class="alert-content">
                <strong>¡Plato de Cocina Listo!</strong>
                <p id="pda-alert-text">Llevar Paellas a ${table}</p>
              </div>
              <button type="button" class="btn-pda-delivered" onclick="window.clearKitchenAlert()">
                <span>Entregado</span>
              </button>
            </div>
          </article>
        `;
      }
    }
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
  // 11. ACCIONES GLOBALES EXPUESTAS
  // ========================================================
  window.markDishReady = function (tableName) {
    const tData = liveTableOrders[tableName];
    if (tData) {
      tData.kds.forEach((i) => (i.status = 'ready'));
    }
    const alertEl = document.getElementById('pda-kitchen-alert');
    const alertText = document.getElementById('pda-alert-text');
    if (alertEl) alertEl.classList.remove('hidden');
    if (alertText) alertText.textContent = `Llevar Paellas a ${tableName}`;
    playChime(880, 'sine', 0.4);
    renderTableOrders(tableName);
  };

  window.serveDrinkItem = function (tableName, idx) {
    const tData = liveTableOrders[tableName];
    if (tData && tData.pda[idx]) {
      tData.pda[idx].served = !tData.pda[idx].served;
      playChime(523.25, 'sine', 0.15);
      renderTableOrders(tableName);
    }
  };

  window.clearKitchenAlert = function () {
    const alertEl = document.getElementById('pda-kitchen-alert');
    if (alertEl) alertEl.classList.add('hidden');
    playChime(659.25, 'triangle', 0.2);
  };

  window.switchToTable = function (tableName) {
    const targetTab = document.querySelector(`.table-tab-btn[data-table="${tableName}"]`);
    if (targetTab) targetTab.click();
  };
})();

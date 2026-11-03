/**
 * FNX RESTAURANT — CARTA DIGITAL MÓVIL (carta.js)
 * Conexión en tiempo real con KDS y PDA a través de WhatAuth Socket.IO
 * Soporte Multi-idioma (ES / EN), Gestión de Rondas y Tracker de Estado en Vivo
 */

(function () {
  'use strict';

  const CARTA_CONFIG = {
    wsUrl: 'https://api.whatauth.com',
    domain: 'carta.fenix.ninja'
  };

  // Parámetros de URL
  const urlParams = new URLSearchParams(window.location.search);
  const currentSessionId = urlParams.get('session') || urlParams.get('sessionId') || 'live';
  const currentTable = urlParams.get('table') || 'Mesa 04';
  const currentDinerName = urlParams.get('name') || '';

  // Detección inicial de idioma: inglés por defecto para el mundo, español para navegadores de habla hispana
  let currentLang = 'en';
  const paramLang = (urlParams.get('lang') || '').toLowerCase();
  if (paramLang === 'es' || paramLang === 'en') {
    currentLang = paramLang;
  } else {
    const navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    currentLang = navLang.startsWith('es') ? 'es' : 'en';
  }

  // Diccionario I18N
  const I18N = {
    es: {
      headerSub: 'Carta Digital en Vivo',
      welcomeTag: 'MESA CONECTADA · WHATSAUTH',
      welcomeGreetingDefault: '¡Hola! Bienvenido a {table} 🍽️✨',
      welcomeGreetingNamed: '¡Hola, {name}! 🍽️✨',
      welcomeDesc: 'Selecciona tus platos y bebidas. Cada cambio se sincroniza en directo con la cocina y el camarero.',
      catPaellas: 'Paellas & Arroces',
      badgePaellas: 'DIRECTO A COCINA · KDS',
      catVinos: 'Vinos & Bodega',
      badgeVinos: 'SERVICIO DE SALA · PDA',
      catAguas: 'Aguas Minerales',
      badgeAguas: 'SERVICIO DE SALA · PDA',
      prodPaellaVal: {
        title: 'Paella Valenciana Tradicional',
        desc: 'Pollo de corral, conejo, bajoqueta, garrofó y azafrán en hebra D.O. Valencia.',
        allergen: '🌾 Sin Gluten'
      },
      prodPaellaSen: {
        title: 'Paella de Marisco del Señorret',
        desc: 'Todo pelado para disfrutar: gamba roja de Denia, sepia limpia y mejillón de roca.',
        allergen: '🦐 Marisco'
      },
      prodVinoRioja: {
        title: 'Vino Tinto D.O. Rioja Crianza',
        desc: 'Tempranillo crianza en barrica de roble francés. Notas a frutos rojos y especias.',
        allergen: '🍇 750 ml'
      },
      prodVinoRueda: {
        title: 'Vino Blanco D.O. Rueda Verdejo',
        desc: 'Verdejo monovarietal fresco y afrutado, servido en cubitera con hielo.',
        allergen: '🥂 750 ml'
      },
      prodAguaMin: {
        title: 'Agua Mineral Natural 1L',
        desc: 'Agua de manantial servida en botella de vidrio frío.',
        allergen: '💧 1 Litro'
      },
      orderCountSingular: '1 plato seleccionado',
      orderCountPlural: '{n} productos seleccionados',
      orderCountEmpty: '0 platos seleccionados',
      btnSubmit: '🚀 Enviar a Cocina',
      roundTitle: 'Comanda enviada a cocina (Ronda {n})',
      roundSubtitle: '¿Deseas pedir algo más? Selecciona nuevos platos o bebidas abajo.',
      modalTitle: '¡Comanda Enviada a Cocina!',
      modalDesc: 'Tu pedido ya está marchando en el KDS de cocina y las bebidas han sido asignadas al PDA del camarero.',
      modalTableTag: 'Mesa:',
      modalTimeTag: 'Tiempo Estimado:',
      modalClose: 'Entendido',
      trackerHeading: 'Estado de tu Comanda',
      trackerRoundTag: 'Ronda {n}',
      trackerKitchenTitle: 'Cocina · Paellas',
      trackerKitchenDescCooking: 'Preparando en los fogones (~18-20 min)...',
      trackerKitchenDescReady: '¡Listo para servir! Tu paella marcha a tu mesa',
      trackerKitchenPillCooking: 'Preparando',
      trackerKitchenPillReady: '✓ Listo',
      trackerDrinksTitle: 'Sala · Bebidas',
      trackerDrinksDescPreparing: 'Preparando en barra para mesa...',
      trackerDrinksDescServed: 'Bebidas servidas en mesa. ¡Salud!',
      trackerDrinksPillPreparing: 'Preparando',
      trackerDrinksPillServed: '✓ Servido'
    },
    en: {
      headerSub: 'Live Digital Menu',
      welcomeTag: 'TABLE CONNECTED · WHATSAUTH',
      welcomeGreetingDefault: 'Hello! Welcome to {table} 🍽️✨',
      welcomeGreetingNamed: 'Hello, {name}! 🍽️✨',
      welcomeDesc: 'Select your dishes and drinks. Every update synchronizes live with the kitchen and waiter.',
      catPaellas: 'Paellas & Rice Dishes',
      badgePaellas: 'DIRECT TO KITCHEN · KDS',
      catVinos: 'Wines & Cellar',
      badgeVinos: 'FLOOR SERVICE · PDA',
      catAguas: 'Mineral Waters',
      badgeAguas: 'FLOOR SERVICE · PDA',
      prodPaellaVal: {
        title: 'Traditional Valencian Paella',
        desc: 'Free-range chicken, rabbit, green beans, lima beans, and Valencian saffron.',
        allergen: '🌾 Gluten-Free'
      },
      prodPaellaSen: {
        title: 'Señorret Seafood Paella',
        desc: 'Peeled for effortless dining: Denia red prawns, tender cuttlefish, and rock mussels.',
        allergen: '🦐 Shellfish'
      },
      prodVinoRioja: {
        title: 'Red Wine D.O. Rioja Crianza',
        desc: 'Oak-aged Tempranillo. Rich red berry and spiced oak aromas.',
        allergen: '🍇 750 ml'
      },
      prodVinoRueda: {
        title: 'White Wine D.O. Rueda Verdejo',
        desc: 'Fresh, aromatic single-variety Verdejo served chilled on ice.',
        allergen: '🥂 750 ml'
      },
      prodAguaMin: {
        title: 'Natural Spring Water 1L',
        desc: 'Pure mountain spring water served in a chilled glass bottle.',
        allergen: '💧 1 Liter'
      },
      orderCountSingular: '1 item selected',
      orderCountPlural: '{n} items selected',
      orderCountEmpty: '0 items selected',
      btnSubmit: '🚀 Send to Kitchen',
      roundTitle: 'Order sent to kitchen (Round {n})',
      roundSubtitle: 'Would you like to order anything else? Select new dishes or drinks below.',
      modalTitle: 'Order Sent to Kitchen!',
      modalDesc: 'Your order is now on the kitchen KDS display and drinks have been routed to the waiter PDA.',
      modalTableTag: 'Table:',
      modalTimeTag: 'Estimated Time:',
      modalClose: 'Got it',
      trackerHeading: 'Live Order Status',
      trackerRoundTag: 'Round {n}',
      trackerKitchenTitle: 'Kitchen · Paellas',
      trackerKitchenDescCooking: 'Cooking on the stoves (~18-20 min)...',
      trackerKitchenDescReady: 'Ready to serve! Your paella is heading to your table',
      trackerKitchenPillCooking: 'Cooking',
      trackerKitchenPillReady: '✓ Ready',
      trackerDrinksTitle: 'Floor · Drinks',
      trackerDrinksDescPreparing: 'Preparing at bar for table...',
      trackerDrinksDescServed: 'Drinks served at table. Cheers!',
      trackerDrinksPillPreparing: 'Preparing',
      trackerDrinksPillServed: '✓ Served'
    }
  };

  // Canal de difusión local para sincronización instantánea en el mismo navegador
  const broadcast = (typeof BroadcastChannel !== 'undefined')
    ? new BroadcastChannel('fnx_restaurant_orders')
    : null;

  // Estado del pedido en el cliente
  const cart = {};
  let currentRound = 1;
  let socket = null;
  let audioContext = null;

  // Estado del Tracker de Comanda en Vivo
  const orderLiveState = {
    active: false,
    round: 1,
    kitchenStatus: 'idle', // 'idle', 'cooking', 'ready'
    drinksStatus: 'idle'   // 'idle', 'preparing', 'served'
  };

  // ========================================================
  // INICIALIZACIÓN
  // ========================================================
  window.addEventListener('DOMContentLoaded', () => {
    initLangSelector();
    applyLanguage(currentLang);
    initSocket();
    initBroadcast();
    initSteppers();
    initSubmitButton();
  });

  // ========================================================
  // 1. SELECTOR Y APLICACIÓN DE IDIOMA
  // ========================================================
  function initLangSelector() {
    const btnEs = document.getElementById('lang-btn-es');
    const btnEn = document.getElementById('lang-btn-en');

    btnEs?.addEventListener('click', () => {
      applyLanguage('es');
      playTapSound(500);
    });

    btnEn?.addEventListener('click', () => {
      applyLanguage('en');
      playTapSound(500);
    });
  }

  function applyLanguage(lang) {
    currentLang = lang;
    const dict = I18N[lang] || I18N.en;

    // Actualizar botones del selector
    const btnEs = document.getElementById('lang-btn-es');
    const btnEn = document.getElementById('lang-btn-en');
    if (btnEs) btnEs.classList.toggle('active', lang === 'es');
    if (btnEn) btnEn.classList.toggle('active', lang === 'en');

    // Textos cabecera y mesa
    const tablePill = document.getElementById('mobile-table-name');
    const modalTableLabel = document.getElementById('modal-table-label');
    const headerSub = document.getElementById('header-sub-text');
    const welcomeTag = document.getElementById('welcome-tag-text');
    const greetingEl = document.getElementById('welcome-greeting');
    const welcomeDesc = document.getElementById('welcome-desc-text');

    const displayTable = currentTable;
    if (tablePill) tablePill.textContent = displayTable;
    if (modalTableLabel) modalTableLabel.textContent = displayTable;
    if (headerSub) headerSub.textContent = dict.headerSub;
    if (welcomeTag) welcomeTag.textContent = dict.welcomeTag;
    if (welcomeDesc) welcomeDesc.textContent = dict.welcomeDesc;

    if (greetingEl) {
      if (currentDinerName) {
        greetingEl.textContent = dict.welcomeGreetingNamed.replace('{name}', currentDinerName);
      } else {
        greetingEl.textContent = dict.welcomeGreetingDefault.replace('{table}', displayTable);
      }
    }

    // Categorías
    const catTitlePaellas = document.getElementById('cat-title-paellas');
    const catBadgePaellas = document.getElementById('cat-badge-paellas');
    const catTitleVinos = document.getElementById('cat-title-vinos');
    const catBadgeVinos = document.getElementById('cat-badge-vinos');
    const catTitleAguas = document.getElementById('cat-title-aguas');
    const catBadgeAguas = document.getElementById('cat-badge-aguas');

    if (catTitlePaellas) catTitlePaellas.textContent = dict.catPaellas;
    if (catBadgePaellas) catBadgePaellas.textContent = dict.badgePaellas;
    if (catTitleVinos) catTitleVinos.textContent = dict.catVinos;
    if (catBadgeVinos) catBadgeVinos.textContent = dict.badgeVinos;
    if (catTitleAguas) catTitleAguas.textContent = dict.catAguas;
    if (catBadgeAguas) catBadgeAguas.textContent = dict.badgeAguas;

    // Productos
    applyProductTexts('paella-valenciana', dict.prodPaellaVal);
    applyProductTexts('paella-senorret', dict.prodPaellaSen);
    applyProductTexts('vino-rioja', dict.prodVinoRioja);
    applyProductTexts('vino-rueda', dict.prodVinoRueda);
    applyProductTexts('agua-mineral', dict.prodAguaMin);

    // Botón de comanda
    const btnSubmitLabel = document.getElementById('btn-submit-label');
    if (btnSubmitLabel) btnSubmitLabel.textContent = dict.btnSubmit;

    // Modal
    const modalTitle = document.getElementById('modal-title-text');
    const modalDesc = document.getElementById('modal-desc-text');
    const modalTableTag = document.getElementById('modal-table-label-tag');
    const modalTimeTag = document.getElementById('modal-time-label-tag');
    const btnCloseModal = document.getElementById('btn-modal-close');

    if (modalTitle) modalTitle.textContent = dict.modalTitle;
    if (modalDesc) modalDesc.textContent = dict.modalDesc;
    if (modalTableTag) modalTableTag.textContent = dict.modalTableTag;
    if (modalTimeTag) modalTimeTag.textContent = dict.modalTimeTag;
    if (btnCloseModal) btnCloseModal.textContent = dict.modalClose;

    // Banner de ronda y Tracker de estado
    updateRoundBannerText();
    renderLiveTracker();
    updateCartTotal();
  }

  function applyProductTexts(id, pDict) {
    const titleEl = document.getElementById(`prod-title-${id}`);
    const descEl = document.getElementById(`prod-desc-${id}`);
    const allergenEl = document.getElementById(`prod-allergen-${id}`);

    if (titleEl) titleEl.textContent = pDict.title;
    if (descEl) descEl.textContent = pDict.desc;
    if (allergenEl) allergenEl.textContent = pDict.allergen;

    if (cart[id]) {
      cart[id].name = pDict.title;
    }
  }

  function updateRoundBannerText() {
    const banner = document.getElementById('order-round-banner');
    if (!banner || banner.classList.contains('hidden')) return;

    const dict = I18N[currentLang] || I18N.en;
    const titleEl = document.getElementById('round-badge-title');
    const subEl = document.getElementById('round-badge-subtitle');
    const completedRound = Math.max(1, currentRound - 1);

    if (titleEl) titleEl.textContent = dict.roundTitle.replace('{n}', completedRound);
    if (subEl) subEl.textContent = dict.roundSubtitle;
  }

  // ========================================================
  // 1B. RENDERIZADO DEL TRACKER DE COMANDA EN VIVO
  // ========================================================
  function renderLiveTracker() {
    const trackerEl = document.getElementById('order-live-tracker');
    if (!trackerEl) return;

    if (!orderLiveState.active) {
      trackerEl.classList.add('hidden');
      return;
    }

    trackerEl.classList.remove('hidden');

    const dict = I18N[currentLang] || I18N.en;
    const headingEl = document.getElementById('tracker-heading-text');
    const roundTag = document.getElementById('tracker-round-text');

    if (headingEl) headingEl.textContent = dict.trackerHeading;
    if (roundTag) roundTag.textContent = dict.trackerRoundTag.replace('{n}', orderLiveState.round);

    // 1. Cocina (Paellas)
    const kRow = document.getElementById('tracker-kitchen-row');
    const kTitle = document.getElementById('tracker-kitchen-title');
    const kDesc = document.getElementById('tracker-kitchen-desc');
    const kPill = document.getElementById('tracker-kitchen-pill');
    const kDot = document.getElementById('tracker-kitchen-dot');
    const kText = document.getElementById('tracker-kitchen-status-text');

    if (kTitle) kTitle.textContent = dict.trackerKitchenTitle;

    if (orderLiveState.kitchenStatus === 'ready') {
      if (kRow) kRow.classList.add('ready');
      if (kDesc) kDesc.textContent = dict.trackerKitchenDescReady;
      if (kPill) kPill.className = 'tracker-status-pill ready';
      if (kDot) kDot.className = 'pulse-dot-small green';
      if (kText) kText.textContent = dict.trackerKitchenPillReady;
    } else {
      if (kRow) kRow.classList.remove('ready');
      if (kDesc) kDesc.textContent = dict.trackerKitchenDescCooking;
      if (kPill) kPill.className = 'tracker-status-pill cooking';
      if (kDot) kDot.className = 'pulse-dot-small orange';
      if (kText) kText.textContent = dict.trackerKitchenPillCooking;
    }

    // 2. Bebidas (Sala)
    const dRow = document.getElementById('tracker-drinks-row');
    const dTitle = document.getElementById('tracker-drinks-title');
    const dDesc = document.getElementById('tracker-drinks-desc');
    const dPill = document.getElementById('tracker-drinks-pill');
    const dDot = document.getElementById('tracker-drinks-dot');
    const dText = document.getElementById('tracker-drinks-status-text');

    if (dTitle) dTitle.textContent = dict.trackerDrinksTitle;

    if (orderLiveState.drinksStatus === 'served') {
      if (dRow) dRow.classList.add('ready');
      if (dDesc) dDesc.textContent = dict.trackerDrinksDescServed;
      if (dPill) dPill.className = 'tracker-status-pill ready';
      if (dDot) dDot.className = 'pulse-dot-small green';
      if (dText) dText.textContent = dict.trackerDrinksPillServed;
    } else {
      if (dRow) dRow.classList.remove('ready');
      if (dDesc) dDesc.textContent = dict.trackerDrinksDescPreparing;
      if (dPill) dPill.className = 'tracker-status-pill preparing';
      if (dDot) dDot.className = 'pulse-dot-small purple';
      if (dText) dText.textContent = dict.trackerDrinksPillPreparing;
    }
  }

  // ========================================================
  // 2. CONEXIÓN SOCKET.IO (SALA COMPARTIDA POR SESSIONID)
  // ========================================================
  function initSocket() {
    try {
      socket = io(CARTA_CONFIG.wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true
      });

      socket.on('connect', () => {
        console.log('[Carta Móvil] Conectado a socket:', socket.id);
        socket.emit('subscribe_table', { table: currentTable, domain: CARTA_CONFIG.domain });
        if (currentSessionId && currentSessionId !== 'live') {
          socket.emit('join_qr_session', { sessionId: currentSessionId });
        }
      });

      socket.on('qr_verified', (data) => {
        const name = data?.user?.name || data?.senderName || 'Comensal';
        const greetingEl = document.getElementById('welcome-greeting');
        const dict = I18N[currentLang] || I18N.en;
        if (greetingEl) greetingEl.textContent = dict.welcomeGreetingNamed.replace('{name}', name);
      });

      // Escuchar cambios de estado desde KDS (cocina) y PDA (sala)
      socket.on('ticket_status_updated', handleTicketStatusUpdate);
    } catch (e) {
      console.warn('[Carta Móvil] Error conectando socket:', e);
    }
  }

  function initBroadcast() {
    if (!broadcast) return;
    broadcast.onmessage = (event) => {
      const { type, data } = event.data || {};
      if (type === 'ticket_status_updated') {
        handleTicketStatusUpdate(data);
      }
    };
  }

  function handleTicketStatusUpdate(data) {
    if (!data) return;
    const targetTable = (data.table || '').toLowerCase();
    const myTable = currentTable.toLowerCase();
    if (targetTable && !myTable.includes(targetTable) && !targetTable.includes(myTable)) {
      return;
    }

    orderLiveState.active = true;
    if (data.round) {
      orderLiveState.round = data.round;
    }

    if (data.type === 'food') {
      orderLiveState.kitchenStatus = data.status || 'ready';
      if (data.status === 'ready') {
        // Chime alegre de plato listo en cocina
        playTapSound(880, 'triangle', 0.25);
      }
    } else if (data.type === 'drink') {
      orderLiveState.drinksStatus = data.status || 'served';
      if (data.status === 'served') {
        // Chime suave de bebida servida
        playTapSound(587.33, 'sine', 0.15);
      }
    }

    renderLiveTracker();
  }

  // ========================================================
  // 3. STEPPERS DE CANTIDAD (+ / -)
  // ========================================================
  function initSteppers() {
    const cards = document.querySelectorAll('.product-card');

    cards.forEach((card) => {
      const id = card.dataset.id;
      const price = parseFloat(card.dataset.price || '0');
      const cat = card.dataset.cat;
      const titleEl = card.querySelector('.product-title');
      const name = titleEl ? titleEl.textContent.trim() : id;
      const qtyNumber = card.querySelector('.qty-number');
      const btnPlus = card.querySelector('.btn-plus');
      const btnMinus = card.querySelector('.btn-minus');

      cart[id] = { id, name, price, category: cat, qty: 0 };

      btnPlus?.addEventListener('click', () => {
        cart[id].qty++;
        if (qtyNumber) qtyNumber.textContent = cart[id].qty;
        card.classList.add('has-qty');
        playTapSound(600);
        updateCartTotal();

        // Emitir adición en tiempo real (aviso borrador para KDS & PDA)
        emitItemToDesktop({
          id,
          name: cart[id].name,
          category: cat,
          price,
          qty: cart[id].qty,
          round: currentRound,
          table: currentTable,
          sessionId: currentSessionId,
          dinerName: currentDinerName || ''
        });
      });

      btnMinus?.addEventListener('click', () => {
        if (cart[id].qty > 0) {
          cart[id].qty--;
          if (qtyNumber) qtyNumber.textContent = cart[id].qty;
          if (cart[id].qty === 0) {
            card.classList.remove('has-qty');
          }
          playTapSound(400);
          updateCartTotal();

          // Emitir actualización de cantidad en borrador (si es 0 se retira del ghost card)
          emitItemToDesktop({
            id,
            name: cart[id].name,
            category: cat,
            price,
            qty: cart[id].qty,
            round: currentRound,
            table: currentTable,
            sessionId: currentSessionId,
            dinerName: currentDinerName || ''
          });
        }
      });
    });
  }

  // ========================================================
  // 4. ACTUALIZACIÓN DE TOTALES Y BOTÓN DE COMANDA
  // ========================================================
  function updateCartTotal() {
    let totalItems = 0;
    let totalPrice = 0;
    const dict = I18N[currentLang] || I18N.en;

    Object.values(cart).forEach((item) => {
      totalItems += item.qty;
      totalPrice += item.qty * item.price;
    });

    const countEl = document.getElementById('order-items-count');
    const totalEl = document.getElementById('order-total-price');
    const submitBtn = document.getElementById('btn-submit-order');

    if (countEl) {
      if (totalItems === 0) {
        countEl.textContent = dict.orderCountEmpty;
      } else if (totalItems === 1) {
        countEl.textContent = dict.orderCountSingular;
      } else {
        countEl.textContent = dict.orderCountPlural.replace('{n}', totalItems);
      }
    }
    if (totalEl) {
      totalEl.textContent = totalPrice.toLocaleString(currentLang === 'es' ? 'es-ES' : 'en-US', {
        style: 'currency',
        currency: 'EUR'
      });
    }

    if (submitBtn) {
      submitBtn.disabled = totalItems === 0;
    }
  }

  // ========================================================
  // 5. ENVÍO DE COMANDA A COCINA Y RESET A CERO
  // ========================================================
  function initSubmitButton() {
    const submitBtn = document.getElementById('btn-submit-order');
    const modal = document.getElementById('order-modal');
    const btnCloseModal = document.getElementById('btn-modal-close');
    const roundBanner = document.getElementById('order-round-banner');

    submitBtn?.addEventListener('click', () => {
      let foodCount = 0;
      let drinkCount = 0;
      const orderItems = [];

      Object.values(cart).forEach((item) => {
        if (item.qty > 0) {
          orderItems.push({
            id: item.id,
            name: item.name,
            category: item.category,
            price: item.price,
            qty: item.qty
          });
          if (item.category === 'paellas') {
            foodCount += item.qty;
          } else {
            drinkCount += item.qty;
          }
        }
      });

      if (orderItems.length === 0) return;

      playTapSound(800, 'triangle', 0.35);

      const submittedRound = currentRound;
      const orderId = 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

      // Payload oficial de comanda con identificador único anti-duplicados
      const orderPayload = {
        orderId,
        table: currentTable,
        sessionId: currentSessionId,
        dinerName: currentDinerName || '',
        round: submittedRound,
        items: orderItems,
        foodCount,
        drinkCount,
        timestamp: new Date().toISOString()
      };

      // 1. Emitir comanda finalizada a KDS y PDA
      if (socket && socket.connected) {
        socket.emit('order_submitted', orderPayload);
      }
      if (broadcast) {
        broadcast.postMessage({ type: 'order_submitted', data: orderPayload });
      }

      // 2. Activar tracker de comanda en vivo en la carta móvil
      orderLiveState.active = true;
      orderLiveState.round = submittedRound;
      orderLiveState.kitchenStatus = foodCount > 0 ? 'cooking' : 'idle';
      orderLiveState.drinksStatus = drinkCount > 0 ? 'preparing' : 'idle';
      renderLiveTracker();

      // 3. Incrementar ronda para próximos pedidos
      currentRound++;

      // 4. Resetear contadores de la carta a 0
      resetCartCounters();

      // 5. Mostrar banner de ronda activa
      if (roundBanner) {
        roundBanner.classList.remove('hidden');
        updateRoundBannerText();
      }

      // 6. Mostrar modal de éxito
      if (modal) modal.classList.remove('hidden');
    });

    btnCloseModal?.addEventListener('click', () => {
      if (modal) modal.classList.add('hidden');
    });
  }

  function resetCartCounters() {
    // Poner cantidades a 0 en el modelo
    Object.keys(cart).forEach((id) => {
      cart[id].qty = 0;
    });

    // Poner contadores a 0 en el DOM
    const cards = document.querySelectorAll('.product-card');
    cards.forEach((card) => {
      card.classList.remove('has-qty');
      const qtyNumber = card.querySelector('.qty-number');
      if (qtyNumber) qtyNumber.textContent = '0';
    });

    // Actualizar barra de totales
    updateCartTotal();
  }

  // ========================================================
  // 6. EMISIÓN EN TIEMPO REAL A DESKTOP
  // ========================================================
  function emitItemToDesktop(itemData) {
    if (socket && socket.connected) {
      socket.emit('order_item_added', itemData);
    }
    if (broadcast) {
      broadcast.postMessage({ type: 'order_item_added', data: itemData });
    }
  }

  // ========================================================
  // 7. SINTETIZADOR DE AUDIO MÓVIL (HAPTIC SOUND)
  // ========================================================
  function playTapSound(freq = 500, type = 'sine', duration = 0.08) {
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
      gain.gain.setValueAtTime(0.12, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + duration);
    } catch (_) {}
  }
})();

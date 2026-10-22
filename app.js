const STORAGE_KEY = 'holdpay-concept-v1';
const DEMO_USERS = [
  { name: 'Demo Buyer', email: 'buyer@holdpay.demo', role: 'buyer', demo: true },
  { name: 'Demo Seller', email: 'seller@holdpay.demo', role: 'seller', demo: true },
  { name: 'Demo Pickup Agent', email: 'agent@holdpay.demo', role: 'agent', location: 'Nairobi West', demo: true }
];
const SAMPLE_LISTINGS = [
  {
    id: 'sample-basket',
    title: 'Handwoven market basket',
    category: 'Home & living',
    description: 'A sturdy handwoven basket made by local artisans.',
    price: 2800,
    image: 'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=900&q=80',
    sellerEmail: 'seller@holdpay.demo',
    sellerName: 'Demo Seller',
    createdAt: '2026-01-01T00:00:00.000Z',
    sample: true
  },
  {
    id: 'sample-kitenge',
    title: 'Kitenge weekend tote',
    category: 'Fashion',
    description: 'Colorful lined tote bag, made in Nairobi.',
    price: 1900,
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=80',
    sellerEmail: 'seller@holdpay.demo',
    sellerName: 'Demo Seller',
    createdAt: '2026-01-02T00:00:00.000Z',
    sample: true
  },
  {
    id: 'sample-coffee',
    title: 'Kenyan coffee gift set',
    category: 'Food & drink',
    description: 'A small-batch coffee selection, packed for gifting.',
    price: 3200,
    image: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=900&q=80',
    sellerEmail: 'seller@holdpay.demo',
    sellerName: 'Demo Seller',
    createdAt: '2026-01-03T00:00:00.000Z',
    sample: true
  },
  {
    id: 'sample-planter',
    title: 'Hand-finished clay planter',
    category: 'Home & living',
    description: 'A simple, locally made planter for indoor spaces.',
    price: 1500,
    image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=80',
    sellerEmail: 'seller@holdpay.demo',
    sellerName: 'Demo Seller',
    createdAt: '2026-01-04T00:00:00.000Z',
    sample: true
  }
];

const app = document.querySelector('#app');
const headerActions = document.querySelector('#header-actions');
const dialog = document.querySelector('#app-dialog');
const dialogContent = document.querySelector('#dialog-content');
const toastRegion = document.querySelector('#toast-region');
let activeFilter = 'All';
let pendingListingId = null;

function initialState() {
  return {
    users: DEMO_USERS.map((user) => ({ ...user })),
    listings: SAMPLE_LISTINGS.map((listing) => ({ ...listing })),
    orders: [],
    serviceContracts: [],
    reviews: [],
    sessionEmail: ''
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialState();
    const parsed = JSON.parse(saved);
    if (
      !parsed ||
      !Array.isArray(parsed.users) ||
      !Array.isArray(parsed.listings) ||
      !Array.isArray(parsed.orders) ||
      !Array.isArray(parsed.reviews)
    ) {
      throw new Error('Saved demo data has an unexpected format.');
    }
    parsed.users = [
      ...DEMO_USERS,
      ...parsed.users
        .filter((user) => !user.demo)
        .map((user) => ({
          ...user,
          kycStatus: 'pending-mobile-app'
        }))
    ];
    parsed.listings = [...SAMPLE_LISTINGS, ...parsed.listings.filter((listing) => !listing.sample)];
    parsed.serviceContracts = Array.isArray(parsed.serviceContracts) ? parsed.serviceContracts : [];
    return parsed;
  } catch (error) {
    console.error('Could not load HoldPay demo data:', error);
    return initialState();
  }
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error('Could not save HoldPay demo data:', error);
    showToast('Your browser could not save this demo update. Check local storage settings and try again.');
    return false;
  }
}

function currentUser() {
  return state.users.find((user) => user.email === state.sessionEmail) || null;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function money(amount) {
  return `KES ${Number(amount).toLocaleString('en-KE')}`;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function openDialog(content) {
  dialogContent.innerHTML = content;
  if (!dialog.open) dialog.showModal();
}

function closeDialog() {
  if (dialog.open) dialog.close();
  dialogContent.innerHTML = '';
}

function updateHeader() {
  const user = currentUser();
  if (!user) {
    headerActions.innerHTML = `
      <button class="text-button" type="button" data-action="sign-in">Sign in</button>
      <button class="button button-primary button-small" type="button" data-action="sign-up">Create account</button>`;
    return;
  }
  const roleName = user.role === 'agent' ? 'Pickup agent' : user.role[0].toUpperCase() + user.role.slice(1);
  headerActions.innerHTML = `
    <span class="account-chip">${escapeHtml(user.name)} <span>${escapeHtml(roleName)}</span></span>
    <button class="button button-outline button-small" type="button" data-action="dashboard">My dashboard</button>
    <button class="text-button" type="button" data-action="sign-out">Switch</button>`;
}

function render() {
  updateHeader();
  const user = currentUser();
  if (user) {
    renderDashboard(user);
  } else {
    renderMarketplace();
  }
}

function renderMarketplace() {
  const categories = ['All', ...new Set(state.listings.map((listing) => listing.category))];
  const visibleListings = state.listings.filter((listing) =>
    activeFilter === 'All' || listing.category === activeFilter
  );
  app.innerHTML = `
    <div class="page-wrap">
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">Local trade, clearer deals</span>
          <h1>Discover local.<br /><em>Deal with confidence.</em></h1>
          <p>Browse Kenyan makers and small businesses. Agree the details, choose a pickup point, and follow each step of the deal.</p>
          <div class="hero-actions">
            <button class="button button-primary" type="button" data-action="sign-up">Join HoldPay <span aria-hidden="true">→</span></button>
            <button class="button button-outline" type="button" data-action="how-it-works">How the demo works</button>
          </div>
          <p class="demo-disclaimer">Working browser demo · sample actions only · no real funds are processed</p>
        </div>
        <div class="gallery" aria-label="Local product gallery">
          <figure class="gallery-photo gallery-main">
            <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=80" alt="Customers browsing clothing in a shop" />
            <figcaption>Find your next favourite</figcaption>
          </figure>
          <figure class="gallery-photo gallery-top">
            <img src="https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=600&q=80" alt="Handmade home goods" loading="lazy" />
          </figure>
          <figure class="gallery-photo gallery-bottom">
            <img src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80" alt="A gift ready to be delivered" loading="lazy" />
          </figure>
          <span class="gallery-stamp">Made<br />near you</span>
        </div>
      </section>

      <section class="service-intro">
        <div>
          <span class="eyebrow">Services and skilled work</span>
          <h2>Agree the work before it begins.</h2>
          <p>Set a written scope, total price and milestones with a verified seller. Choose together whether work is approved stage by stage or at the end.</p>
          <p class="service-safety-note">This browser demo records approvals only. It does not collect, hold, or release payment.</p>
        </div>
        <button class="button button-primary" type="button" data-action="request-service">Plan a service job <span aria-hidden="true">→</span></button>
      </section>

      <section class="marketplace-section" id="marketplace">
        <div class="section-bar">
          <div><span class="eyebrow">The marketplace</span><h2>Good things, close to home.</h2></div>
          <p>${state.listings.length} listings to explore</p>
        </div>
        <div class="filter-row" aria-label="Filter listings">
          ${categories.map((category) => `<button class="filter-chip ${activeFilter === category ? 'active' : ''}" type="button" data-filter="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('')}
        </div>
        <div class="listing-grid">
          ${visibleListings.length ? visibleListings.map(listingCard).join('') : '<div class="empty-state">No listings in this category yet.</div>'}
        </div>
      </section>

      <section class="role-prompt">
        <span class="eyebrow">Three ways to take part</span>
        <h2>Choose your HoldPay role.</h2>
        <p>Every role has its own simple dashboard in this prototype.</p>
        <div class="role-grid">
          ${roleCard('buyer', 'Buyer', 'Browse products, start deals, collect orders, and leave a review.')}
          ${roleCard('seller', 'Seller', 'Offer products or agree a written scope, price, and work milestones with a client.')}
          ${roleCard('agent', 'Pickup agent', 'Record order handovers and flag delivery concerns.')}
        </div>
      </section>
      <div class="demo-banner">Concept only: payments, identity checks, delivery networks, and dispute resolution are simulated and are not live services.</div>
    </div>`;
}

function roleCard(role, title, text) {
  return `<article class="role-card"><h3>${title}</h3><p>${text}</p><button class="button button-outline button-small" type="button" data-role-signup="${role}">Continue as ${title.toLowerCase()} →</button></article>`;
}

function listingCard(listing) {
  const reviews = state.reviews.filter((review) => review.sellerEmail === listing.sellerEmail);
  const average = reviews.length
    ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1)
    : 'New';
  return `
    <article class="listing-card">
      <div class="listing-image">
        <img src="${escapeHtml(listing.image || fallbackImage())}" alt="${escapeHtml(listing.title)}" loading="lazy" />
        <span class="listing-category">${escapeHtml(listing.category)}</span>
      </div>
      <div class="listing-body">
        <h3>${escapeHtml(listing.title)}</h3>
        <p class="seller-line">By ${escapeHtml(listing.sellerName)} · ★ ${average}</p>
        <div class="listing-bottom">
          <span class="listing-price">${money(listing.price)}</span>
          <button class="button button-primary button-small" type="button" data-buy="${escapeHtml(listing.id)}">Start deal</button>
        </div>
      </div>
    </article>`;
}

function fallbackImage() {
  return 'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=900&q=80';
}

function renderDashboard(user) {
  if (!user.demo && user.kycStatus !== 'verified') {
    renderKycPending(user);
    return;
  }
  const roleLabel = user.role === 'agent' ? 'Pickup agent' : user.role[0].toUpperCase() + user.role.slice(1);
  const relevantOrders = state.orders.filter((order) => {
    if (user.role === 'buyer') return order.buyerEmail === user.email;
    if (user.role === 'seller') return order.sellerEmail === user.email;
    return order.agentEmail === user.email;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const relevantContracts = state.serviceContracts
    .filter((contract) => contract.buyerEmail === user.email || contract.sellerEmail === user.email)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  let workspace;
  if (user.role === 'seller') {
    workspace = `
      <section class="panel">
        <div class="panel-heading"><h2>Your catalogue</h2><button class="button button-primary button-small" type="button" data-action="add-listing">+ Add listing</button></div>
        <div class="seller-tools">
          ${state.listings.filter((listing) => listing.sellerEmail === user.email).map((listing) => `<div class="catalogue-row"><strong>${escapeHtml(listing.title)}</strong><span>${money(listing.price)} · ${escapeHtml(listing.category)}</span></div>`).join('') || '<div class="empty-state"><strong>Your catalogue is empty.</strong>Add a product to start showing it to buyers.</div>'}
        </div>
      </section>`;
  } else if (user.role === 'agent') {
    workspace = `
      <section class="panel">
        <h2>Pickup agent workspace</h2>
        <p class="muted-copy">Only deals assigned to your demo account appear here. Record handover or flag a concern for both sides to follow up.</p>
        <span class="agent-badge">Pickup area: ${escapeHtml(user.location || 'Not set')}</span>
      </section>`;
  } else {
    workspace = `
      <section class="panel">
        <div class="panel-heading"><h2>Start something new</h2><button class="button button-outline button-small" type="button" data-action="marketplace">Explore listings</button></div>
        <p class="muted-copy">Buy goods or agree a written service scope, price, and approval plan with a verified seller.</p>
        <button class="button button-primary button-small" type="button" data-action="request-service">Plan a service job</button>
      </section>`;
  }

  const aside = user.role === 'seller'
    ? '<strong>Seller journey</strong>Add a listing, agree deal details, then mark the parcel ready for the selected pickup point.'
    : user.role === 'agent'
      ? '<strong>Agent role</strong>Confirm that a parcel was received, or flag an issue. This prototype records a concern; it does not make a binding decision.'
      : '<strong>Buyer journey</strong>Choose an item and pickup point, simulate payment, collect the parcel, then complete the deal and review the seller.';

  app.innerHTML = `
    <div class="page-wrap account-section">
      <div class="dashboard-header">
        <div><span class="eyebrow">${escapeHtml(roleLabel)} dashboard</span><h1>Hello, ${escapeHtml(user.name.split(' ')[0])}.</h1><p>${escapeHtml(user.email)}${user.location ? ` · ${escapeHtml(user.location)}` : ''}</p></div>
        <div class="dashboard-actions"><button class="button button-outline button-small" type="button" data-action="marketplace">Marketplace</button>${user.role === 'seller' ? '<button class="button button-primary button-small" type="button" data-action="add-listing">+ Add listing</button>' : ''}</div>
      </div>
      <div class="kyc-status"><strong>Sample demo profile</strong><span>This pre-made profile bypasses sign-up for walkthroughs and is not a verified account.</span></div>
      <div class="dashboard-grid">
        <div>
          ${workspace}
          ${user.role !== 'agent' ? `
            <section class="panel service-contract-panel">
              <div class="panel-heading">
                <div><span class="eyebrow">Work agreements</span><h2>${user.role === 'seller' ? 'Client service requests' : 'Your service jobs'}</h2></div>
                ${user.role === 'buyer' ? '<button class="button button-primary button-small" type="button" data-action="request-service">+ Plan a job</button>' : ''}
              </div>
              <p class="muted-copy">Agree scope, total price, milestone amounts, and the approval plan before work starts. Demo approvals never send money.</p>
              <div class="service-contract-list">${relevantContracts.length ? relevantContracts.map((contract) => serviceContractCard(contract, user)).join('') : `<div class="empty-state"><strong>${user.role === 'seller' ? 'No client requests yet.' : 'No service agreements yet.'}</strong>${user.role === 'seller' ? 'Agreed job requests will appear here.' : 'Create a written job request for a verified seller.'}</div>`}</div>
            </section>` : ''}
          <section class="panel">
            <div class="panel-heading"><h2>${user.role === 'agent' ? 'Assigned pickup deals' : 'Your deals'}</h2><span class="muted-copy">${relevantOrders.length} total</span></div>
            <div class="deal-list">${relevantOrders.length ? relevantOrders.map((order) => dealCard(order, user)).join('') : '<div class="empty-state"><strong>No deals here yet.</strong>When a deal starts, its progress will appear in this space.</div>'}</div>
          </section>
        </div>
        <aside><div class="sidebar-note">${aside}</div><div class="panel"><h2>Demo controls</h2><p class="muted-copy">Switch between sample roles to walk through the complete buyer, seller, and agent flow.</p><button class="button button-outline button-small" type="button" data-action="sign-out">Switch account</button><p class="demo-banner">Updates are saved only in this browser. Clear them anytime.</p><button class="text-button reset-button" type="button" data-action="reset-demo">Reset demo data</button></div></aside>
      </div>
      <p class="demo-banner">No real funds are processed. Payment, shipping, pickup verification, ratings, and mediation are simulated for demonstration only.</p>
    </div>`;
}

function renderKycPending(user) {
  const roleName = user.role === 'agent' ? 'pickup agent' : user.role;
  app.innerHTML = `
    <div class="page-wrap account-section">
      <section class="pending-card">
        <span class="pending-icon" aria-hidden="true">✓</span>
        <span class="eyebrow">Website sign-up received</span>
        <h1>Your ${escapeHtml(roleName)} account is incomplete.</h1>
        <p>To protect customers and meet HoldPay's eligibility requirements, identity verification is completed only in the HoldPay phone app.</p>
        <div class="pending-steps">
          <div class="pending-step is-done"><span>1</span><div><strong>Website registration</strong><small>Basic profile created for ${escapeHtml(user.email)}</small></div></div>
          <div class="pending-step is-current"><span>2</span><div><strong>Complete KYC in the phone app</strong><small>Confirm Kenyan citizenship and age 18+. ${user.role === 'seller' || user.role === 'agent' ? 'Submit identity and business registration documents.' : 'Submit your identity document.'}</small></div></div>
          <div class="pending-step"><span>3</span><div><strong>Account review</strong><small>Account access becomes available after verification is completed and approved.</small></div></div>
        </div>
        <p class="pending-note">This prototype cannot open the phone app or verify your information. No KYC documents were requested, uploaded, or saved by this website. Your account remains locked until KYC is completed and approved in the app.</p>
        <div class="pending-actions">
          <button class="button button-outline" type="button" data-action="sign-out">Switch account</button>
          <button class="text-button" type="button" data-action="marketplace">Return to marketplace</button>
        </div>
      </section>
    </div>`;
}

function statusName(status) {
  return ({
    'awaiting-payment': 'Awaiting demo payment',
    paid: 'Demo payment marked',
    'at-pickup': 'At pickup point',
    ready: 'Ready for collection',
    collected: 'Collected · awaiting approval',
    completed: 'Completed',
    mediation: 'Concern raised'
  })[status] || 'In progress';
}

function stepClass(order, step) {
  const orderSteps = ['awaiting-payment', 'paid', 'at-pickup', 'ready', 'collected', 'completed'];
  if (order.status === 'mediation') return step <= orderSteps.indexOf(order.lastStatus || 'paid') ? 'done' : '';
  return orderSteps.indexOf(order.status) >= step ? 'done' : '';
}

function dealCard(order, user) {
  const statusClass = order.status === 'mediation' ? 'status-issue' : ['paid', 'at-pickup', 'ready', 'collected', 'completed'].includes(order.status) ? 'status-paid' : '';
  const steps = ['Payment', 'Seller drop-off', 'Agent receipt', 'Buyer collection', 'Complete'];
  let actions = '';
  if (order.status === 'awaiting-payment' && user.role === 'buyer') {
    actions = `<button class="button button-primary button-small" type="button" data-order-action="simulate-payment" data-order="${escapeHtml(order.id)}">Simulate payment</button>`;
  } else if (order.status === 'paid' && user.role === 'seller') {
    actions = `<button class="button button-primary button-small" type="button" data-order-action="drop-off" data-order="${escapeHtml(order.id)}">Mark sent to agent</button>`;
  } else if (order.status === 'at-pickup' && user.role === 'agent') {
    actions = `<button class="button button-primary button-small" type="button" data-order-action="agent-received" data-order="${escapeHtml(order.id)}">Confirm parcel received</button>`;
  } else if (order.status === 'ready' && user.role === 'buyer') {
    actions = `<button class="button button-primary button-small" type="button" data-order-action="collect" data-order="${escapeHtml(order.id)}">Confirm collection</button>`;
  } else if (order.status === 'collected' && user.role === 'buyer') {
    actions = `<button class="button button-primary button-small" type="button" data-order-action="complete" data-order="${escapeHtml(order.id)}">Approve & complete</button>`;
  }
  if (!['completed', 'mediation'].includes(order.status) && user.role === 'agent' && order.status !== 'awaiting-payment') {
    actions += `<button class="button button-danger button-small" type="button" data-order-action="flag" data-order="${escapeHtml(order.id)}">Flag concern</button>`;
  }
  if (order.status === 'collected' && user.role === 'buyer' && !state.reviews.some((review) => review.orderId === order.id)) {
    actions += `<button class="button button-outline button-small" type="button" data-order-action="review" data-order="${escapeHtml(order.id)}">Review seller</button>`;
  }
  if (order.status === 'mediation' && ['buyer', 'seller'].includes(user.role)) {
    const agreed = (order.resolvedBy || []).includes(user.role);
    actions += agreed
      ? '<span class="muted-copy">You marked this concern resolved; waiting for the other party.</span>'
      : `<button class="button button-outline button-small" type="button" data-order-action="resolve-concern" data-order="${escapeHtml(order.id)}">Mark discussion resolved</button>`;
  }
  const parties = user.role === 'buyer'
    ? `Seller: ${escapeHtml(order.sellerName)}`
    : user.role === 'seller'
      ? `Buyer: ${escapeHtml(order.buyerName)}`
      : `Pickup for ${escapeHtml(order.buyerName)} · ${escapeHtml(order.pickupPoint)}`;
  return `
    <article class="deal-card">
      <div class="deal-top"><div><h3>${escapeHtml(order.title)} · ${money(order.price)}</h3><p class="deal-meta">${parties}</p><p class="deal-meta">Order ${escapeHtml(order.id)} · Pickup: ${escapeHtml(order.pickupPoint)}</p></div><span class="status-pill ${statusClass}">${statusName(order.status)}</span></div>
      <div class="deal-steps">${steps.map((step, index) => `<span class="deal-step ${stepClass(order, index)}">${step}</span>`).join('')}</div>
      ${order.note ? `<p class="deal-meta">Note: ${escapeHtml(order.note)}</p>` : ''}
      ${order.mediationNote ? `<p class="concern-note"><strong>Agent note:</strong> ${escapeHtml(order.mediationNote)}</p>` : ''}
      ${actions ? `<div class="deal-actions">${actions}</div>` : ''}
    </article>`;
}

function serviceContractCard(contract, user) {
  const status = {
    proposed: 'Awaiting seller agreement',
    active: 'Work in progress',
    disputed: 'Concern raised',
    completed: 'Work approved · no payment sent',
    cancelled: 'Cancelled'
  }[contract.status] || 'In progress';
  const milestones = contract.milestones || [];
  const nextPending = contract.approvalMode === 'final'
    ? milestones.find((milestone) => milestone.status === 'pending')
    : milestones.find((milestone) => milestone.status !== 'approved');
  const nextDelivered = milestones.find((milestone) => milestone.status === 'delivered');
  let actions = '';
  if (contract.status === 'proposed' && user.email === contract.sellerEmail) {
    actions = `<button class="button button-primary button-small" type="button" data-service-action="accept" data-contract="${escapeHtml(contract.id)}">Agree to scope and start</button>`;
  } else if (contract.status === 'active' && user.email === contract.sellerEmail && nextPending?.status === 'pending') {
    const priorStagesReady = contract.approvalMode === 'final' ||
      milestones.slice(0, milestones.indexOf(nextPending)).every((milestone) => milestone.status === 'approved');
    if (priorStagesReady) {
      actions = `<button class="button button-primary button-small" type="button" data-service-action="submit-stage" data-contract="${escapeHtml(contract.id)}" data-milestone="${escapeHtml(nextPending.id)}">Mark stage delivered</button>`;
    }
  } else if (contract.status === 'active' && user.email === contract.buyerEmail) {
    if (contract.approvalMode === 'per-milestone' && nextDelivered) {
      actions = `<button class="button button-primary button-small" type="button" data-service-action="approve-stage" data-contract="${escapeHtml(contract.id)}" data-milestone="${escapeHtml(nextDelivered.id)}">Approve this stage</button>`;
    } else if (contract.approvalMode === 'final' && milestones.length && milestones.every((milestone) => milestone.status === 'delivered')) {
      actions = `<button class="button button-primary button-small" type="button" data-service-action="approve-final" data-contract="${escapeHtml(contract.id)}">Approve completed job</button>`;
    }
  }
  if (contract.status === 'active') {
    actions += `<button class="button button-danger button-small" type="button" data-service-action="raise-concern" data-contract="${escapeHtml(contract.id)}">Raise a concern</button>`;
  }
  if (contract.status === 'disputed') {
    const agreed = (contract.resolvedBy || []).includes(user.email);
    actions += agreed
      ? '<span class="muted-copy">You confirmed the discussion; waiting for the other party.</span>'
      : `<button class="button button-outline button-small" type="button" data-service-action="resolve-concern" data-contract="${escapeHtml(contract.id)}">Mark discussion resolved</button>`;
  }
  const otherParty = user.email === contract.buyerEmail
    ? `Provider: ${escapeHtml(contract.sellerName)}`
    : `Client: ${escapeHtml(contract.buyerName)}`;
  const approvalName = contract.approvalMode === 'final' ? 'One final approval' : 'Approve each stage';
  return `
    <article class="service-contract-card">
      <div class="deal-top">
        <div><span class="eyebrow">${escapeHtml(contract.category)}</span><h3>${escapeHtml(contract.title)} · ${money(contract.price)}</h3>
          <p class="deal-meta">${otherParty} · Agreement ${escapeHtml(contract.id)}</p>
          <p class="deal-meta">${approvalName}</p>
        </div>
        <span class="status-pill ${contract.status === 'disputed' ? 'status-issue' : contract.status === 'completed' ? 'status-paid' : ''}">${status}</span>
      </div>
      <p class="service-scope">${escapeHtml(contract.scope)}</p>
      <ol class="service-milestones">${milestones.map((milestone, index) => `<li class="${milestone.status}"><span>${index + 1}. ${escapeHtml(milestone.description)}</span><strong>${money(milestone.amount)}</strong><small>${milestone.status === 'approved' ? 'Approved in demo' : milestone.status === 'delivered' ? 'Awaiting client approval' : 'Not submitted'}</small></li>`).join('')}</ol>
      ${contract.concernNote ? `<p class="concern-note"><strong>Concern:</strong> ${escapeHtml(contract.concernNote)}</p>` : ''}
      ${contract.status === 'completed' ? '<p class="form-help">Client work approval was recorded for demonstration only. No funds were collected or released.</p>' : ''}
      ${actions ? `<div class="deal-actions">${actions}</div>` : ''}
    </article>`;
}

function renderHowItWorks() {
  openDialog(`
    <span class="eyebrow">Demo flow</span><h2 id="dialog-title">Walk through a deal</h2>
    <p class="dialog-lede">Use the sample role accounts to test each handoff. Open this prototype in the same browser to share its local demo data.</p>
    <ol class="walkthrough-list">
      <li>Sign in as buyer and start a deal from a catalogue item.</li>
      <li>Simulate payment, then switch to seller and mark the parcel sent.</li>
      <li>Switch to pickup agent and confirm receipt.</li>
      <li>Return as buyer to collect, approve, and leave a review.</li>
      <li>As buyer, plan a service job with a written scope and milestone amounts; switch to seller to accept and submit work, then return as buyer to approve the agreed stages.</li>
    </ol>
    <p class="demo-banner">Every payment step is a status simulation only. Service approval does not send money. This concept does not connect to M-Pesa, Airtel Money, a bank, a courier, or a real agent network.</p>
    <button class="button button-primary" type="button" data-close-dialog>Got it</button>`);
}

function showAuth(mode, selectedRole = '') {
  const isSignin = mode === 'sign-in';
  openDialog(`
    <span class="eyebrow">${isSignin ? 'Welcome back' : 'Join the marketplace'}</span>
    <h2 id="dialog-title">${isSignin ? 'Sign in to HoldPay' : 'Create your account'}</h2>
    <p class="dialog-lede">${isSignin ? 'Enter the email address for a local demo profile.' : 'Website registration creates an incomplete profile. Complete KYC in the HoldPay phone app before your account can be activated.'}</p>
    <form class="form-grid" id="auth-form">
      ${isSignin ? '' : `<label>Your name<input name="name" autocomplete="name" maxlength="60" required /></label>`}
      <label>Email address<input name="email" type="email" autocomplete="email" maxlength="120" required /></label>
      ${isSignin ? '' : `
        <label>Account type<select name="role" id="signup-role" required><option value="">Choose a role</option><option value="buyer" ${selectedRole === 'buyer' ? 'selected' : ''}>Buyer</option><option value="seller" ${selectedRole === 'seller' ? 'selected' : ''}>Seller</option><option value="agent" ${selectedRole === 'agent' ? 'selected' : ''}>Pickup agent</option></select></label>
        <label class="hidden" id="signup-location-label">Operating area<input name="location" maxlength="80" placeholder="e.g. Nakuru town" /></label>
        <div class="kyc-notice"><strong>KYC happens in the phone app</strong><span>All HoldPay users must be Kenyan citizens aged 18 or older. The app will verify identity documents. Sellers and pickup agents must also submit business registration documents. Website sign-up remains pending until app KYC is completed and approved.</span></div>
      `}
      <p class="form-help">${isSignin ? 'Sample demo accounts are for walkthroughs only and are not verified accounts.' : ''}</p>
      <p class="form-error" id="auth-error" role="alert"></p>
      <button class="button button-primary" type="submit">${isSignin ? 'Sign in' : 'Create pending account'}</button>
    </form>
    ${isSignin ? '<div class="demo-options"><button class="button button-soft" type="button" data-demo-role="buyer">Try buyer demo</button><button class="button button-soft" type="button" data-demo-role="seller">Try seller demo</button><button class="button button-soft" type="button" data-demo-role="agent">Try agent demo</button></div>' : ''}
    <p class="demo-banner">Prototype only: this website does not collect KYC documents and cannot open or verify through a phone app.</p>`);

  if (!isSignin) {
    const roleSelect = dialogContent.querySelector('#signup-role');
    const location = dialogContent.querySelector('[name="location"]');
    const updateRoleFields = () => {
      dialogContent.querySelector('#signup-location-label').classList.toggle('hidden', roleSelect.value !== 'agent');
      location.required = roleSelect.value === 'agent';
    };
    roleSelect.addEventListener('change', updateRoleFields);
    updateRoleFields();
  }
}

function showListingForm() {
  openDialog(`
    <span class="eyebrow">Seller catalogue</span><h2 id="dialog-title">Add a listing</h2>
    <p class="dialog-lede">Add an item to this browser's local demo marketplace.</p>
    <form class="form-grid" id="listing-form">
      <label>Product name<input name="title" maxlength="70" required /></label>
      <label>Category<select name="category" required><option value="">Choose category</option><option>Fashion</option><option>Home & living</option><option>Food & drink</option><option>Crafts</option><option>Other</option></select></label>
      <label>Price in KES<input name="price" type="number" min="1" max="10000000" step="1" required /></label>
      <label>Short description<textarea name="description" maxlength="240" required></textarea></label>
      <label>Photo URL (optional)<input name="image" type="url" placeholder="https://…" /></label>
      <p class="form-error" id="listing-error" role="alert"></p>
      <button class="button button-primary" type="submit">Publish demo listing</button>
    </form>`);
}

function showServiceContractForm() {
  const user = currentUser();
  if (!user || user.role !== 'buyer' || !user.demo) {
    showToast('Sign in as the buyer demo to try service agreements. New web accounts must complete app KYC first.');
    return;
  }
  const providers = state.users.filter((candidate) =>
    candidate.role === 'seller' && (candidate.demo || candidate.kycStatus === 'verified')
  );
  if (!providers.length) {
    showToast('No verified service providers are available in this demo.');
    return;
  }
  openDialog(`
    <span class="eyebrow">Service agreement · demo</span><h2 id="dialog-title">Plan a service job</h2>
    <p class="dialog-lede">Write down the work, total price, and stages. The seller must accept before the agreement becomes active.</p>
    <form class="form-grid" id="service-contract-form">
      <label>Job title<input name="title" maxlength="100" placeholder="e.g. Renovate a two-room home" required /></label>
      <label>Service type<select name="category" required><option value="">Choose a category</option><option value="construction">Construction or renovation</option><option value="repairs">Repairs and maintenance</option><option value="professional">Professional services</option><option value="delivery">Delivery</option><option value="other">Other services</option></select></label>
      <label>Choose a verified seller / service provider<select name="seller" required>${providers.map((provider) => `<option value="${escapeHtml(provider.email)}">${escapeHtml(provider.name)}</option>`).join('')}</select></label>
      <label>Written work scope<textarea name="scope" maxlength="1000" placeholder="Describe the work, materials, location, and what counts as completion." required></textarea></label>
      <label>Agreed total price in KES<input name="price" type="number" min="1" max="1000000000" step="1" required /></label>
      <label>When will the client approve?
        <select name="approvalMode" required><option value="per-milestone">Approve each stage separately</option><option value="final">Approve the full job at the end</option></select>
      </label>
      <label>Milestones and amounts<textarea name="milestones" maxlength="1200" placeholder="One stage per line: description | amount&#10;Site visit and plan | 5000&#10;Main work phase | 25000&#10;Inspection and handover | 5000" required></textarea></label>
      <p class="form-help">Each line must use “stage description | amount”; milestone amounts must add up to the agreed total. Client approval here only updates demo status. No payment is sent.</p>
      <p class="form-error" id="service-contract-error" role="alert"></p>
      <button class="button button-primary" type="submit">Send agreement proposal</button>
    </form>`);
}

function showOrderForm(listing) {
  const agents = state.users.filter((user) => user.role === 'agent');
  openDialog(`
    <span class="eyebrow">Buyer · start a demo deal</span><h2 id="dialog-title">${escapeHtml(listing.title)}</h2>
    <p class="dialog-lede">Price: <strong>${money(listing.price)}</strong> · Seller: ${escapeHtml(listing.sellerName)}</p>
    <form class="form-grid" id="order-form" data-listing="${escapeHtml(listing.id)}">
      <label>Choose pickup agent<select name="agent" required>${agents.map((agent) => `<option value="${escapeHtml(agent.email)}">${escapeHtml(agent.name)} · ${escapeHtml(agent.location || 'Pickup area not set')}</option>`).join('')}</select></label>
      <label>Pickup point / area<input name="pickup" maxlength="100" placeholder="e.g. Agent location in Nakuru" required /></label>
      <label>Deal note (optional)<textarea name="note" maxlength="200" placeholder="Any details agreed with the seller"></textarea></label>
      <p class="form-help">The next payment step is simulated and does not charge or hold funds.</p>
      <p class="form-error" id="order-error" role="alert"></p>
      <button class="button button-primary" type="submit">Create demo order</button>
    </form>`);
}

function showReviewForm(order) {
  openDialog(`
    <span class="eyebrow">Buyer feedback</span><h2 id="dialog-title">Review this deal</h2>
    <p class="dialog-lede">Feedback is stored locally in this demo and shown with marketplace ratings.</p>
    <form class="form-grid" id="review-form" data-order="${escapeHtml(order.id)}">
      <label>Rating<select name="rating" required><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Okay</option><option value="2">2 — Needs improvement</option><option value="1">1 — Poor</option></select></label>
      <label>Comment<textarea name="comment" maxlength="240" placeholder="How was the product and service?" required></textarea></label>
      <p class="form-error" id="review-error" role="alert"></p>
      <button class="button button-primary" type="submit">Save demo review</button>
    </form>`);
}

function findOrder(orderId) {
  return state.orders.find((order) => order.id === orderId);
}

function permitted(order, user, role) {
  return user && user.role === role && (
    (role === 'buyer' && order.buyerEmail === user.email) ||
    (role === 'seller' && order.sellerEmail === user.email) ||
    (role === 'agent' && order.agentEmail === user.email)
  );
}

function updateOrder(order, status, extra = {}) {
  order.lastStatus = order.status;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  Object.assign(order, extra);
  if (saveState()) {
    render();
    showToast('Demo deal updated.');
  }
}

function setDemoRole(role) {
  const demo = DEMO_USERS.find((user) => user.role === role);
  if (!demo) return;
  const nextListingId = role === 'buyer' ? pendingListingId : null;
  state.sessionEmail = demo.email;
  if (saveState()) {
    closeDialog();
    render();
    showToast(`Signed in as the ${role === 'agent' ? 'pickup agent' : role} demo.`);
    const listing = state.listings.find((item) => item.id === nextListingId);
    if (listing) showOrderForm(listing);
  }
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action], [data-role-signup], [data-demo-role], [data-buy], [data-order-action], [data-service-action], [data-filter], [data-view], [data-home], [data-close]');
  if (!target) return;

  if (target.hasAttribute('data-close')) {
    closeDialog();
  } else if (target.hasAttribute('data-home') || target.dataset.action === 'marketplace' || target.dataset.view === 'marketplace') {
    activeFilter = 'All';
    state.sessionEmail = '';
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (target.dataset.action === 'how-it-works' || target.dataset.view === 'how-it-works') {
    renderHowItWorks();
  } else if (target.dataset.action === 'sign-up') {
    showAuth('sign-up');
  } else if (target.dataset.action === 'sign-in') {
    showAuth('sign-in');
  } else if (target.dataset.action === 'dashboard') {
    render();
  } else if (target.dataset.action === 'sign-out') {
    state.sessionEmail = '';
    saveState();
    render();
    showToast('Switched to marketplace view.');
  } else if (target.dataset.action === 'add-listing') {
    showListingForm();
  } else if (target.dataset.action === 'request-service') {
    showServiceContractForm();
  } else if (target.dataset.action === 'reset-demo') {
    openDialog(`<span class="eyebrow">Reset this browser</span><h2 id="dialog-title">Clear demo activity?</h2><p class="dialog-lede">This removes local demo accounts, listings, and orders, then restores the sample marketplace.</p><button class="button button-danger" type="button" data-confirm-reset>Reset demo data</button>`);
  } else if (target.dataset.roleSignup) {
    showAuth('sign-up', target.dataset.roleSignup);
  } else if (target.dataset.demoRole) {
    setDemoRole(target.dataset.demoRole);
  } else if (target.dataset.filter) {
    activeFilter = target.dataset.filter;
    renderMarketplace();
  } else if (target.dataset.buy) {
    const user = currentUser();
    if (!user || user.role !== 'buyer') {
      pendingListingId = target.dataset.buy;
      showAuth('sign-up', 'buyer');
      showToast(user ? 'Switch to a buyer account to start a deal.' : 'Create or select a buyer demo account to start a deal.');
    } else {
      const listing = state.listings.find((item) => item.id === target.dataset.buy);
      if (listing && listing.sellerEmail === user.email) {
        showToast('You cannot start a deal on your own listing.');
      } else if (listing) {
        showOrderForm(listing);
      }
    }
  } else if (target.dataset.orderAction) {
    handleOrderAction(target.dataset.orderAction, target.dataset.order);
  } else if (target.dataset.serviceAction) {
    handleServiceContractAction(
      target.dataset.serviceAction,
      target.dataset.contract,
      target.dataset.milestone
    );
  } else if (target.hasAttribute('data-confirm-reset')) {
    state = initialState();
    if (saveState()) {
      closeDialog();
      render();
      showToast('Demo data was reset.');
    }
  }
});

dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeDialog();
});

dialog.addEventListener('close', () => {
  pendingListingId = null;
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();

  if (form.id === 'auth-form') {
    handleAuthSubmit(form);
  } else if (form.id === 'listing-form') {
    handleListingSubmit(form);
  } else if (form.id === 'order-form') {
    handleOrderSubmit(form);
  } else if (form.id === 'review-form') {
    handleReviewSubmit(form);
  } else if (form.id === 'service-contract-form') {
    handleServiceContractSubmit(form);
  } else if (form.id === 'service-concern-form') {
    handleServiceConcernSubmit(form);
  }
});

function handleAuthSubmit(form) {
  const formData = new FormData(form);
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const error = form.querySelector('#auth-error');
  if (form.querySelector('[name="name"]')) {
    const name = String(formData.get('name') || '').trim();
    const role = String(formData.get('role') || '');
    if (!name || !email || !['buyer', 'seller', 'agent'].includes(role)) {
      error.textContent = 'Enter your name, a valid email, and choose an account type.';
      return;
    }
    if (role === 'agent' && !String(formData.get('location') || '').trim()) {
      error.textContent = 'Pickup agents must provide their operating area.';
      return;
    }
    if (state.users.some((user) => user.email === email)) {
      error.textContent = 'An account with that email is already in this browser. Sign in instead.';
      return;
    }
    const user = {
      name,
      email,
      role,
      location: role === 'agent' ? String(formData.get('location') || '').trim() : '',
      kycStatus: 'pending-mobile-app',
      demo: false,
      createdAt: new Date().toISOString()
    };
    state.users.push(user);
    state.sessionEmail = user.email;
  } else {
    const user = state.users.find((candidate) => candidate.email === email);
    if (!user) {
      error.textContent = 'No local demo account found for that email. Create an account or use a demo role below.';
      return;
    }
    state.sessionEmail = user.email;
  }
  if (!saveState()) {
    if (form.querySelector('[name="name"]')) {
      state.users = state.users.filter((user) => user.email !== email);
      state.sessionEmail = '';
    } else {
      state.sessionEmail = '';
    }
    return;
  }
  closeDialog();
  render();
  if (form.querySelector('[name="name"]')) {
    showToast('Website sign-up is incomplete. Complete KYC in the phone app to activate your account.');
  } else if (currentUser()?.kycStatus === 'pending-mobile-app') {
    showToast('This account is pending KYC completion in the phone app.');
  } else {
    showToast('Signed in to the local demo account.');
  }
}

function handleListingSubmit(form) {
  const user = currentUser();
  const error = form.querySelector('#listing-error');
  if (!user || user.role !== 'seller') {
    error.textContent = 'Sign in as a seller to add a catalogue listing.';
    return;
  }
  const data = new FormData(form);
  const title = String(data.get('title') || '').trim();
  const category = String(data.get('category') || '');
  const description = String(data.get('description') || '').trim();
  const price = Number(data.get('price'));
  const image = String(data.get('image') || '').trim();
  if (!title || !category || !description || !Number.isInteger(price) || price < 1 || price > 10000000) {
    error.textContent = 'Enter a title, category, description, and a whole-number price between KES 1 and 10,000,000.';
    return;
  }
  if (image && !/^https?:\/\//i.test(image)) {
    error.textContent = 'Photo URL must start with http:// or https://.';
    return;
  }
  state.listings.unshift({
    id: `listing-${crypto.randomUUID()}`,
    title,
    category,
    description,
    price,
    image: image || fallbackImage(),
    sellerEmail: user.email,
    sellerName: user.name,
    createdAt: new Date().toISOString(),
    sample: false
  });
  if (!saveState()) return;
  closeDialog();
  render();
  showToast('Your listing is live in this browser demo.');
}

function handleOrderSubmit(form) {
  const user = currentUser();
  const error = form.querySelector('#order-error');
  const listing = state.listings.find((item) => item.id === form.dataset.listing);
  const data = new FormData(form);
  const agent = state.users.find((candidate) => candidate.email === data.get('agent') && candidate.role === 'agent');
  const pickupPoint = String(data.get('pickup') || '').trim();
  if (!user || user.role !== 'buyer' || !listing || !agent || !pickupPoint) {
    error.textContent = 'Choose a valid pickup agent and enter a pickup point.';
    return;
  }
  const order = {
    id: `HP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    title: listing.title,
    listingId: listing.id,
    price: listing.price,
    buyerEmail: user.email,
    buyerName: user.name,
    sellerEmail: listing.sellerEmail,
    sellerName: listing.sellerName,
    agentEmail: agent.email,
    agentName: agent.name,
    pickupPoint,
    note: String(data.get('note') || '').trim(),
    status: 'awaiting-payment',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.orders.unshift(order);
  if (!saveState()) return;
  closeDialog();
  render();
  showToast('Demo order created. Continue with the simulated payment step.');
}

function handleServiceContractSubmit(form) {
  const user = currentUser();
  const error = form.querySelector('#service-contract-error');
  const data = new FormData(form);
  const title = String(data.get('title') || '').trim();
  const category = String(data.get('category') || '');
  const sellerEmail = String(data.get('seller') || '');
  const scope = String(data.get('scope') || '').trim();
  const price = Number(data.get('price'));
  const approvalMode = String(data.get('approvalMode') || '');
  const seller = state.users.find((candidate) => candidate.email === sellerEmail && candidate.role === 'seller');
  const milestoneLines = String(data.get('milestones') || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const milestones = [];

  for (const line of milestoneLines) {
    const separator = line.lastIndexOf('|');
    const description = separator >= 0 ? line.slice(0, separator).trim() : '';
    const amountText = separator >= 0 ? line.slice(separator + 1).trim() : '';
    const amount = Number(amountText);
    if (!description || !Number.isSafeInteger(amount) || amount <= 0) {
      error.textContent = 'Each milestone must use “description | whole-number amount”.';
      return;
    }
    milestones.push({
      id: `stage-${crypto.randomUUID()}`,
      description: description.slice(0, 160),
      amount,
      status: 'pending'
    });
  }
  const milestoneTotal = milestones.reduce((total, milestone) => total + milestone.amount, 0);
  if (!user || user.role !== 'buyer' || !user.demo || !seller || seller.email === user.email) {
    error.textContent = 'Sign in as the buyer demo and choose another seller as provider.';
    return;
  }
  if (!title || !scope || !['construction', 'repairs', 'professional', 'delivery', 'other'].includes(category)) {
    error.textContent = 'Enter a title, service type, and written work scope.';
    return;
  }
  if (!Number.isSafeInteger(price) || price <= 0 || price > 1000000000) {
    error.textContent = 'Enter a whole-number total price between KES 1 and 1,000,000,000.';
    return;
  }
  if (!['per-milestone', 'final'].includes(approvalMode)) {
    error.textContent = 'Choose when the client will approve completed work.';
    return;
  }
  if (milestones.length < 1 || milestones.length > 20 || milestoneTotal !== price) {
    error.textContent = 'Add 1–20 milestones and make their amounts add up exactly to the agreed price.';
    return;
  }
  const contract = {
    id: `HP-SVC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    title: title.slice(0, 100),
    category,
    scope: scope.slice(0, 1000),
    price,
    approvalMode,
    buyerEmail: user.email,
    buyerName: user.name,
    sellerEmail: seller.email,
    sellerName: seller.name,
    status: 'proposed',
    paymentStatus: 'not-configured',
    milestones,
    resolvedBy: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.serviceContracts.unshift(contract);
  if (!saveState()) return;
  closeDialog();
  render();
  showToast('Agreement proposal sent. The seller must accept the scope and terms before work starts.');
}

function handleServiceContractAction(action, contractId, milestoneId) {
  const user = currentUser();
  const contract = state.serviceContracts.find((item) => item.id === contractId);
  if (!user || !contract) return;
  const isBuyer = contract.buyerEmail === user.email && user.role === 'buyer';
  const isSeller = contract.sellerEmail === user.email && user.role === 'seller';
  if (action === 'accept') {
    if (!isSeller || contract.status !== 'proposed') return;
    contract.status = 'active';
  } else if (action === 'submit-stage') {
    if (!isSeller || contract.status !== 'active') return;
    const pending = contract.approvalMode === 'final'
      ? contract.milestones.find((milestone) => milestone.status === 'pending')
      : contract.milestones.find((milestone) => milestone.status !== 'approved');
    if (!pending || pending.id !== milestoneId || pending.status !== 'pending') return;
    const index = contract.milestones.indexOf(pending);
    if (contract.approvalMode === 'per-milestone' &&
        !contract.milestones.slice(0, index).every((milestone) => milestone.status === 'approved')) return;
    pending.status = 'delivered';
  } else if (action === 'approve-stage') {
    if (!isBuyer || contract.status !== 'active' || contract.approvalMode !== 'per-milestone') return;
    const pendingApproval = contract.milestones.find((milestone) => milestone.status === 'delivered');
    if (!pendingApproval || pendingApproval.id !== milestoneId) return;
    pendingApproval.status = 'approved';
    if (contract.milestones.every((milestone) => milestone.status === 'approved')) {
      contract.status = 'completed';
      contract.paymentStatus = 'simulated';
    }
  } else if (action === 'approve-final') {
    if (!isBuyer || contract.status !== 'active' || contract.approvalMode !== 'final' ||
        !contract.milestones.length ||
        !contract.milestones.every((milestone) => milestone.status === 'delivered')) return;
    contract.milestones.forEach((milestone) => { milestone.status = 'approved'; });
    contract.status = 'completed';
    contract.paymentStatus = 'simulated';
  } else if (action === 'raise-concern') {
    if ((!isBuyer && !isSeller) || contract.status !== 'active') return;
    openDialog(`
      <span class="eyebrow">Service agreement · concern</span><h2 id="dialog-title">What needs attention?</h2>
      <p class="dialog-lede">Describe the work or agreement concern. This pauses the demo workflow; it does not make a binding decision.</p>
      <form class="form-grid" id="service-concern-form" data-contract="${escapeHtml(contract.id)}">
        <label>Concern<textarea name="description" maxlength="1000" required></textarea></label>
        <p class="form-error" id="service-concern-error" role="alert"></p>
        <button class="button button-danger" type="submit">Record concern</button>
      </form>`);
    return;
  } else if (action === 'resolve-concern') {
    if ((!isBuyer && !isSeller) || contract.status !== 'disputed') return;
    const resolvedBy = [...new Set([...(contract.resolvedBy || []), user.email])];
    if (resolvedBy.includes(contract.buyerEmail) && resolvedBy.includes(contract.sellerEmail)) {
      contract.status = 'active';
      contract.concernNote = '';
      contract.resolvedBy = [];
    } else {
      contract.resolvedBy = resolvedBy;
    }
  } else {
    return;
  }
  contract.updatedAt = new Date().toISOString();
  if (saveState()) {
    closeDialog();
    render();
    showToast(action === 'accept'
      ? 'Terms accepted. Work can now start.'
      : action === 'submit-stage'
        ? 'Stage marked delivered. Waiting for client review.'
        : action.startsWith('approve')
          ? 'Work approval recorded in this demo. No money was collected or released.'
          : action === 'resolve-concern' && contract.status === 'active'
            ? 'Both parties marked the concern resolved. The agreement can continue.'
            : 'Your response was recorded for the other party.');
  }
}

function handleServiceConcernSubmit(form) {
  const user = currentUser();
  const contract = state.serviceContracts.find((item) => item.id === form.dataset.contract);
  const error = form.querySelector('#service-concern-error');
  const description = String(new FormData(form).get('description') || '').trim();
  if (!user || !contract ||
      ![contract.buyerEmail, contract.sellerEmail].includes(user.email) ||
      contract.status !== 'active' || !description) {
    error.textContent = 'Enter a concern for an active agreement you participate in.';
    return;
  }
  contract.status = 'disputed';
  contract.concernNote = description.slice(0, 1000);
  contract.resolvedBy = [];
  contract.updatedAt = new Date().toISOString();
  if (!saveState()) return;
  closeDialog();
  render();
  showToast('Concern recorded. Both parties must agree before this demo workflow resumes.');
}

function handleReviewSubmit(form) {
  const user = currentUser();
  const order = findOrder(form.dataset.order);
  const error = form.querySelector('#review-error');
  if (!user || user.role !== 'buyer' || !order || order.buyerEmail !== user.email || !['collected', 'completed'].includes(order.status)) {
    error.textContent = 'Only the buyer can review an order after collection.';
    return;
  }
  const data = new FormData(form);
  const rating = Number(data.get('rating'));
  const comment = String(data.get('comment') || '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) {
    error.textContent = 'Choose a rating and add a short comment.';
    return;
  }
  if (state.reviews.some((review) => review.orderId === order.id)) {
    error.textContent = 'A review has already been submitted for this deal.';
    return;
  }
  state.reviews.push({
    id: `review-${crypto.randomUUID()}`,
    orderId: order.id,
    sellerEmail: order.sellerEmail,
    buyerName: user.name,
    rating,
    comment,
    createdAt: new Date().toISOString()
  });
  if (!saveState()) return;
  closeDialog();
  render();
  showToast('Thanks. Your demo review has been saved locally.');
}

function handleOrderAction(action, orderId) {
  const user = currentUser();
  const order = findOrder(orderId);
  if (!order || !user) return;
  const transitions = {
    'simulate-payment': { role: 'buyer', from: 'awaiting-payment', to: 'paid' },
    'drop-off': { role: 'seller', from: 'paid', to: 'at-pickup' },
    'agent-received': { role: 'agent', from: 'at-pickup', to: 'ready' },
    collect: { role: 'buyer', from: 'ready', to: 'collected' },
    complete: { role: 'buyer', from: 'collected', to: 'completed' }
  };
  if (action === 'review') {
    if (permitted(order, user, 'buyer') && ['collected', 'completed'].includes(order.status)) showReviewForm(order);
    return;
  }
  if (action === 'flag') {
    if (!permitted(order, user, 'agent') || ['completed', 'mediation'].includes(order.status)) return;
    openDialog(`
      <span class="eyebrow">Pickup agent · record concern</span><h2 id="dialog-title">What needs attention?</h2>
      <p class="dialog-lede">Record what you observed. This flags the deal for follow-up; it does not decide the dispute.</p>
      <form class="form-grid" id="concern-form" data-order="${escapeHtml(order.id)}">
        <label>Handover / quality note<textarea name="note" maxlength="300" required></textarea></label>
        <p class="form-error" id="concern-error" role="alert"></p>
        <button class="button button-danger" type="submit">Record concern</button>
      </form>`);
    return;
  }
  if (action === 'resolve-concern') {
    if (!['buyer', 'seller'].includes(user.role) || order.status !== 'mediation' || !permitted(order, user, user.role)) return;
    const resolvedBy = [...new Set([...(order.resolvedBy || []), user.role])];
    if (resolvedBy.includes('buyer') && resolvedBy.includes('seller')) {
      const resumeStatus = order.lastStatus || 'at-pickup';
      updateOrder(order, resumeStatus, { resolvedBy: [], mediationNote: '' });
      showToast('Both parties marked the concern resolved. The demo deal returned to its previous step.');
    } else {
      order.resolvedBy = resolvedBy;
      if (saveState()) {
        render();
        showToast('Your response was recorded. The other party must also agree to resume the deal.');
      }
    }
    return;
  }
  const transition = transitions[action];
  if (!transition || !permitted(order, user, transition.role) || order.status !== transition.from) return;
  if (action === 'simulate-payment') {
    openDialog(`<span class="eyebrow">Demo payment</span><h2 id="dialog-title">Simulate payment?</h2><p class="dialog-lede">This only changes the sample order status. No M-Pesa, Airtel Money, bank, or card payment is requested or processed.</p><button class="button button-primary" type="button" data-confirm-payment="${escapeHtml(order.id)}">Confirm demo payment</button>`);
    return;
  }
  updateOrder(order, transition.to);
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-confirm-payment]');
  if (!button) return;
  const order = findOrder(button.dataset.confirmPayment);
  if (order && permitted(order, currentUser(), 'buyer') && order.status === 'awaiting-payment') {
    updateOrder(order, 'paid');
    closeDialog();
  }
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'concern-form') return;
  event.preventDefault();
  const user = currentUser();
  const order = findOrder(form.dataset.order);
  const error = form.querySelector('#concern-error');
  const note = String(new FormData(form).get('note') || '').trim();
  if (!order || !user || !permitted(order, user, 'agent') || !note) {
    error.textContent = 'Add a note to record this concern.';
    return;
  }
  updateOrder(order, 'mediation', { mediationNote: note });
  closeDialog();
  showToast('Concern recorded for both parties to review. No funds were moved.');
});

render();

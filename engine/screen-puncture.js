/* GEEHUB // screen puncture
   The live narrative display opens a ragged aperture and drives its scene toward the viewer.
   Visual impact only; no sound or forced navigation. */
(() => {
  const init = () => {
    const shell = document.getElementById('gameConsole');
    const top = document.querySelector('main.world > header.top');
    if (shell && top && top.nextElementSibling !== shell) top.insertAdjacentElement('afterend', shell);
    const screen = shell && shell.querySelector('.game-screen');
    const narrative = document.getElementById('gameNarrative');
    if (!shell || !screen || shell.dataset.punctureReady) return;
    shell.dataset.punctureReady = 'true';

    const layer = document.createElement('div');
    layer.className = 'screen-puncture-layer';
    layer.setAttribute('aria-hidden','true');
    layer.innerHTML = `
      <svg class="screen-puncture-svg" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="punctureEdge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#effaff"/><stop offset=".22" stop-color="#7cbde0"/><stop offset=".53" stop-color="#132a39"/><stop offset=".77" stop-color="#b9e5f8"/><stop offset="1" stop-color="#314a59"/>
          </linearGradient>
          <filter id="punctureGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="punctureShadow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8"/></filter>
          <radialGradient id="punctureDepth" cx=".48" cy=".43" r=".55">
            <stop offset="0" stop-color="#000103" stop-opacity=".94"/><stop offset=".62" stop-color="#020508" stop-opacity=".45"/><stop offset="1" stop-color="#04080b" stop-opacity="0"/>
          </radialGradient>
          <mask id="punctureApertureMask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="620">
            <rect width="1000" height="620" fill="#fff"/>
            <path d="M498 258 L532 229 545 197 568 220 603 198 609 234 645 241 626 270 655 295 624 314 635 348 597 345 581 377 555 353 526 382 509 350 472 365 466 329 428 319 449 291 431 258 469 258 475 225Z" fill="#000"/>
          </mask>
        </defs>
        <rect class="screen-puncture-shade" width="1000" height="620" mask="url(#punctureApertureMask)"/>
        <path class="screen-puncture-rift" d="M498 258 L532 229 545 197 568 220 603 198 609 234 645 241 626 270 655 295 624 314 635 348 597 345 581 377 555 353 526 382 509 350 472 365 466 329 428 319 449 291 431 258 469 258 475 225Z"/>
        <path d="M458 279 L400 250 361 212 300 205 267 170 M444 300 L383 323 338 366 282 373 245 415 M475 337 L455 393 423 439 430 487 M526 347 L536 409 581 454 598 505 M579 333 L638 362 687 399 754 399 M601 288 L666 267 718 226 784 230 823 205 M552 236 L574 185 608 148 614 102 M495 239 L478 191 443 159 435 106 M431 289 L381 284 327 297 281 284 M613 310 L681 318 734 350 796 339" class="screen-puncture-crack deep"/>
        <path d="M458 279 L400 250 361 212 300 205 267 170 M444 300 L383 323 338 366 282 373 245 415 M475 337 L455 393 423 439 430 487 M526 347 L536 409 581 454 598 505 M579 333 L638 362 687 399 754 399 M601 288 L666 267 718 226 784 230 823 205 M552 236 L574 185 608 148 614 102 M495 239 L478 191 443 159 435 106 M431 289 L381 284 327 297 281 284 M613 310 L681 318 734 350 796 339" class="screen-puncture-crack"/>
        <path d="M480 246 L491 223 516 213 540 226 566 225 588 248 595 278 615 299 591 326 577 349 546 354 524 369 496 350 465 354 453 328 431 307 444 281 439 257Z" fill="url(#punctureDepth)"/>
        <path class="screen-puncture-rim" d="M498 258 L532 229 545 197 568 220 603 198 609 234 645 241 626 270 655 295 624 314 635 348 597 345 581 377 555 353 526 382 509 350 472 365 466 329 428 319 449 291 431 258 469 258 475 225Z"/>
        <path d="M449 269 L420 250 407 225 M449 319 L410 341 393 370 M511 350 L502 395 516 426 M580 345 L607 373 640 383 M628 265 L667 248 689 221 M559 222 L575 194 568 171 M476 242 L467 217 447 202" class="screen-puncture-glint"/>
      </svg>`;
    screen.appendChild(layer);

    const wave = document.createElement('div');
    wave.className = 'screen-camera-impact';
    wave.setAttribute('aria-hidden','true');
    document.documentElement.appendChild(wave);

    let lastHit = -Infinity;
    let previousNarrative = narrative ? narrative.textContent : '';
    let firstMutation = true;
    let quietNarrativeUntil = 0;
    const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const impact = (source = 'story') => {
      const now = performance.now();
      if (now - lastHit < 850) return;
      lastHit = now;
      const screenRect = screen.getBoundingClientRect();
      wave.style.left = (screenRect.left + screenRect.width / 2) + 'px';
      wave.style.top = (screenRect.top + screenRect.height / 2) + 'px';
      shell.classList.add('screen-punctured');
      if (reducedMotion()) return;
      shell.classList.remove('screen-impact-active');
      document.body.classList.remove('screen-camera-hit');
      wave.classList.remove('play');
      void shell.offsetWidth;
      shell.classList.add('screen-impact-active');
      document.body.classList.add('screen-camera-hit');
      wave.classList.add('play');
      window.setTimeout(() => {
        shell.classList.remove('screen-impact-active');
        document.body.classList.remove('screen-camera-hit');
      }, 960);
    };

    if (narrative) {
      const observer = new MutationObserver(() => {
        const next = narrative.textContent;
        if (firstMutation) {
          firstMutation = false;
          previousNarrative = next;
          return;
        }
        if (performance.now() < quietNarrativeUntil) {
          previousNarrative = next;
          return;
        }
        if (next && next !== previousNarrative) impact('narrative-change');
        previousNarrative = next;
      });
      observer.observe(narrative, {subtree:true,childList:true,characterData:true});
      // Ignore initialization and first render; later state changes breach the screen.
      window.setTimeout(() => { firstMutation = false; previousNarrative = narrative.textContent; }, 800);
    }

    screen.addEventListener('click', event => {
      const control = event.target.closest('button, a, [role="button"]');
      if (control) impact('screen-control');
    });
    ['runWorld','visualEnter','nextBit','siphon','biggenerRun','horizonRun','textReplyRun'].forEach(id => {
      const button = document.getElementById(id);
      if (button) button.addEventListener('click', () => window.setTimeout(() => impact('world-action'), 90));
    });
    document.addEventListener('geehub:story-location', () => impact('world-location'));
    const majorStages = new Set(['EXPANSION','BALLOONING','HYPER','NEW BASELINE']);
    ['geehub:environmental-transition','geehub:world-history'].forEach(type => {
      document.addEventListener(type, event => {
        const stage = String(event.detail?.stage || '').toUpperCase();
        if (majorStages.has(stage)) impact('world-threshold');
      });
    });
    document.addEventListener('geehub:screen-puncture', () => impact('external'));
    document.addEventListener('geehub:world-encounter', event => {
      if (event.detail?.source !== 'restore') impact('world-arrival');
    });
    window.GEEHUB_SCREEN_PUNCTURE = {
      impact,
      quietNarrativeUpdate(fn) {
        quietNarrativeUntil = performance.now() + 500;
        if (typeof fn === 'function') fn();
      }
    };
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

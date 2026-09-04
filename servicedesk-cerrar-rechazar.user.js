// ==UserScript==
// @name         ServiceDesk - Cerrar / Rechazar / Añadir remitente
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Cerrar/Rechazar ticket y botón de remitente a la izquierda con enganche reactivo al iframe de descripción
// @author       Tú
// @match        https://servicedesk.helphone.com:8181/*
// @updateURL    https://github.com/ArchmageOki/CinfaEnhacer/raw/refs/heads/main/servicedesk-cerrar-rechazar.user.js
// @downloadURL  https://github.com/ArchmageOki/CinfaEnhacer/raw/refs/heads/main/servicedesk-cerrar-rechazar.user.js
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    function esModoValido() {
        const url = window.location.href;
        return url.includes('woMode=editWO') || url.includes('woMode=newWO');
    }

    const wait = ms => new Promise(res => setTimeout(res, ms));

    const cssId = 'sdp-actions-btn-style';
    if (!document.getElementById(cssId)) {
        const estilo = document.createElement('style');
        estilo.id = cssId;
        estilo.innerHTML = `
            .sdp-btn-container-desc {
                display: flex !important;
                flex-direction: column !important;
                align-items: flex-end !important;
                margin-top: 8px !important;
                width: 100% !important;
                box-sizing: border-box !important;
                gap: 5px !important;
            }

            .sdp-btn-action {
                background-color: #f7f7f7;
                border: 1px solid #d2d2d2;
                color: #444444;
                padding: 2px 7px;
                font-size: 11px;
                font-weight: 600;
                border-radius: 3px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                height: 24px;
                box-sizing: border-box;
                line-height: 1;
                font-family: inherit;
                white-space: nowrap;
                transition: all 0.15s ease;
                user-select: none;
            }

            .sdp-btn-action:hover {
                background-color: #ededed;
                border-color: #b5b5b5;
                color: #111111;
            }

            .sdp-btn-action:active {
                transform: translateY(1px);
            }

            .sdp-btn-action.is-done {
                background-color: #e6f4ea !important;
                border-color: #34a853 !important;
                color: #137333 !important;
            }

            .sdp-btn-action.is-running {
                opacity: 0.65;
                pointer-events: none;
            }

            /* Contenedor inline a la izquierda de la etiqueta Solicitante */
            .sdp-btn-container-req-inline {
                display: inline-flex !important;
                position: relative !important;
                vertical-align: middle !important;
                margin-right: 6px !important;
            }

            .sdp-btn-req {
                background-color: #f0f7ff;
                border: 1px solid #b8d7ff;
                color: #0b58a2;
                padding: 1px 6px;
                font-size: 11px;
                font-weight: 600;
                border-radius: 3px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 3px;
                height: 20px;
                max-width: 130px;
                box-sizing: border-box;
                line-height: 1;
                font-family: inherit;
                white-space: nowrap;
                transition: all 0.15s ease;
                user-select: none;
            }

            .sdp-btn-req span.sdp-req-text {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 100px;
            }

            .sdp-btn-req:hover {
                background-color: #e1effe;
                border-color: #84b8f7;
                color: #003e7e;
            }

            .sdp-btn-req.is-done {
                background-color: #e6f4ea !important;
                border-color: #34a853 !important;
                color: #137333 !important;
            }

            .sdp-req-dropdown {
                position: absolute;
                top: 23px;
                left: 0;
                background: #ffffff;
                border: 1px solid #aaa;
                box-shadow: 0 4px 10px rgba(0,0,0,0.18);
                border-radius: 3px;
                z-index: 99999;
                min-width: 230px;
                max-width: 320px;
                padding: 4px 0;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
            }

            .sdp-req-dropdown-item {
                padding: 6px 10px;
                font-size: 11px;
                color: #333333;
                cursor: pointer;
                text-align: left;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                border: none;
                background: none;
                width: 100%;
                font-family: inherit;
                box-sizing: border-box;
                line-height: 1.3;
            }

            .sdp-req-dropdown-item:hover {
                background-color: #c13b38 !important;
                color: #ffffff !important;
            }

            .sdp-req-item-name {
                font-weight: 600;
                display: block;
            }

            .sdp-req-item-mail {
                font-size: 10px;
                opacity: 0.85;
                display: block;
            }
        `;
        (document.head || document.documentElement).appendChild(estilo);
    }

    // --- ACCIONES GENERALES ---

    async function establecerEstado(targetText) {
        const input = document.querySelector('input[name="status"], select[name="status"]');
        if (!input) return false;

        const container = input.closest('.control-holder, .spot-form') || input.parentElement;
        const choice = container ? container.querySelector('.select2-choice') : null;
        if (!choice) return false;

        choice.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        choice.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        await wait(70);

        const searchInput = document.querySelector('#select2-drop:not(.select2-display-none) .select2-search input');
        if (searchInput) {
            searchInput.value = targetText;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            await wait(80);
        }

        const results = Array.from(document.querySelectorAll('#select2-drop .select2-result-label'));
        const matched = results.find(r => r.innerText.trim().toLowerCase() === targetText.toLowerCase()) ||
                        results.find(r => r.innerText.trim().toLowerCase().includes(targetText.toLowerCase()));

        if (matched) {
            matched.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            await wait(100);
            return true;
        } else {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
            await wait(60);
            return false;
        }
    }

    async function confirmarDialogoCierre() {
        for (let i = 0; i < 20; i++) {
            const dialog = document.querySelector('#close-form, div[aria-describedby="close-form"]');
            const chk = document.querySelector('input[name="closure_info.requester_ack_resolution"]');

            if (dialog && chk) {
                if (!chk.checked) {
                    chk.checked = true;
                    chk.dispatchEvent(new Event('change', { bubbles: true }));
                    chk.dispatchEvent(new Event('click', { bubbles: true }));
                }

                await wait(100);

                const targetWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
                if (targetWin.$req && targetWin.$req.common && typeof targetWin.$req.common.updateCloseForm === 'function') {
                    targetWin.$req.common.updateCloseForm();
                } else {
                    const btnActualizar = document.querySelector('input[name="close-form-update"][value="Actualizar"], input[title="Actualizar"]');
                    if (btnActualizar) btnActualizar.click();
                }

                await wait(180);
                return true;
            }
            await wait(80);
        }
        return false;
    }

    async function establecerFechaCierreActual() {
        const fechaInput = document.getElementById('udf_fields_udf_date_901_IN_Display');
        if (!fechaInput) return false;

        const dateGroup = fechaInput.closest('.input-group.date') || fechaInput.parentElement;
        const trigger = dateGroup.querySelector('.input-group-addon') || fechaInput;

        trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        for (let i = 0; i < 15; i++) {
            await wait(60);
            const btnAceptar = document.querySelector('.OKButton-zdatetimepicker, button[aria-label="Aceptar"]');
            if (btnAceptar && btnAceptar.offsetParent !== null) {
                btnAceptar.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                await wait(80);
                return true;
            }
        }
        return false;
    }

    async function abrirResolucionYEnfocarInicio() {
        const panel = document.getElementById('rfres-panel1-zc') || document.querySelector('z-collapsiblepanel.widget-table');
        const contentBox = document.getElementById('rf-resolutionBox');

        // Determinar si está realmente cerrado
        const estaCerradoPorAttr = panel && panel.getAttribute('aria-expanded') === 'false';
        const estaCerradoPorEstilo = contentBox && (contentBox.style.display === 'none' || getComputedStyle(contentBox).display === 'none');

        // Solo hacer clic para abrir si efectivamente está cerrado
        if (estaCerradoPorAttr || estaCerradoPorEstilo) {
            const heading = document.querySelector('z-cpheading.zcollapsiblepanel__heading') || (panel ? panel.querySelector('.zcollapsiblepanel__header') : null);
            if (heading) {
                const toggleBtn = heading.querySelector('.p10') || heading;
                toggleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                await wait(250);
            }
        }

        // Enfocar el editor de texto dentro del iframe de resolución
        const iframes = Array.from(document.querySelectorAll('iframe'));
        for (let i = iframes.length - 1; i >= 0; i--) {
            const f = iframes[i];
            try {
                const doc = f.contentDocument || (f.contentWindow && f.contentWindow.document);
                if (doc && doc.body && (doc.body.classList.contains('ze_body') || doc.body.getAttribute('contenteditable') === 'true')) {
                    // Verificar que el iframe pertenezca a la caja de resolución
                    if (f.closest('#rf-resolutionBox') || f.closest('z-cpcontent')) {
                        f.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        f.contentWindow.focus();
                        doc.body.focus();

                        const win = f.contentWindow;
                        const sel = win.getSelection();
                        if (sel) {
                            const range = doc.createRange();
                            range.setStart(doc.body, 0);
                            range.collapse(true);
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }
                        return true;
                    }
                }
            } catch (e) {}
        }

        const resTextarea = document.querySelector('textarea[name*="resolution"], textarea[id*="resolution"]');
        if (resTextarea) {
            resTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
            resTextarea.focus();
            resTextarea.setSelectionRange(0, 0);
            return true;
        }

        return false;
    }

    async function ejecutarAccion(btn, tipo) {
        btn.classList.add('is-running');
        const originalText = btn.innerHTML;
        btn.innerHTML = tipo === 'close' ? `<span>⏳ Cerrando...</span>` : `<span>⏳ Rechazando...</span>`;

        try {
            if (tipo === 'close') {
                await establecerEstado('Closed');
                await confirmarDialogoCierre();
            } else if (tipo === 'reject') {
                await establecerEstado('Rechazada');
                await wait(250);
            }

            await establecerFechaCierreActual();
            await wait(100);
            await abrirResolucionYEnfocarInicio();

            btn.classList.remove('is-running');
            btn.classList.add('is-done');
            btn.innerHTML = tipo === 'close' ? `<span>✔ Cerrado</span>` : `<span>✔ Rechazado</span>`;

            setTimeout(() => {
                btn.classList.remove('is-done');
                btn.innerHTML = originalText;
            }, 1000);
        } catch (e) {
            console.error('[SDP Action] Error:', e);
            btn.classList.remove('is-running');
            btn.innerHTML = originalText;
        }
    }

    // --- EXTRACCIÓN Y SELECCIÓN DE SOLICITANTE ---

    function obtenerTextoDescripcion() {
        let textoCompleto = '';
        const iframes = Array.from(document.querySelectorAll('iframe'));
        for (let f of iframes) {
            try {
                const doc = f.contentDocument || (f.contentWindow && f.contentWindow.document);
                if (doc && doc.body && (doc.body.classList.contains('ze_body') || doc.body.getAttribute('contenteditable') === 'true')) {
                    textoCompleto = doc.body.innerText || doc.body.textContent || '';
                    if (textoCompleto.trim()) return textoCompleto;
                }
            } catch (e) {}
        }

        const textarea = document.querySelector('textarea[name="description"], textarea[id*="description"]');
        if (textarea && textarea.value) return textarea.value;

        return textoCompleto;
    }

    function extraerRemitentes(texto) {
        if (!texto) return [];
        const regex = /Remitente:\s*([^\r\n<]+)?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/gi;
        const matches = [];
        let match;

        while ((match = regex.exec(texto)) !== null) {
            const rawNombre = (match[1] || '').trim();
            const email = (match[2] || '').trim();
            matches.push({
                nombre: rawNombre || email,
                email: email
            });
        }

        const invertidos = matches.reverse();
        const vistos = new Set();
        const unicos = [];
        for (let item of invertidos) {
            const lowerEmail = item.email.toLowerCase();
            if (!vistos.has(lowerEmail)) {
                vistos.add(lowerEmail);
                unicos.push(item);
            }
        }
        return unicos;
    }

    async function seleccionarSolicitante(criterio) {
        if (!criterio) return false;

        const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        const originalConfirm = targetWindow.confirm;
        targetWindow.confirm = function() { return false; };

        const scriptIntercept = document.createElement('script');
        scriptIntercept.textContent = `
            window._originalConfirm = window._originalConfirm || window.confirm;
            window.confirm = function() { return false; };
        `;
        (document.head || document.documentElement).appendChild(scriptIntercept);
        scriptIntercept.remove();

        try {
            const reqInput = document.querySelector('input[name="requester"], select[name="requester"]');
            const container = reqInput ? reqInput.closest('.control-holder, .spot-form, td') : null;
            const choice = container ? container.querySelector('.select2-choice') : document.querySelector('.select2-choice');

            if (!choice) return false;

            choice.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            choice.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            await wait(70);

            const searchInput = document.querySelector('#select2-drop .select2-search input');
            if (!searchInput) return false;

            const textoTeclear = criterio.includes('@') ? criterio.split('@')[0].replace('.', ' ') : criterio;
            searchInput.value = textoTeclear;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

            for (let i = 0; i < 18; i++) {
                await wait(90);
                const results = Array.from(document.querySelectorAll('#select2-drop .select2-result-label'));
                if (!results.length) continue;

                let matched = null;

                if (criterio.includes('@')) {
                    matched = results.find(r => r.innerText.toLowerCase().includes(criterio.toLowerCase()));
                }

                if (!matched) {
                    matched = results.find(r => {
                        const txt = r.innerText.toLowerCase();
                        return txt.includes(criterio.toLowerCase()) && txt.includes('@') && !txt.includes('correo electrónico : n/d');
                    });
                }

                if (!matched) {
                    matched = results.find(r => r.innerText.toLowerCase().includes(criterio.toLowerCase()));
                }

                if (matched) {
                    matched.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                    await wait(80);

                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));

                    const cancelBtn = Array.from(document.querySelectorAll('input[type="button"], button, a')).find(el => {
                        const t = el.innerText ? el.innerText.trim().toLowerCase() : (el.value ? el.value.trim().toLowerCase() : '');
                        return t === 'cancelar' || t === 'cancel';
                    });
                    if (cancelBtn && cancelBtn.offsetParent !== null) {
                        cancelBtn.click();
                    }

                    await wait(80);
                    return true;
                }
            }

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
            return false;

        } finally {
            targetWindow.confirm = originalConfirm;
            const scriptRestore = document.createElement('script');
            scriptRestore.textContent = `if (window._originalConfirm) window.confirm = window._originalConfirm;`;
            (document.head || document.documentElement).appendChild(scriptRestore);
            scriptRestore.remove();
        }
    }

    // --- INYECCIÓN REACTIVA ---

    function inyectarBotonRemitente() {
        if (!esModoValido()) return;
        if (document.getElementById('sdp-req-wrapper')) return;

        const labelReq = document.querySelector('.col-fields[data-fname="requester"] .left-col label, label[for="for_requester"]');
        if (!labelReq) return;

        const textoDesc = obtenerTextoDescripcion();
        const remitentes = extraerRemitentes(textoDesc);
        if (!remitentes.length) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'sdp-req-wrapper';
        wrapper.className = 'sdp-btn-container-req-inline';

        const btnReq = document.createElement('button');
        btnReq.type = 'button';
        btnReq.className = 'sdp-btn-req';

        if (remitentes.length === 1) {
            const remitenteUnico = remitentes[0];
            btnReq.innerHTML = `<span>👤</span> <span class="sdp-req-text" title="${remitenteUnico.nombre} (${remitenteUnico.email})">${remitenteUnico.nombre}</span>`;
            btnReq.title = `Clic para seleccionar: ${remitenteUnico.nombre} (${remitenteUnico.email})`;

            btnReq.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                btnReq.innerHTML = `<span>⏳</span>`;
                const res = await seleccionarSolicitante(remitenteUnico.email);
                if (res) {
                    btnReq.classList.add('is-done');
                    btnReq.innerHTML = `<span>✔</span> <span class="sdp-req-text">${remitenteUnico.nombre.split(' ')[0]}</span>`;
                    setTimeout(() => {
                        btnReq.classList.remove('is-done');
                        btnReq.innerHTML = `<span>👤</span> <span class="sdp-req-text" title="${remitenteUnico.nombre} (${remitenteUnico.email})">${remitenteUnico.nombre}</span>`;
                    }, 1200);
                } else {
                    btnReq.innerHTML = `<span>👤</span> <span class="sdp-req-text" title="${remitenteUnico.nombre} (${remitenteUnico.email})">${remitenteUnico.nombre}</span>`;
                }
            });
        } else {
            btnReq.innerHTML = `<span>👤</span> <span class="sdp-req-text">(${remitentes.length})</span> <span style="font-size:8px;opacity:0.7;">▼</span>`;
            btnReq.title = `${remitentes.length} remitentes detectados. Clic para elegir.`;

            const drop = document.createElement('div');
            drop.className = 'sdp-req-dropdown';
            drop.style.display = 'none';

            remitentes.forEach(rem => {
                const opt = document.createElement('button');
                opt.type = 'button';
                opt.className = 'sdp-req-dropdown-item';
                opt.innerHTML = `
                    <span class="sdp-req-item-name">${rem.nombre}</span>
                    <span class="sdp-req-item-mail">${rem.email}</span>
                `;
                opt.title = `${rem.nombre} <${rem.email}>`;

                opt.addEventListener('click', async (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    drop.style.display = 'none';
                    btnReq.innerHTML = `<span>⏳</span>`;
                    const res = await seleccionarSolicitante(rem.email);
                    if (res) {
                        btnReq.classList.add('is-done');
                        btnReq.innerHTML = `<span>✔</span> <span class="sdp-req-text">${rem.nombre.split(' ')[0]}</span>`;
                        setTimeout(() => {
                            btnReq.classList.remove('is-done');
                            btnReq.innerHTML = `<span>👤</span> <span class="sdp-req-text">(${remitentes.length})</span> <span style="font-size:8px;opacity:0.7;">▼</span>`;
                        }, 1200);
                    } else {
                        btnReq.innerHTML = `<span>👤</span> <span class="sdp-req-text">(${remitentes.length})</span> <span style="font-size:8px;opacity:0.7;">▼</span>`;
                    }
                });

                drop.appendChild(opt);
            });

            btnReq.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                drop.style.display = drop.style.display === 'none' ? 'flex' : 'none';
            });

            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) {
                    drop.style.display = 'none';
                }
            });

            wrapper.appendChild(drop);
        }

        wrapper.appendChild(btnReq);
        labelReq.insertBefore(wrapper, labelReq.firstChild);
    }

    function verificarYInyectar(targetNode) {
        if (!esModoValido()) return;

        // Inyección de Cerrar / Rechazar bajo Descripción
        let labelDesc = null;
        if (targetNode && targetNode.matches && targetNode.matches('label[for="for_description"], label[data-title="description"]')) {
            labelDesc = targetNode;
        } else if (targetNode && targetNode.querySelector) {
            labelDesc = targetNode.querySelector('label[for="for_description"], label[data-title="description"]');
        } else {
            labelDesc = document.querySelector('label[for="for_description"], label[data-title="description"]');
        }

        if (labelDesc) {
            let containerDesc = labelDesc.querySelector('.sdp-btn-container-desc');
            if (!containerDesc) {
                containerDesc = document.createElement('div');
                containerDesc.className = 'sdp-btn-container-desc';
                labelDesc.appendChild(containerDesc);
            }

            if (!document.getElementById('sdp-btn-close-ticket')) {
                const btnClose = document.createElement('button');
                btnClose.id = 'sdp-btn-close-ticket';
                btnClose.type = 'button';
                btnClose.className = 'sdp-btn-action';
                btnClose.innerHTML = `<span>🔒 Cerrar Ticket</span>`;
                btnClose.title = 'Pasar a Closed, marcar aceptación, fecha actual y resolución';
                btnClose.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    ejecutarAccion(btnClose, 'close');
                });
                containerDesc.appendChild(btnClose);
            }

            if (!document.getElementById('sdp-btn-reject-ticket')) {
                const btnReject = document.createElement('button');
                btnReject.id = 'sdp-btn-reject-ticket';
                btnReject.type = 'button';
                btnReject.className = 'sdp-btn-action';
                btnReject.innerHTML = `<span>🚫 Rechazar Ticket</span>`;
                btnReject.title = 'Pasar a Rechazado, fecha actual y resolución';
                btnReject.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    ejecutarAccion(btnReject, 'reject');
                });
                containerDesc.appendChild(btnReject);
            }
        }

        // Intento de inyectar botón de remitente
        inyectarBotonRemitente();

        // Si hay iframes recién montados, vigilamos su carga interna para no perder los datos del correo
        const iframes = Array.from(document.querySelectorAll('iframe'));
        iframes.forEach(f => {
            if (!f.dataset.sdpObserved) {
                f.dataset.sdpObserved = 'true';
                f.addEventListener('load', () => setTimeout(inyectarBotonRemitente, 200));
                try {
                    const doc = f.contentDocument || (f.contentWindow && f.contentWindow.document);
                    if (doc) {
                        const frameObs = new MutationObserver(() => inyectarBotonRemitente());
                        frameObs.observe(doc.documentElement || doc.body, { childList: true, subtree: true });
                    }
                } catch (e) {}
            }
        });
    }

    const observer = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            const addedNodes = mutations[i].addedNodes;
            for (let j = 0; j < addedNodes.length; j++) {
                const node = addedNodes[j];
                if (node.nodeType === 1) {
                    verificarYInyectar(node);
                }
            }
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    const reaccionarCambioRuta = () => {
        requestAnimationFrame(() => verificarYInyectar(document));
    };

    const wrapHistoryMethod = (method) => {
        const original = win.history[method];
        if (typeof original === 'function') {
            win.history[method] = function() {
                const result = original.apply(this, arguments);
                reaccionarCambioRuta();
                return result;
            };
        }
    };

    wrapHistoryMethod('pushState');
    wrapHistoryMethod('replaceState');
    win.addEventListener('popstate', reaccionarCambioRuta);

    if (document.readyState !== 'loading') {
        verificarYInyectar(document);
    } else {
        document.addEventListener('DOMContentLoaded', () => verificarYInyectar(document));
    }

})();

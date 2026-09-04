// ==UserScript==
// @name         CinfaEnhancer - ServiceDesk Suite
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Suite integral de automatización para ServiceDesk Plus (Cabecera, Campos rápidos, Cerrar/Rechazar, Plantillas y Resoluciones)
// @author       Tú
// @match        https://servicedesk.helphone.com:8181/*
// @updateURL    https://github.com/ArchmageOki/CinfaEnhacer/raw/refs/heads/main/servicedesk-suite.user.js
// @downloadURL  https://github.com/ArchmageOki/CinfaEnhacer/raw/refs/heads/main/servicedesk-suite.user.js
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // =========================================================================
    // 1. CONFIGURACIÓN Y UTILIDADES GLOBALES
    // =========================================================================
    function esModoValido() {
        const url = window.location.href;
        return url.includes('woMode=editWO') || url.includes('woMode=newWO');
    }

    const wait = ms => new Promise(res => setTimeout(res, ms));

    function obtenerNombreTecnico() {
        let nombre = localStorage.getItem('sdp_tecnico_nombre');
        while (!nombre || !nombre.trim()) {
            nombre = prompt('⚙️ Configuración ServiceDesk:\nIntroduce tu nombre de técnico (tal como aparece en SDP):', 'Juanma');
            if (nombre && nombre.trim()) {
                localStorage.setItem('sdp_tecnico_nombre', nombre.trim());
            } else {
                alert('El nombre de técnico es obligatorio.');
            }
        }
        return localStorage.getItem('sdp_tecnico_nombre');
    }

    if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('✏️ Configurar nombre de Técnico', () => {
            const actual = localStorage.getItem('sdp_tecnico_nombre') || '';
            const nuevo = prompt('Introduce tu nuevo nombre de técnico:', actual);
            if (nuevo && nuevo.trim()) {
                localStorage.setItem('sdp_tecnico_nombre', nuevo.trim());
                alert(`Nombre actualizado a: ${nuevo.trim()}.\nSe recargará la página para aplicar los cambios.`);
                location.reload();
            }
        });
    }

    const TECNICO_DEFECTO = obtenerNombreTecnico();

    function getFechaHoy() {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const anio = hoy.getFullYear();
        return `${dia}/${mes}/${anio}`;
    }

    // =========================================================================
    // 2. ESTILOS CSS UNIFICADOS
    // =========================================================================
    const cssId = 'sdp-suite-styles';
    if (!document.getElementById(cssId)) {
        const estilo = document.createElement('style');
        estilo.id = cssId;
        estilo.innerHTML = `
            /* Botones bajo descripción (Cabecera, Cerrar, Rechazar) */
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
                white-space: nowrap;
                transition: all 0.15s ease;
                user-select: none;
            }
            .sdp-btn-action:hover {
                background-color: #ededed;
                border-color: #b5b5b5;
                color: #111111;
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

            /* Botones rápidos de campos */
            .sdp-quick-btn-group {
                display: inline-flex !important;
                align-items: center !important;
                gap: 2px !important;
                margin-right: 5px !important;
                vertical-align: middle !important;
            }
            .sdp-quick-btn {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                min-width: 19px !important;
                height: 19px !important;
                padding: 0 3px !important;
                background-color: #f7f7f7 !important;
                border: 1px solid #c9c9c9 !important;
                border-radius: 2px !important;
                color: #333333 !important;
                font-size: 10px !important;
                font-weight: 700 !important;
                cursor: pointer !important;
                user-select: none !important;
                box-sizing: border-box !important;
            }
            .sdp-quick-btn:hover {
                background-color: #e6f0fa !important;
                border-color: #2b78e4 !important;
                color: #1a56a6 !important;
            }
            .sdp-quick-btn.is-done {
                background-color: #e6f4ea !important;
                border-color: #34a853 !important;
                color: #137333 !important;
            }

            /* Selector de Solicitante en línea */
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
                white-space: nowrap;
            }
            .sdp-btn-req span.sdp-req-text {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 100px;
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
            }
            .sdp-req-dropdown-item {
                padding: 6px 10px;
                font-size: 11px;
                color: #333333;
                cursor: pointer;
                text-align: left;
                border: none;
                background: none;
                width: 100%;
            }
            .sdp-req-dropdown-item:hover {
                background-color: #c13b38 !important;
                color: #ffffff !important;
            }

            /* Desplegable de Plantillas (Select2 clonado) */
            #sdp-select2-custom-wrapper {
                display: inline-block;
                position: relative;
                vertical-align: middle;
                margin-left: 15px;
                width: 220px;
                font-family: Arial, sans-serif;
                user-select: none;
            }
            .sdp-s2-choice {
                display: block;
                height: 28px;
                padding: 0 0 0 8px;
                overflow: hidden;
                position: relative;
                border: 1px solid #d2d2d2;
                white-space: nowrap;
                line-height: 26px;
                color: #555555;
                text-decoration: none;
                border-radius: 3px;
                background-color: #fcfcfc;
                cursor: pointer;
                box-sizing: border-box;
            }
            #sdp-select2-custom-wrapper.is-open .sdp-s2-choice {
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
                border-color: #aaa;
                background: #fff;
            }
            .sdp-s2-chosen {
                margin-right: 26px;
                display: block;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                font-size: 12px;
                font-weight: 500;
            }
            .sdp-s2-arrow {
                display: inline-block;
                width: 18px;
                height: 100%;
                position: absolute;
                right: 0;
                top: 0;
                border-left: 1px solid #e2e2e2;
                background: #f7f7f7;
            }
            .sdp-s2-arrow b {
                border-color: #666 transparent transparent transparent;
                border-style: solid;
                border-width: 4px 4px 0 4px;
                height: 0;
                left: 50%;
                margin-left: -4px;
                margin-top: -2px;
                position: absolute;
                top: 50%;
                width: 0;
            }
            .sdp-s2-drop {
                position: absolute;
                top: 100%;
                left: 0;
                width: 100%;
                background: #fff;
                border: 1px solid #aaa;
                border-top: 0;
                box-shadow: 0 4px 5px rgba(0, 0, 0, 0.15);
                border-radius: 0 0 3px 3px;
                z-index: 99999;
                display: none;
                box-sizing: border-box;
                padding-top: 4px;
            }
            #sdp-select2-custom-wrapper.is-open .sdp-s2-drop {
                display: block;
            }
            .sdp-s2-search {
                padding: 4px 6px;
            }
            .sdp-s2-search input {
                width: 100%;
                height: 26px;
                padding: 3px 6px;
                font-size: 12px;
                border: 1px solid #aaa;
                border-radius: 2px;
                box-sizing: border-box;
            }
            .sdp-s2-results {
                max-height: 230px;
                padding: 3px 0;
                margin: 0;
                overflow-y: auto;
                list-style: none;
            }
            .sdp-s2-results li {
                padding: 5px 8px;
                font-size: 12px;
                cursor: pointer;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .sdp-s2-results li:hover {
                background-color: #c13b38 !important;
                color: #ffffff !important;
            }

            /* Selector de Resolución en la barra de herramientas */
            #resolution\\.content_control .ze_SCmb {
                position: relative !important;
            }
            #sdp-res-select2-wrapper {
                position: absolute !important;
                right: 6px !important;
                top: 2px !important;
                width: 175px !important;
                height: 22px !important;
                z-index: 100 !important;
            }
            .sdp-res-choice {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                height: 22px !important;
                padding: 0 6px !important;
                border: 1px solid #c9c9c9 !important;
                border-radius: 2px !important;
                background-color: #fafafa !important;
                color: #333 !important;
                cursor: pointer !important;
                font-size: 11px !important;
                font-weight: 600 !important;
                line-height: 20px !important;
            }
            .sdp-res-chosen {
                overflow: hidden !important;
                white-space: nowrap !important;
                text-overflow: ellipsis !important;
            }
            .sdp-res-arrow {
                border-left: 4px solid transparent !important;
                border-right: 4px solid transparent !important;
                border-top: 4px solid #555555 !important;
                flex-shrink: 0 !important;
            }
            #sdp-res-portal-drop {
                position: fixed !important;
                width: 250px !important;
                background: #ffffff !important;
                border: 1px solid #999999 !important;
                box-shadow: 0 4px 14px rgba(0,0,0,0.25) !important;
                border-radius: 3px !important;
                z-index: 2147483647 !important;
                display: none;
                box-sizing: border-box !important;
                padding: 4px !important;
                font-family: Arial, sans-serif !important;
            }
            .sdp-res-search input {
                width: 100% !important;
                height: 24px !important;
                padding: 2px 6px !important;
                font-size: 11px !important;
                border: 1px solid #aaa !important;
                border-radius: 2px !important;
                box-sizing: border-box !important;
                margin-bottom: 3px !important;
            }
            .sdp-res-results {
                max-height: 220px !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow-y: auto !important;
                list-style: none !important;
            }
            .sdp-res-results li {
                padding: 5px 8px !important;
                font-size: 11px !important;
                cursor: pointer !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                border-radius: 2px !important;
            }
            .sdp-res-results li:hover {
                background-color: #c13b38 !important;
                color: #ffffff !important;
            }
            .sdp-res-choice.is-done {
                background-color: #e6f4ea !important;
                border-color: #34a853 !important;
                color: #137333 !important;
            }
        `;
        (document.head || document.documentElement).appendChild(estilo);
    }

    // =========================================================================
    // 3. CONTROLADORES NATIVOS SELECT2 DE SERVICEDESK
    // =========================================================================
    async function selectByName(inputName, textTarget) {
        if (!textTarget) return false;

        const input = document.querySelector(`input[name="${inputName}"], select[name="${inputName}"]`);
        if (!input) return false;

        const container = input.closest('.control-holder, .spot-form') || input.parentElement;
        const choice = container ? container.querySelector('.select2-choice') : null;
        if (!choice) return false;

        choice.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        choice.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        await wait(60);

        const searchInput = document.querySelector('#select2-drop:not(.select2-display-none) .select2-search input');
        if (searchInput) {
            searchInput.value = textTarget;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            await wait(70);
        }

        const results = Array.from(document.querySelectorAll('#select2-drop .select2-result-label'));
        const matched = results.find(r => r.innerText.trim().toLowerCase() === textTarget.toLowerCase()) ||
                        results.find(r => r.innerText.trim().toLowerCase().includes(textTarget.toLowerCase()));

        if (matched) {
            matched.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            await wait(70);
            return true;
        } else {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
            await wait(40);
            return false;
        }
    }

    async function selectCascadeByName(inputName, textTarget, maxAttempts = 15) {
        for (let i = 0; i < maxAttempts; i++) {
            const ok = await selectByName(inputName, textTarget);
            if (ok) return true;
            await wait(110);
        }
        return false;
    }

    async function seleccionarSolicitante(criterio) {
        if (!criterio) return false;

        const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        const originalConfirm = targetWindow.confirm;
        targetWindow.confirm = function() { return false; };

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

                let matched = criterio.includes('@') ? results.find(r => r.innerText.toLowerCase().includes(criterio.toLowerCase())) : null;
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
                    if (cancelBtn && cancelBtn.offsetParent !== null) cancelBtn.click();

                    await wait(80);
                    return true;
                }
            }

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
            return false;
        } finally {
            targetWindow.confirm = originalConfirm;
        }
    }

    // =========================================================================
    // 4. MÓDULO: CABECERA EN DESCRIPCIÓN
    // =========================================================================
    function insertarCabeceraEncima() {
        const fechaHoy = getFechaHoy();
        const textoCabecera = `<b>${fechaHoy} ${TECNICO_DEFECTO}</b><div><br></div><div><br></div><div><br></div>`;

        const iframes = Array.from(document.querySelectorAll('iframe'));
        let editorEncontrado = false;

        for (let f of iframes) {
            try {
                const doc = f.contentDocument || (f.contentWindow && f.contentWindow.document);
                if (doc && doc.body && (doc.body.classList.contains('ze_body') || doc.body.getAttribute('contenteditable') === 'true')) {
                    if (f.closest('#resolution\\.content_control') || f.closest('#rf-resolutionBox')) continue;

                    doc.body.innerHTML = `${textoCabecera}${doc.body.innerHTML}`;
                    doc.body.dispatchEvent(new Event('input', { bubbles: true }));

                    f.contentWindow.focus();
                    doc.body.focus();

                    const win = f.contentWindow;
                    const sel = win.getSelection();
                    if (sel) {
                        const range = doc.createRange();
                        const saltos = doc.body.querySelectorAll('div');
                        const objetivo = saltos.length > 1 ? saltos[1] : saltos[0];
                        range.selectNodeContents(objetivo || doc.body);
                        range.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                    editorEncontrado = true;
                    break;
                }
            } catch (e) {}
        }

        const hiddenTextarea = document.querySelector('textarea[name="description"], textarea[id*="description"]');
        if (hiddenTextarea) {
            hiddenTextarea.value = `${fechaHoy} ${TECNICO_DEFECTO}\n\n\n${hiddenTextarea.value || ''}`;
            hiddenTextarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // =========================================================================
    // 5. MÓDULO: CERRAR / RECHAZAR / SOLICITANTE RÁPIDO
    // =========================================================================
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

        const estaCerradoPorAttr = panel && panel.getAttribute('aria-expanded') === 'false';
        const estaCerradoPorEstilo = contentBox && (contentBox.style.display === 'none' || getComputedStyle(contentBox).display === 'none');

        // 1. Abrir el panel si está colapsado
        if (estaCerradoPorAttr || estaCerradoPorEstilo) {
            const heading = document.querySelector('z-cpheading.zcollapsiblepanel__heading') || (panel ? panel.querySelector('.zcollapsiblepanel__header') : null);
            if (heading) {
                const toggleBtn = heading.querySelector('.p10') || heading;
                toggleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                await wait(280); // Esperar a que la animación termine de renderizar el iframe
            }
        }

        // 2. Localizar y enfocar el editor dentro de la resolución
        const zeContainer = document.getElementById('ze_form_req-form_resolution_content') || document.getElementById('resolution.content_control');
        const iframe = zeContainer ? zeContainer.querySelector('iframe') : document.querySelector('#rf-resolutionBox iframe');

        if (iframe) {
            try {
                iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await wait(100);

                const win = iframe.contentWindow;
                const doc = iframe.contentDocument || (win && win.document);

                if (win && doc && doc.body) {
                    const targetEl = doc.body.classList.contains('ze_body') ? doc.body : (doc.querySelector('.ze_body') || doc.body);

                    win.focus();
                    targetEl.focus();

                    // Colapsar el cursor al inicio del texto
                    const sel = win.getSelection();
                    if (sel) {
                        const range = doc.createRange();
                        range.setStart(targetEl, 0);
                        range.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                    return true;
                }
            } catch (e) {
                console.warn('[SDP Suite] Error enfocando iframe de resolución:', e);
            }
        }

        // Respaldo para textarea simple si no hay editor enriquecido
        const resTextarea = document.getElementById('form_req-form_resolution_content') || document.querySelector('textarea[name="resolution.content"]');
        if (resTextarea) {
            resTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
            resTextarea.focus();
            resTextarea.setSelectionRange(0, 0);
            return true;
        }

        return false;
    }

    async function ejecutarAccionCierre(btn, tipo) {
        btn.classList.add('is-running');
        const originalText = btn.innerHTML;
        btn.innerHTML = tipo === 'close' ? `<span>⏳ Cerrando...</span>` : `<span>⏳ Rechazando...</span>`;

        try {
            if (tipo === 'close') {
                await selectByName('status', 'Closed');
                await confirmarDialogoCierre();
            } else if (tipo === 'reject') {
                await selectByName('status', 'Rechazada');
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

    function extraerRemitentes(texto) {
        if (!texto) return [];
        const regex = /Remitente:\s*([^\r\n<]+)?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/gi;
        const matches = [];
        let match;

        while ((match = regex.exec(texto)) !== null) {
            matches.push({
                nombre: (match[1] || '').trim() || (match[2] || '').trim(),
                email: (match[2] || '').trim()
            });
        }

        const vistos = new Set();
        return matches.reverse().filter(item => {
            const lower = item.email.toLowerCase();
            return vistos.has(lower) ? false : vistos.add(lower);
        });
    }

    function inyectarBotonRemitente() {
        if (!esModoValido()) return;
        if (document.getElementById('sdp-req-wrapper')) return;

        const labelReq = document.querySelector('.col-fields[data-fname="requester"] .left-col label, label[for="for_requester"]');
        if (!labelReq) return;

        let textoDesc = '';
        const iframes = Array.from(document.querySelectorAll('iframe'));
        for (let f of iframes) {
            try {
                const doc = f.contentDocument || (f.contentWindow && f.contentWindow.document);
                if (doc && doc.body && (doc.body.classList.contains('ze_body') || doc.body.getAttribute('contenteditable') === 'true')) {
                    textoDesc = doc.body.innerText || '';
                    if (textoDesc.trim()) break;
                }
            } catch (e) {}
        }
        if (!textoDesc.trim()) {
            const tx = document.querySelector('textarea[name="description"]');
            if (tx) textoDesc = tx.value;
        }

        const remitentes = extraerRemitentes(textoDesc);
        if (!remitentes.length) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'sdp-req-wrapper';
        wrapper.className = 'sdp-btn-container-req-inline';

        const btnReq = document.createElement('button');
        btnReq.type = 'button';
        btnReq.className = 'sdp-btn-req';

        if (remitentes.length === 1) {
            const remitente = remitentes[0];
            btnReq.innerHTML = `<span>👤</span> <span class="sdp-req-text" title="${remitente.nombre} (${remitente.email})">${remitente.nombre}</span>`;
            btnReq.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                btnReq.innerHTML = `<span>⏳</span>`;
                const res = await seleccionarSolicitante(remitente.email);
                btnReq.innerHTML = res ? `<span>✔</span>` : `<span>👤</span>`;
            });
        } else {
            btnReq.innerHTML = `<span>👤</span> <span class="sdp-req-text">(${remitentes.length})</span> <span style="font-size:8px;">▼</span>`;
            const drop = document.createElement('div');
            drop.className = 'sdp-req-dropdown';
            drop.style.display = 'none';

            remitentes.forEach(rem => {
                const opt = document.createElement('button');
                opt.type = 'button';
                opt.className = 'sdp-req-dropdown-item';
                opt.innerHTML = `<b>${rem.nombre}</b><br><small>${rem.email}</small>`;
                opt.addEventListener('click', async (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    drop.style.display = 'none';
                    await seleccionarSolicitante(rem.email);
                });
                drop.appendChild(opt);
            });

            btnReq.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                drop.style.display = drop.style.display === 'none' ? 'flex' : 'none';
            });
            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) drop.style.display = 'none';
            });
            wrapper.appendChild(drop);
        }

        wrapper.appendChild(btnReq);
        labelReq.insertBefore(wrapper, labelReq.firstChild);
    }

    // =========================================================================
    // 6. MÓDULO: BOTONES RÁPIDOS DE CAMPOS
    // =========================================================================
    const CONFIG_GRUPOS = [
        {
            fname: 'status',
            inputName: 'status',
            botones: [
                { etiqueta: 'Abierto', valor: 'Abierto', titulo: 'Estado: Abierto' },
                { etiqueta: 'Usuario', valor: 'Usuario', titulo: 'Estado: Usuario' },
                { etiqueta: 'Plan', valor: 'Planificada', titulo: 'Estado: Planificada' },
                { etiqueta: 'Terceros', valor: 'Terceros', titulo: 'Estado: Terceros' }
            ]
        },
        {
            fname: 'udf_fields.udf_pick_2726',
            inputName: 'udf_fields.udf_pick_2726',
            botones: [
                { etiqueta: 'Front', valor: 'Front Office', titulo: 'Grupo Asignado: Front' },
                { etiqueta: 'SOAP', valor: 'Aplicaciones', titulo: 'Grupo Asignado: Aplicaciones' },
                { etiqueta: 'Onsite',  valor: 'On-site', titulo: 'Grupo Asignado: On-site' },
                { etiqueta: 'A', valor: 'Alcala', titulo: 'Grupo Asignado: Alcalá' },
            ],
            extraAccion: async () => { await selectByName('technician', 'Sin especificar'); }
        },
        {
            fname: 'technician',
            inputName: 'technician',
            botones: [
                { etiqueta: TECNICO_DEFECTO, valor: TECNICO_DEFECTO, titulo: `Técnico: ${TECNICO_DEFECTO}` }
            ]
        },
        {
            fname: 'udf_fields.udf_pick_2719',
            inputName: 'udf_fields.udf_pick_2719',
            botones: [
                { etiqueta: 'Inci', valor: 'Incidencia', titulo: 'Tipo de ticket: Incidencia' },
                { etiqueta: 'Pet', valor: 'Petición',   titulo: 'Tipo de ticket: Petición' },
                { etiqueta: 'Cons', valor: 'Consulta',   titulo: 'Tipo de ticket: Consulta' },
                { etiqueta: 'T', valor: 'Tarea',      titulo: 'Tipo de ticket: Tarea' }
            ]
        },
        {
            fname: 'udf_fields.udf_pick_2724',
            inputName: 'udf_fields.udf_pick_2724',
            botones: [
                { etiqueta: 'Correo',  valor: 'Correo electrónico', titulo: 'Vía ticket: Correo electrónico' },
                { etiqueta: 'Tlf', valor: 'Teléfono',           titulo: 'Vía ticket: Teléfono' },
                { etiqueta: 'Presencial',   valor: 'Presencial',         titulo: 'Vía ticket: Presencial' }
            ]
        },
        {
            fname: 'udf_fields.udf_pick_2725',
            inputName: 'udf_fields.udf_pick_2725',
            botones: [
                { etiqueta: 'Areta',  valor: 'Areta',        titulo: 'Ubicación: Areta' },
                { etiqueta: 'Olloki',   valor: 'Olloki',       titulo: 'Ubicación: Olloki' },
                { etiqueta: 'Neo', valor: 'Neo',          titulo: 'Ubicación: Neo' },
                { etiqueta: 'Del', valor: 'Delegados',    titulo: 'Ubicación: Delegados' },
                { etiqueta: 'A',  valor: 'Cinfa-Alcala', titulo: 'Ubicación: Cinfa-Alcala' }
            ]
        }
    ];

    function inyectarBotonesCampos() {
        if (!esModoValido()) return;

        CONFIG_GRUPOS.forEach(grupo => {
            const wrapperId = `sdp-quick-group-${grupo.fname.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
            if (document.getElementById(wrapperId)) return;

            const row = document.querySelector(`.fafr-row[data-fname="${grupo.fname}"]`);
            if (!row) return;

            const label = row.querySelector('.left-col label, label.fafr-label');
            if (!label) return;

            const groupContainer = document.createElement('span');
            groupContainer.id = wrapperId;
            groupContainer.className = 'sdp-quick-btn-group';

            grupo.botones.forEach(btnConfig => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'sdp-quick-btn';
                btn.textContent = btnConfig.etiqueta;
                btn.title = btnConfig.titulo;

                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    btn.classList.add('is-running');
                    const ok = await selectCascadeByName(grupo.inputName, btnConfig.valor, 6);
                    if (ok && typeof grupo.extraAccion === 'function') await grupo.extraAccion();

                    btn.classList.remove('is-running');
                    if (ok) {
                        btn.classList.add('is-done');
                        setTimeout(() => btn.classList.remove('is-done'), 700);
                    }
                });

                groupContainer.appendChild(btn);
            });

            const spanTexto = label.querySelector('span:not(.mandatory)') || label.lastElementChild || label;
            if (spanTexto && spanTexto !== label) {
                label.insertBefore(groupContainer, spanTexto);
            } else {
                label.insertBefore(groupContainer, label.firstChild);
            }
        });
    }

    // =========================================================================
    // 7. MÓDULO: PLANTILLAS DE TICKET
    // =========================================================================
    const MIS_PRESETS = [
        {
            nombre: "✅ Alta Eduardo Infante",
            obtenerDatos: () => ({ solicitante: 'eduardo.infante@cinfa.com', grupo: 'Administrativa', subgrupo: 'Usuario', elemento: 'Alta', grupoAsignado: 'Front Office', tipoTicket: 'Petición', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Usuario - Alta - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "✅ Alta Laura Moreno",
            obtenerDatos: () => ({ solicitante: 'lmoreno@cinfa.com', grupo: 'Administrativa', subgrupo: 'Usuario', elemento: 'Alta', grupoAsignado: 'Front Office', tipoTicket: 'Petición', viaTicket: 'Correo electrónico', ubicacion: 'Areta', asunto: 'Usuario - Alta - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "✅ Alta Itziar Sánchez",
            obtenerDatos: () => ({ solicitante: 'isanchez@cinfa.com', grupo: 'Administrativa', subgrupo: 'Usuario', elemento: 'Alta', grupoAsignado: 'Front Office', tipoTicket: 'Petición', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Usuario - Alta - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "🪑 Salas",
            obtenerDatos: () => ({ grupo: 'Administrativa', subgrupo: 'Salas/Equipamiento Prest', elemento: 'Funcionamiento', grupoAsignado: 'Front Office', tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Sala {{Nombre de la sala}} - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "❌ Baja",
            obtenerDatos: () => ({ grupo: 'Administrativa', subgrupo: 'Usuario', elemento: 'Baja', grupoAsignado: 'Front Office', tipoTicket: 'Petición', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Usuario - Baja - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "📩 Correo de SAP",
            obtenerDatos: () => ({ grupo: 'Aplicaciones corporativas', subgrupo: 'SAP', elemento: 'Funcionamiento', grupoAsignado: 'Aplicaciones', tipoTicket: 'Incidencia', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'SAP - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "📩 Correo de GII",
            obtenerDatos: () => ({ grupo: 'Aplicaciones corporativas', subgrupo: 'GII/Comer', elemento: 'Funcionamiento', grupoAsignado: 'Aplicaciones', tipoTicket: 'Incidencia', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'GII - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "📺 VDI",
            obtenerDatos: () => ({ grupo: 'Aplicaciones citrix', subgrupo: 'Escritorios virtuales', elemento: 'Funcionamiento', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Incidencia', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'VDI - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "🍋‍🟩 Aplicaciones publicadas",
            obtenerDatos: () => ({ grupo: 'Aplicaciones citrix', subgrupo: 'Aplicaciones publicadas', elemento: 'Funcionamiento', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Incidencia', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: '{Nombre de la aplicación} - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "🍋 Cliente Citrix",
            obtenerDatos: () => ({ grupo: 'Aplicaciones citrix', subgrupo: 'Cliente Citrix', elemento: 'Funcionamiento', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Incidencia', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Citrix - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "☢️ Líder NEO",
            obtenerDatos: () => ({ solicitante: 'lider.neo@cinfa.com', grupo: 'Aplicaciones corporativas', subgrupo: 'NEO', elemento: 'Funcionamiento', grupoAsignado: 'Aplicaciones Neo', tecnico: 'Soporte Neo', tipoTicket: 'Incidencia', viaTicket: 'Correo electrónico', ubicacion: 'NEO', asunto: 'NEO - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "💻 Hardware (portátil)",
            obtenerDatos: () => ({ grupo: 'Hardware', subgrupo: 'Portatil', elemento: 'Configuracion', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Portatil - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "🖨️ Hardware (impresora)",
            obtenerDatos: () => ({ grupo: 'Hardware', subgrupo: 'Impresora', elemento: 'Funcionamiento', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Impresora - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "🖨️ Hardware (etiquetadora)",
            obtenerDatos: () => ({ grupo: 'Hardware', subgrupo: 'Etiquetadora', elemento: 'Funcionamiento', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Etiquetadora - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "⚒️ Hardware (accesorios)",
            obtenerDatos: () => ({ grupo: 'Hardware', subgrupo: 'Accesorios (material)', elemento: 'Configuracion', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Accesorios - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "📺 Hardware (pantalla)",
            obtenerDatos: () => ({ grupo: 'Hardware', subgrupo: 'Pantalla', elemento: 'Configuracion', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Pantalla - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "⚒️ Hardware (servidores)",
            obtenerDatos: () => ({ grupo: 'Hardware', subgrupo: 'Servidores', elemento: 'Configuracion', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Servidor - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "💁 Delegado (portátil delegado)",
            obtenerDatos: () => ({ grupo: 'Hardware', subgrupo: 'Portatil delegados', elemento: 'Configuracion', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Portatil delegado - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "😭 Recuperación de datos",
            obtenerDatos: () => ({ grupo: 'Monitorización', subgrupo: 'Backup/restore', elemento: 'Recuperacion datos', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Petición', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Backup - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "©️ Docuware (eliminar contrato)",
            obtenerDatos: () => ({ grupo: 'Aplicaciones corporativas', subgrupo: 'Docuware web', elemento: 'Eliminacion contratos', grupoAsignado: 'Aplicaciones', tipoTicket: 'Petición', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Docuware - Eliminar contrato', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "©️ Docuware (estado de firmas)",
            obtenerDatos: () => ({ grupo: 'Aplicaciones corporativas', subgrupo: 'Docuware web', elemento: 'Estados de firma', grupoAsignado: 'Aplicaciones', tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Docuware - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "🛜 LAN/WAN",
            obtenerDatos: () => ({ grupo: 'Comunicaciones', subgrupo: 'LAN/WAN', elemento: 'Configuracion-NAC', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Red - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "🛜 Parchear tomas de red",
            obtenerDatos: () => ({ grupo: 'Comunicaciones', subgrupo: 'LAN/WAN', elemento: 'Instalacion-parcheado tomas', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Petición', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Red - Parchear tomas', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "📱 Móviles (general)",
            obtenerDatos: () => ({ grupo: 'Comunicaciones', subgrupo: 'Telefonia', elemento: 'Funcionamiento', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Movil - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "📱 Móviles (roaming)",
            obtenerDatos: () => ({ grupo: 'Comunicaciones', subgrupo: 'Telefonia', elemento: 'Roaming', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Petición', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Movil - Solicitud de Roaming', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "🈲 VPN (general)",
            obtenerDatos: () => ({ grupo: 'Comunicaciones', subgrupo: 'VPN', elemento: 'Funcionamiento', grupoAsignado: 'Aplicaciones', tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'VPN - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "🈲 VPN (alta de usuarios)",
            obtenerDatos: () => ({ grupo: 'Comunicaciones', subgrupo: 'VPN', elemento: 'Gestion usuarios', grupoAsignado: 'Aplicaciones', tipoTicket: 'Petición', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'VPN - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "🅰️ Software (Adobe)",
            obtenerDatos: () => ({ grupo: 'Software', subgrupo: 'Adobe pro', elemento: 'Funcionamiento', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Adobe - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "♿ Software (navegadores)",
            obtenerDatos: () => ({ grupo: 'Software', subgrupo: 'Navegadores chrome y edge', elemento: 'Funcionamiento', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Chrome - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "♿ Software (Office)",
            obtenerDatos: () => ({ grupo: 'Software', subgrupo: 'Office M365', elemento: 'Funcionamiento', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Office - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "🚮 Software (Contraseña de Windows)",
            obtenerDatos: () => ({ grupo: 'Software', subgrupo: 'Sistema Operativo', elemento: 'Usuario/contraseña', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Petición', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Windows - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "👨‍🦽‍➡️ Software (Windows)",
            obtenerDatos: () => ({ grupo: 'Software', subgrupo: 'Sistema Operativo', elemento: 'Funcionamiento', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: 'Windows - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "🥽 Software (ofimática general)",
            obtenerDatos: () => ({ grupo: 'Software', subgrupo: 'Ofimatica general', elemento: 'Funcionamiento', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: '{{Nombre del programa}} - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        },
        {
            nombre: "🥽 Software (webs corporativas y certificados)",
            obtenerDatos: () => ({ grupo: 'Software', subgrupo: 'Webs corp. y certificados', elemento: 'Funcionamiento', grupoAsignado: 'Front Office', tecnico: TECNICO_DEFECTO, tipoTicket: 'Consulta', viaTicket: 'Correo electrónico', ubicacion: 'Olloki', asunto: '{{Nombre del de la web}} - ', descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>` })
        }
    ];

    async function aplicarPreset(config) {
        if (config.asunto) {
            const subject = document.querySelector('input[name="subject"]');
            if (subject) {
                subject.value = config.asunto;
                subject.dispatchEvent(new Event('input', { bubbles: true }));
                subject.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        if (config.descripcion) {
            const iframes = Array.from(document.querySelectorAll('iframe'));
            for (let f of iframes) {
                try {
                    const doc = f.contentDocument || (f.contentWindow && f.contentWindow.document);
                    if (doc && doc.body && (doc.body.classList.contains('ze_body') || doc.body.getAttribute('contenteditable') === 'true')) {
                        if (f.closest('#resolution\\.content_control') || f.closest('#rf-resolutionBox')) continue;
                        doc.body.innerHTML = `<div>${config.descripcion}</div>`;
                        doc.body.dispatchEvent(new Event('input', { bubbles: true }));
                        break;
                    }
                } catch (e) {}
            }
            const hiddenTextarea = document.querySelector('textarea[name="description"]');
            if (hiddenTextarea) {
                hiddenTextarea.value = config.descripcion;
                hiddenTextarea.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        if (config.solicitante) await seleccionarSolicitante(config.solicitante);
        if (config.grupo)       await selectByName('udf_fields.udf_pick_2720', config.grupo);
        if (config.subgrupo)    await selectCascadeByName('udf_fields.udf_pick_2722', config.subgrupo);
        if (config.elemento)    await selectCascadeByName('udf_fields.udf_pick_2723', config.elemento);
        if (config.grupoAsignado) await selectByName('udf_fields.udf_pick_2726', config.grupoAsignado);
        if (config.tecnico)       await selectByName('technician', config.tecnico);
        if (config.tipoTicket)    await selectByName('udf_fields.udf_pick_2719', config.tipoTicket);
        if (config.viaTicket)     await selectByName('udf_fields.udf_pick_2724', config.viaTicket);
        if (config.ubicacion)     await selectByName('udf_fields.udf_pick_2725', config.ubicacion);
        if (config.estado)        await selectByName('status', config.estado);
    }

    function inyectarSelect2Plantillas() {
        if (!esModoValido()) return;
        if (document.getElementById('sdp-select2-custom-wrapper')) return;

        const requesterRightCol = document.querySelector('.col-fields[data-fname="requester"] .right-col .col-xs-12');
        if (!requesterRightCol) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'sdp-select2-custom-wrapper';
        wrapper.className = 'fl';

        const choice = document.createElement('a');
        choice.className = 'sdp-s2-choice';
        choice.href = 'javascript:void(0)';
        choice.innerHTML = `
            <span class="sdp-s2-chosen">⚡ Plantillas</span>
            <span class="sdp-s2-arrow"><b></b></span>
        `;

        const drop = document.createElement('div');
        drop.className = 'sdp-s2-drop';

        const searchDiv = document.createElement('div');
        searchDiv.className = 'sdp-s2-search';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchDiv.appendChild(searchInput);
        drop.appendChild(searchDiv);

        const resultsList = document.createElement('ul');
        resultsList.className = 'sdp-s2-results';

        MIS_PRESETS.forEach(preset => {
            const li = document.createElement('li');
            li.innerText = preset.nombre;
            li.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                wrapper.classList.remove('is-open');

                const chosenSpan = choice.querySelector('.sdp-s2-chosen');
                chosenSpan.innerText = '⏳ Aplicando...';
                await aplicarPreset(preset.obtenerDatos());
                chosenSpan.innerText = `✔ ${preset.nombre.split(' ')[1] || 'Listo'}`;
                await wait(600);
                chosenSpan.innerText = '⚡ Plantillas';
            });
            resultsList.appendChild(li);
        });

        drop.appendChild(resultsList);
        wrapper.appendChild(choice);
        wrapper.appendChild(drop);

        searchInput.addEventListener('input', () => {
            const filtro = searchInput.value.toLowerCase().trim();
            resultsList.querySelectorAll('li').forEach(li => {
                li.style.display = li.innerText.toLowerCase().includes(filtro) ? 'block' : 'none';
            });
        });

        choice.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = wrapper.classList.toggle('is-open');
            if (isOpen) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
                setTimeout(() => searchInput.focus(), 60);
            }
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) wrapper.classList.remove('is-open');
        });

        requesterRightCol.appendChild(wrapper);
    }

    // =========================================================================
    // 8. MÓDULO: PLANTILLAS DE RESOLUCIÓN (Corregido y vinculado al iframe real)
    // =========================================================================
    const RESOLUCIONES = [
        {
            titulo: "✳️ Instrucciones de TIM",
            obtenerTexto: () => `Para cambiar tu contraseña debes acceder a TIM desde el siguiente enlace<br><br>
            http://virtualpassword.cinfa.com/Tim/Index<br><br>
            Deberás iniciar sesión con el número de tu tarjeta blanca de Cinfa y tu DNI con la letra mayúscula.<br>
            Dentro de TIM tienes las siguientes opciones:<br>
            -Windows: para cambiar tu contraseña de Windows, Gmail y acceso al escritorio virtual<br>
            -GII<br>
            -SAP<br>
            -Intranet: para cambiar tu contraseña de la intranet de aplicaciones (la del fondo morado)<br><br>
            La contraseña de Windows e Intranet debe cumplir los siguientes requisitos:<br><br>
            -Al menos 12 caracteres<br>
            -Al menos: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial. No admite algunos caracteres como ñ, ¡, ¿ o letras acentuadas<br>
            -No puede contener tu nombre o apellidos, tampoco palabras comunes completas<br><br>
            La contraseña de GII y SAP debe tener entre 8 y 12 caracteres de longitud y no tiene los requisitos anteriores.`
        },
        {
            titulo: "❌ Ticket rechazado",
            obtenerTexto: () => `Hemos intentado contactar contigo en los últimos días pero no hemos obtenido respuesta.<br>
            Si aún necesitas asistencia contáctanos a través de helpdesk@cinfa.com o llamando al 1599.`
        }
    ];

    async function sobrescribirResolucion(htmlContent) {
        // Localizar el iframe del editor Ze específico de resolución
        const zeContainer = document.getElementById('ze_form_req-form_resolution_content') || document.getElementById('resolution.content_control');
        const iframe = zeContainer ? zeContainer.querySelector('iframe') : document.querySelector('#rf-resolutionBox iframe');

        if (iframe) {
            try {
                const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                if (doc && doc.body) {
                    // Limpiar y escribir contenido
                    doc.body.innerHTML = htmlContent ? `<div>${htmlContent}</div>` : '<div><br></div>';

                    // Forzar eventos de entrada que actualizan el store de SDP
                    doc.body.dispatchEvent(new Event('input', { bubbles: true }));
                    doc.body.dispatchEvent(new Event('change', { bubbles: true }));

                    if (iframe.contentWindow) {
                        iframe.contentWindow.focus();
                        doc.body.focus();
                    }
                }
            } catch (e) {
                console.warn('[SDP Suite] Error en iframe resolución:', e);
            }
        }

        // Sincronizar el textarea nativo que envía el formulario
        const textarea = document.getElementById('form_req-form_resolution_content') || document.querySelector('textarea[name="resolution.content"]');
        if (textarea) {
            textarea.value = htmlContent;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }

        return true;
    }

    let portalDrop = null;
    let portalInput = null;
    let portalList = null;
    let activeChoiceBtn = null;

    function crearPortal() {
        if (portalDrop) return portalDrop;

        portalDrop = document.createElement('div');
        portalDrop.id = 'sdp-res-portal-drop';

        const searchDiv = document.createElement('div');
        searchDiv.className = 'sdp-res-search';
        portalInput = document.createElement('input');
        portalInput.type = 'text';
        portalInput.placeholder = 'Buscar resolución...';
        searchDiv.appendChild(portalInput);
        portalDrop.appendChild(searchDiv);

        portalList = document.createElement('ul');
        portalList.className = 'sdp-res-results';

        RESOLUCIONES.forEach(resItem => {
            const li = document.createElement('li');
            li.innerText = resItem.titulo;

            // Uso de mousedown para ganarle a cualquier blur o ciclo de eventos nativos
            li.addEventListener('mousedown', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const btn = activeChoiceBtn;
                if (portalDrop) portalDrop.style.display = 'none';

                if (btn) {
                    const chosenSpan = btn.querySelector('.sdp-res-chosen');
                    if (chosenSpan) chosenSpan.innerText = '⏳ Aplicando...';

                    await sobrescribirResolucion(resItem.obtenerTexto());

                    btn.classList.add('is-done');
                    if (chosenSpan) chosenSpan.innerText = `✔ ${resItem.titulo.replace(/^[^\w]+/g, '').split(' ')[0] || 'Listo'}`;
                    await wait(800);
                    btn.classList.remove('is-done');
                    if (chosenSpan) chosenSpan.innerText = '📝 Resolución';
                }
            });

            portalList.appendChild(li);
        });

        portalDrop.appendChild(portalList);

        portalInput.addEventListener('input', () => {
            const filtro = portalInput.value.toLowerCase().trim();
            portalList.querySelectorAll('li').forEach(li => {
                li.style.display = li.innerText.toLowerCase().includes(filtro) ? 'block' : 'none';
            });
        });

        portalDrop.addEventListener('mousedown', (e) => e.stopPropagation());
        document.body.appendChild(portalDrop);

        document.addEventListener('mousedown', (e) => {
            if (!portalDrop || portalDrop.style.display !== 'block') return;
            if (!portalDrop.contains(e.target) && (!activeChoiceBtn || !activeChoiceBtn.contains(e.target))) {
                portalDrop.style.display = 'none';
                activeChoiceBtn = null;
            }
        });

        return portalDrop;
    }

    function inyectarBotonResoluciones() {
        if (!esModoValido()) return;
        if (document.getElementById('sdp-res-select2-wrapper')) return;

        const toolbar = document.querySelector('#resolution\\.content_control .ze_SCmb');
        if (!toolbar) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'sdp-res-select2-wrapper';

        const choice = document.createElement('a');
        choice.className = 'sdp-res-choice';
        choice.href = 'javascript:void(0)';
        choice.innerHTML = `
            <span class="sdp-res-chosen">📝 Resolución</span>
            <span class="sdp-res-arrow"></span>
        `;

        choice.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            crearPortal();
            if (portalDrop.style.display === 'block' && activeChoiceBtn === choice) {
                portalDrop.style.display = 'none';
                activeChoiceBtn = null;
            } else {
                activeChoiceBtn = choice;
                const rect = choice.getBoundingClientRect();
                portalDrop.style.top = `${rect.bottom + 2}px`;
                portalDrop.style.left = `${Math.max(10, rect.right - 250)}px`;
                portalDrop.style.display = 'block';

                portalInput.value = '';
                portalInput.dispatchEvent(new Event('input'));
                setTimeout(() => portalInput.focus(), 60);
            }
        });

        wrapper.appendChild(choice);
        toolbar.appendChild(wrapper);
    }

    // =========================================================================
    // 9. OBSERVADOR Y DESPACHADOR CENTRAL
    // =========================================================================
    function inyectarBotonesDescripcion(labelDesc) {
        if (!labelDesc) return;

        let containerDesc = labelDesc.querySelector('.sdp-btn-container-desc');
        if (!containerDesc) {
            containerDesc = document.createElement('div');
            containerDesc.className = 'sdp-btn-container-desc';
            labelDesc.appendChild(containerDesc);
        }

        // 1. Botón Cabecera
        if (!document.getElementById('sdp-btn-insert-header')) {
            const btnHeader = document.createElement('button');
            btnHeader.id = 'sdp-btn-insert-header';
            btnHeader.type = 'button';
            btnHeader.className = 'sdp-btn-action';
            btnHeader.innerHTML = `<span>➕ Cabecera (${TECNICO_DEFECTO})</span>`;
            btnHeader.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                insertarCabeceraEncima();
                btnHeader.classList.add('is-done');
                setTimeout(() => btnHeader.classList.remove('is-done'), 800);
            });
            containerDesc.appendChild(btnHeader);
        }

        // 2. Botón Cerrar
        if (!document.getElementById('sdp-btn-close-ticket')) {
            const btnClose = document.createElement('button');
            btnClose.id = 'sdp-btn-close-ticket';
            btnClose.type = 'button';
            btnClose.className = 'sdp-btn-action';
            btnClose.innerHTML = `<span>🔒 Cerrar Ticket</span>`;
            btnClose.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                ejecutarAccionCierre(btnClose, 'close');
            });
            containerDesc.appendChild(btnClose);
        }

        // 3. Botón Rechazar
        if (!document.getElementById('sdp-btn-reject-ticket')) {
            const btnReject = document.createElement('button');
            btnReject.id = 'sdp-btn-reject-ticket';
            btnReject.type = 'button';
            btnReject.className = 'sdp-btn-action';
            btnReject.innerHTML = `<span>🚫 Rechazar Ticket</span>`;
            btnReject.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                ejecutarAccionCierre(btnReject, 'reject');
            });
            containerDesc.appendChild(btnReject);
        }
    }

    function cicloPrincipal() {
        if (!esModoValido()) return;

        const labelDesc = document.querySelector('label[for="for_description"], label[data-title="description"]');
        if (labelDesc) inyectarBotonesDescripcion(labelDesc);

        inyectarBotonRemitente();
        inyectarBotonesCampos();
        inyectarSelect2Plantillas();
        inyectarBotonResoluciones();
    }

    const observer = new MutationObserver(() => cicloPrincipal());
    observer.observe(document.documentElement, { childList: true, subtree: true });

    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const reaccionarRuta = () => requestAnimationFrame(cicloPrincipal);

    const wrapHistory = (method) => {
        const original = win.history[method];
        if (typeof original === 'function') {
            win.history[method] = function() {
                const res = original.apply(this, arguments);
                reaccionarRuta();
                return res;
            };
        }
    };
    wrapHistory('pushState');
    wrapHistory('replaceState');
    win.addEventListener('popstate', reaccionarRuta);

    if (document.readyState !== 'loading') {
        cicloPrincipal();
    } else {
        document.addEventListener('DOMContentLoaded', cicloPrincipal);
    }
})();

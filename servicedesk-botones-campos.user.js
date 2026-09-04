// ==UserScript==
// @name         ServiceDesk - Botones Rápidos de Campos
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Botones compactos a la izquierda de Estado, Grupo Asignado, Técnico, Tipo de ticket, Vía ticket y Ubicación
// @author       Tú
// @match        https://servicedesk.helphone.com:8181/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // =========================================================================
    // ⚙️ CONFIGURACIÓN GLOBAL (Modificar aquí el nombre del técnico por defecto)
    // =========================================================================
    const TECNICO_DEFECTO = 'Juanma';

    function esModoValido() {
        const url = window.location.href;
        return url.includes('woMode=editWO') || url.includes('woMode=newWO');
    }

    const wait = ms => new Promise(res => setTimeout(res, ms));

    const cssId = 'sdp-quick-buttons-style';
    if (!document.getElementById(cssId)) {
        const estilo = document.createElement('style');
        estilo.id = cssId;
        estilo.innerHTML = `
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
                font-family: Arial, sans-serif !important;
                font-size: 10px !important;
                font-weight: 700 !important;
                line-height: 1 !important;
                cursor: pointer !important;
                user-select: none !important;
                box-sizing: border-box !important;
                transition: all 0.1s ease !important;
            }

            .sdp-quick-btn:hover {
                background-color: #e6f0fa !important;
                border-color: #2b78e4 !important;
                color: #1a56a6 !important;
            }

            .sdp-quick-btn:active {
                transform: translateY(1px) !important;
            }

            .sdp-quick-btn.is-running {
                opacity: 0.6 !important;
                pointer-events: none !important;
            }

            .sdp-quick-btn.is-done {
                background-color: #e6f4ea !important;
                border-color: #34a853 !important;
                color: #137333 !important;
            }
        `;
        (document.head || document.documentElement).appendChild(estilo);
    }

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
            extraAccion: async () => {
                await selectByName('technician', 'Sin especificar');
            }
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

    function inyectarBotones() {
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

                    if (ok && typeof grupo.extraAccion === 'function') {
                        await grupo.extraAccion();
                    }

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

    const observer = new MutationObserver(() => {
        inyectarBotones();
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const reaccionarRuta = () => requestAnimationFrame(inyectarBotones);

    const wrapHistoryMethod = (method) => {
        const original = win.history[method];
        if (typeof original === 'function') {
            win.history[method] = function() {
                const res = original.apply(this, arguments);
                reaccionarRuta();
                return res;
            };
        }
    };

    wrapHistoryMethod('pushState');
    wrapHistoryMethod('replaceState');
    win.addEventListener('popstate', reaccionarRuta);

    if (document.readyState !== 'loading') {
        inyectarBotones();
    } else {
        document.addEventListener('DOMContentLoaded', inyectarBotones);
    }

})();

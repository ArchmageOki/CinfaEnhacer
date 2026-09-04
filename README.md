# 🛠️ CinfaEnhancer - Herramientas para ServiceDesk Plus & Vozitel

Colección de scripts para **Tampermonkey** diseñados para optimizar flujos de trabajo, automatizar la tipificación de tickets y conectar de forma limpia Vozitel con ServiceDesk Plus.

---

## 🚀 Instalación

Para instalar o actualizar los scripts, accede al portal web del proyecto:

👉 **[Portal de Instalación de Scripts](https://archmageoki.github.io/CinfaEnhacer/)**

> **Requisito:** Tener instalada la extensión **Tampermonkey** en Google Chrome.

---

## 📦 Scripts Disponibles

### 1. `servicedesk-cabecera.user.js`
* **Nombre:** ServiceDesk - Añadir cabecera a la descripción
* **Entorno:** ServiceDesk Plus (`servicedesk.helphone.com:8181`)
* **Acción:** Inserta un botón `➕ Cabecera (Nombre)` bajo la etiqueta *Descripción*. Al pulsarlo, estampa la fecha actual (`DD/MM/AAAA`) junto con el nombre del técnico configurado en negrita, añadiendo tres saltos de línea y enfocando el cursor en el segundo salto para redactar de inmediato. Compatible con el editor enriquecido (iframe) y el textarea estándar.

### 2. `servicedesk-botones-campos.user.js`
* **Nombre:** ServiceDesk - Botones Rápidos de Campos
* **Entorno:** ServiceDesk Plus (`servicedesk.helphone.com:8181`)
* **Acción:** Introduce botones compactos a la izquierda de cada campo del formulario para seleccionarlos con un solo clic mediante la API nativa de Select2:
  * **Estado:** `[Abierto]`, `[Usuario]`, `[Plan]`, `[Terceros]`
  * **Grupo Asignado:** `[Front]`, `[SOAP]`, `[Onsite]`, `[A]` (asigna automáticamente el técnico a *Sin especificar*)
  * **Técnico:** Botón directo con tu propio nombre configurado
  * **Tipo de ticket:** `[Inci]`, `[Pet]`, `[Cons]`, `[T]`
  * **Vía ticket:** `[Correo]`, `[Tlf]`, `[Presencial]`
  * **Ubicación:** `[Areta]`, `[Olloki]`, `[Neo]`, `[Del]`, `[A]`

### 3. `servicedesk-cerrar-rechazar.user.js`
* **Nombre:** ServiceDesk - Cerrar / Rechazar / Remitente Rápido
* **Entorno:** ServiceDesk Plus (`servicedesk.helphone.com:8181`)
* **Acción:**
  * **Acciones de resolución:** Añade botones para **Cerrar Ticket** (pasa a *Closed*, confirma el diálogo de aceptación del usuario, fija la fecha de cierre actual y despliega la resolución) y **Rechazar Ticket** (fija estado *Rechazado*, fecha actual y resolución).
  * **Extractor de Remitente:** Escanea el cuerpo del ticket buscando cabeceras `Remitente: ... <email>` y coloca un botón a la izquierda de la etiqueta *Solicitante*. Si hay un remitente, lo asigna directamente; si hay varios, despliega un menú para elegirlo.

### 4. `servicedesk-plantillas.user.js`
* **Nombre:** ServiceDesk - Plantillas para tickets
* **Entorno:** ServiceDesk Plus (`servicedesk.helphone.com:8181`)
* **Acción:** Integra un selector clónico de Select2 (`⚡ Plantillas`) a la derecha del bloque de Solicitante. Permite buscar y aplicar de golpe plantillas completas (Altas de usuarios, Salas, Bajas, VDI, Citrix, SAP, GII, Hardware, VPN, etc.), rellenando asunto, descripción, técnico, grupo, subgrupo, elemento, vía y estado correspondiente.

### 5. `vozitel-copiar-correo.user.js`
* **Nombre:** Vozitel - Copiar Correo con Imágenes para ServiceDesk
* **Entorno:** Vozitel (`apps7v20.vozitel.com`)
* **Acción:** Inyecta un botón flotante arrastrable (`📋 Copiar para ServiceDesk`) en la vista de registros. Tras pulsar "Responder a todos" en Vozitel, este script:
  * Rastrea y recupera imágenes embebidas en Base64 incluso dentro de iframes.
  * Normaliza y formatea las líneas de *Remitente* y *Destinatario* adaptándolas a la sintaxis esperada por ServiceDesk (`Remitente: Nombre <email>`).
  * Reconstruye el árbol HTML reparando imágenes rotas o perdidas y copia el contenido al portapapeles en formato enriquecido (`text/html`) y texto plano.

---

## ⚙️ Configuración del Técnico

Los scripts de ServiceDesk (`servicedesk-cabecera`, `servicedesk-botones-campos` y `servicedesk-plantillas`) comparten una configuración única y sincronizada:

* **Primera ejecución:** Al abrir un formulario por primera vez, el navegador solicitará tu nombre de técnico mediante una ventana emergente.
* **Persistencia:** El nombre se guarda en el almacenamiento local del dominio (`localStorage`). **No se sobreescribe ni se pierde al actualizar los scripts**.
* **Modificación posterior:** Para cambiar el nombre en cualquier momento, haz clic en el icono de **Tampermonkey** mientras estás en ServiceDesk y selecciona la opción:
  `✏️ Configurar nombre de Técnico`.

---

## 🔄 Actualizaciones Automáticas

Cada archivo incluye directivas `@updateURL` y `@downloadURL` sincronizadas con la rama `main` de este repositorio. Cada vez que se publique una nueva versión (incrementando la directiva `@version`), Tampermonkey actualizará las extensiones en segundo plano en los equipos de los usuarios.

# 🛠️ CinfaEnhancer - Herramientas para ServiceDesk Plus & Vozitel

Colección de scripts para **Tampermonkey** diseñados para optimizar el flujo de trabajo diario, agilizar la tipificación de tickets y conectar de forma limpia Vozitel con ServiceDesk Plus.

---

## 🚀 Instalación

Para instalar o actualizar los scripts, accede al portal web del proyecto:

👉 **[Portal de Instalación de Scripts](https://archmageoki.github.io/CinfaEnhacer/)**

> **Requisito:** Tener instalada la extensión **Tampermonkey** en tu navegador.

---

## 📦 Scripts Disponibles

### 1. `servicedesk-suite.user.js`
* **Nombre:** CinfaEnhancer - ServiceDesk Suite
* **Entorno:** ServiceDesk Plus (`servicedesk.helphone.com:8181`)
* **Descripción:** Solución integral que centraliza todas las herramientas de automatización dentro de la ticketera:
  * **➕ Cabecera rápida:** Estampa la fecha actual (`DD/MM/AAAA`) y el nombre del técnico en negrita en la descripción, dejando el cursor preparado para redactar.
  * **⚡ Botones de campos:** Botones compactos a la izquierda de cada selector para fijar con un clic Estado (`Abierto`, `Usuario`, `Plan`, `Terceros`), Grupo Asignado (`Front`, `SOAP`, `Onsite`, `A`), Técnico configurado, Tipo de ticket (`Inci`, `Pet`, `Cons`, `T`), Vía (`Correo`, `Tlf`, `Presencial`) y Ubicación (`Areta`, `Olloki`, `Neo`, `Del`, `A`).
  * **👤 Detección de Solicitante:** Analiza el cuerpo del mensaje, extrae las direcciones de correo de cabeceras de remitente y añade un botón directo para asignar el solicitante de forma automática o mediante menú desplegable si hay varios.
  * **🔒 Cerrar / 🚫 Rechazar:** Cambia el estado a *Closed* o *Rechazada*, confirma el diálogo de aceptación del usuario, establece la fecha de resolución actual, expande el acordeón de resolución y enfoca el editor de texto.
  * **⚡ Plantillas de tickets:** Desplegable tipo Select2 junto a Solicitante que autocompleta formularios enteros (Altas de usuario, Salas, Bajas, VDI, Citrix, SAP, GII, Hardware, VPN, etc.) con asunto, descripción tipificada y derivaciones preconfiguradas.
  * **📝 Plantillas de Resolución:** Desplegable integrado en la barra de herramientas del editor Ze con buscador en tiempo real para estampar resoluciones predefinidas (TIM, Tickets rechazados, Resuelto estándar, etc.).

### 2. `vozitel-copiar-correo.user.js`
* **Nombre:** Vozitel - Copiar Correo con Imágenes para ServiceDesk
* **Entorno:** Vozitel (`apps7v20.vozitel.com`)
* **Descripción:** Inyecta un botón flotante arrastrable (`📋 Copiar para ServiceDesk`) en la vista de registros tras pulsar "Responder a todos":
  * Extrae e incrusta imágenes en Base64 incluso si están alojadas dentro de iframes anidados.
  * Normaliza y sanea las cabeceras de *Remitente* y *Destinatario* para adaptarlas a la sintaxis esperada por ServiceDesk Plus (`Remitente: Nombre <email>`).
  * Repara referencias de imágenes rotas y copia el contenido enriquecido (`text/html` y texto plano) al portapapeles.

---

## ⚙️ Configuración del Técnico

El script de ServiceDesk utiliza una configuración compartida para todas sus funciones automáticas:

* **Primera ejecución:** Al abrir un formulario por primera vez, el navegador solicitará tu nombre de técnico mediante una ventana emergente.
* **Persistencia:** Se guarda en el `localStorage` del dominio, por lo que **no se borra ni se sobreescribe al actualizar el script**.
* **Modificar técnico:** Puedes cambiar tu nombre en cualquier momento pulsando en el icono de **Tampermonkey** mientras estás en ServiceDesk y seleccionando:
  `✏️ Configurar nombre de Técnico`.

---

## 🔄 Actualizaciones Automáticas

Ambos scripts incluyen directivas `@updateURL` y `@downloadURL` sincronizadas con este repositorio. Cuando se publique una nueva versión con el incremento del tag `@version`, Tampermonkey actualizará las extensiones en segundo plano en los equipos de los técnicos.

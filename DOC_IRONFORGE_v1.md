# 🛠️ DOC_IRONFORGE_v1
## Documento Maestro de Arquitectura y Conocimiento

**Estado:** Fase Dogfooding (Pruebas en Producción)  
**Rol:** Lead Software Architect & Technical Writer  

---

## 1. Resumen del Proyecto

**IronForge** es una aplicación web progresiva (PWA) de alto rendimiento orientada al seguimiento, gestión de entrenamientos y nutrición (integración con FatSecret). Su objetivo principal es ofrecer una experiencia de usuario que se sienta 100% nativa ("Native Feel"), combinando un diseño impecable, animaciones fluidas y capacidades de inteligencia artificial para potenciar el rendimiento físico de los usuarios.

---

## 2. Stack Tecnológico (El Arsenal)

Hemos construido IronForge sobre una base moderna y escalable. A continuación, el detalle del arsenal tecnológico empleado:

*   **React 19:** El núcleo de nuestra interfaz. Aprovechamos las últimas características para una renderización rápida y eficiente.
*   **Vite 8:** Nuestro motor de construcción. Proporciona tiempos de inicio instantáneos y un Hot Module Replacement (HMR) ultrarrápido.
*   **Tailwind CSS 4.3:** Framework de utilidades CSS para un estilado ágil, manteniendo un diseño coherente, moderno y con un "Dark Mode" de primera clase.
*   **Supabase:** Nuestro Backend-as-a-Service (BaaS). Lo utilizamos para gestionar la base de datos relacional (PostgreSQL) y la autenticación de usuarios en tiempo real.
*   **Groq SDK (IA):** Motor de inferencia ultrarrápido para potenciar las funcionalidades inteligentes de la aplicación (ej. análisis de rutinas, sugerencias de entrenamiento).
*   **Vite-Plugin-PWA:** La clave para convertir nuestra web app en una aplicación instalable y disponible offline.
*   **Recharts:** Biblioteca de gráficos componibles para visualizar el progreso de los entrenamientos y métricas de rendimiento.
*   **Framer Motion & Auto-Animate:** Librerías para implementar micro-animaciones y transiciones fluidas, elevando la percepción de calidad ("Premium Feel").
*   **Lucide React:** Sistema de iconografía moderno y coherente.
*   **FatSecret API:** Integración externa (mediante proxy en desarrollo) para el registro y consulta de datos nutricionales.

---

## 3. Arquitectura de la PWA ("Native Feel")

Para lograr que IronForge se sienta como una aplicación nativa instalada desde una tienda de aplicaciones, implementamos la siguiente arquitectura:

*   **Configuración del Manifiesto:** Definimos un `manifest` estricto en `vite.config.js` con `display: 'standalone'`, forzando a que la app se abra en su propia ventana sin la interfaz del navegador. Los colores de tema y fondo se fijaron en `#09090b` para mantener la inmersión visual.
*   **Superando el Límite de Workbox:** Por defecto, Workbox excluye del caché archivos grandes, lo que rompía la experiencia offline. Lo solucionamos aumentando el límite de tamaño a 5MB mediante `workbox: { maximumFileSizeToCacheInBytes: 5000000 }` en la configuración del plugin PWA.
*   **Actualizaciones Automáticas:** Configuramos `registerType: 'autoUpdate'` para que los usuarios siempre reciban la última versión de IronForge en segundo plano sin interrupciones molestas.
*   **Botón de Instalación Nativo:** Implementamos lógica en la interfaz para capturar el evento `beforeinstallprompt` y ofrecer una experiencia de instalación (A2HS - Add to Home Screen) personalizada y no intrusiva.

---

## 4. Problemas Resueltos (Postmortem)

Durante el desarrollo, ganamos varias "batallas" técnicas cruciales que deben quedar documentadas para futuros proyectos:

1.  **El Conflicto del Certificado SSL y la PWA:**
    *   *Problema:* El uso del plugin `@vitejs/plugin-basic-ssl` en desarrollo generaba conflictos intermitentes con el registro del Service Worker de la PWA, causando fallos en las pruebas locales de offline y caché.
    *   *Solución:* Se ajustó la configuración de desarrollo y se aisló el testing de la PWA en entornos de preview limpios, deshabilitando el SSL básico donde no era estrictamente necesario para el HMR.
2.  **Error 404 en Vercel (React Router):**
    *   *Problema:* Al recargar la página en cualquier ruta distinta a la raíz (ej. `/dashboard`), Vercel devolvía un error 404 porque buscaba un archivo físico que no existía, ya que React Router maneja el ruteo del lado del cliente (SPA).
    *   *Solución:* Creamos el archivo `vercel.json` en la raíz del proyecto con una regla de reescritura (`rewrites`) que redirige todo el tráfico `/([^.]+)` o `/(.*)` hacia `/index.html`.
3.  **CORS y API de FatSecret en Desarrollo:**
    *   *Problema:* Bloqueos de CORS al intentar consumir la API REST de FatSecret directamente desde el frontend durante el desarrollo local.
    *   *Solución:* Implementamos un proxy en el `server` de `vite.config.js` (rutas `/fatsecret-auth` y `/fatsecret-api`) para enmascarar las peticiones y evitar restricciones del navegador, reescribiendo el origen dinámicamente.

---

## 5. Gestión de Despliegue

IronForge utiliza un pipeline de despliegue continuo configurado hacia **Vercel**, optimizado para aplicaciones SPA y PWA.

**Pipeline de Vercel:**
*   **Framework Preset:** Vite
*   **Build Command:** `npm run build`
*   **Output Directory:** `dist`
*   **Routing:** Gestionado de forma segura mediante `vercel.json`.

**Variables de Entorno (Environment Variables):**
El entorno de producción depende de la configuración segura de las siguientes claves (los valores están omitidos por seguridad):

*   `VITE_SUPABASE_URL`: Endpoint del proyecto en Supabase.
*   `VITE_SUPABASE_ANON_KEY`: Clave pública para peticiones anónimas a la base de datos.
*   *(Otras variables esperadas para integraciones de IA y Nutrición):*
    *   Variables relacionadas con Groq SDK (ej. `VITE_GROQ_API_KEY`).
    *   Credenciales de OAuth de FatSecret.

---
*Este documento queda registrado como la base de conocimiento arquitectónico de IronForge v1. Preparado para la iteración post-dogfooding.*

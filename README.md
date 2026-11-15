# MI ACTUALIDAD

Periódico digital estático en español, diseñado primero para iPhone y preparado para GitHub Pages.

## Estado actual

Esta primera versión implementa la navegación por seis secciones, portada con cinco posiciones editoriales, filtros locales por país, modo claro/oscuro, exportación e importación validada de preferencias, PWA básica, datos JSON versionados, pruebas y workflows de validación/despliegue. El contenido incluido está marcado como **datos de demostración** y no debe presentarse como noticias reales.

La recopilación RSS/Atom, el contraste, la traducción y los resúmenes con IA quedan preparados como siguiente fase. No se han añadido claves, proveedores de pago ni conexiones externas.

## Desarrollo local

Requiere Node.js 22 o superior.

```bash
npm install
npm run check
npm run dev
```

## GitHub Pages

En el repositorio, activar Pages mediante GitHub Actions. El workflow `deploy.yml` compila con Vite y publica `dist`; `vite.config.ts` usa `base: './'` para funcionar bajo el subdirectorio del repositorio.

## Edición y seguridad

`generate.yml` tiene ejecución diaria a las 07:00 UTC, equivalente a las 08:00 en Madrid durante el horario de invierno, pero GitHub puede retrasar los cron. Para respetar el cambio horario deberá parametrizarse o ejecutarse con margen y publicar la hora real de edición. La generación real solo debe añadirse con secretos en GitHub Actions, permisos mínimos, límites de coste y validación de JSON. Nunca se pondrán tokens en el navegador.

## Decisiones que requieren autorización

1. Licencia del repositorio.
2. Proveedor de IA y presupuesto máximo diario/mensual.
3. Fuentes concretas y sus permisos de reutilización de metadatos e imágenes.
4. Política de conservación de ediciones (la especificación propone 30 días, pero no se aplica todavía).
5. Reautenticación de GitHub CLI y creación del repositorio público `mi-actualidad`.


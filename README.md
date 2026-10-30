# J&D GYM — Primera versión demostrativa

## Qué incluye
- Login para usuarios y acceso administrativo de demostración.
- Registro en tres pasos: datos básicos, consentimientos y normas, salud e IMC.
- Cálculo inicial de IMC a partir de peso y estatura.
- Panel del usuario con perfil, objetivos, consentimientos y actualización de medidas.
- Panel administrativo con listado de inscritos.
- Exportación CSV compatible con Microsoft Excel.

## Cómo probarlo
1. Descomprime la carpeta.
2. Abre una terminal dentro de `jd_gym_app_v1`.
3. Ejecuta un servidor local, por ejemplo:
   - Python: `python -m http.server 5500`
   - O usa la extensión Live Server de Visual Studio Code.
4. Abre `http://localhost:5500`.

No se recomienda abrir el HTML directamente con `file://`, porque el navegador puede bloquear funciones de seguridad.

## Acceso administrador de prueba
- Correo: `admin@jdgym.com`
- Contraseña: `Admin123*`

## Importante: alcance de esta versión
Esta es una demostración frontend. Los registros se almacenan en `localStorage` del navegador y no se sincronizan entre computadores o celulares. La exportación genera un CSV con separador de punto y coma y codificación UTF-8, que puede abrirse en Excel.

Para operar con clientes reales se debe implementar backend, base de datos central, autenticación segura, roles y permisos, copias de seguridad y controles de privacidad. La información de salud es sensible: no utilizar esta versión para almacenar datos reales.

Los textos de consentimiento y normas son una base de prototipo elaborada a partir de los formatos suministrados. Deben revisarse jurídicamente y ajustarse a las políticas reales del gimnasio antes de su uso.

## Archivos
- `index.html`: estructura principal.
- `css/styles.css`: diseño responsive.
- `js/app.js`: registro, login, IMC, paneles y exportación CSV.
- `assets/logo.svg`: icono temporal.

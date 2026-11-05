# Boda Raúl & Judy

Web estática de nuestra boda, desplegada con GitHub Pages.

- `index.html` — contenido
- `styles.css` — estilos
- `script.js` — cuenta atrás (la fecha sale del atributo `datetime` de `#wedding-date`)

Para verla en local basta con abrir `index.html` en el navegador.

## Fotos

Las fotos de la web están en `img/`, reducidas a 1800 px como máximo y sin metadatos
(se quita la ubicación GPS). Los originales se quedan en la raíz y no se suben (ver `.gitignore`).

## Luna de miel

`luna-de-miel.html` pide una contraseña y descifra en el navegador `luna-de-miel.enc`
(AES-256 con la contraseña; `luna.js` lo descifra). El itinerario sin cifrar y las herramientas
están en `_privado/`, que **no se sube** al repositorio.

Para cambiar el itinerario: editar `_privado/generar-luna.py` y ejecutar
`sh _privado/cifrar-luna.sh` (pide la contraseña), y subir el nuevo `luna-de-miel.enc`.

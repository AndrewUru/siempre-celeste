# Cancionero de Siempre Celeste

Web de ensayo de la murga. Permite buscar canciones por título o letra, consultar las fichas y escuchar grabaciones por cuerda. [Abrir el cancionero](https://siempre-celeste.vercel.app/)

## Cómo tramitar un alta

El repertorio publicado es de consulta pública. El botón **Solicitar alta** sirve para recibir peticiones por correo. La web no tiene cuentas de participantes, lista de miembros ni panel para aprobarlos.

1. El participante abre **Solicitar alta**, escribe el correo que quiere usar y pulsa **Preparar correo**. [Abrir el formulario](https://siempre-celeste.vercel.app/alta/)
2. Se abre su aplicación de correo con un borrador. Tiene que pulsar **Enviar** allí. Si no se abre, puede escribir directamente a **atobio459@gmail.com**.
3. En ese buzón, busca el asunto **Solicitud de alta en Siempre Celeste**. Revisa la dirección indicada en el cuerpo del mensaje, que puede ser distinta de la del remitente.
4. Si aceptas la solicitud y el participante necesita una grabación restringida, abre en Google Drive el archivo o la carpeta que corresponda, pulsa **Compartir**, añade la dirección indicada y elige **Lector**. Limita el acceso al material que le corresponda.
5. Responde al participante con el enlace al cancionero. Si le has compartido material de Drive, pídele que abra una pista con la cuenta autorizada para comprobar el acceso.

El correo deja constancia de la solicitud en el buzón. La web no guarda la dirección ni concede permisos de edición. Para cambiar el buzón receptor, actualiza el destinatario del formulario y el enlace alternativo en [alta.astro](src/pages/alta.astro) y publica el cambio.

## Cómo está construida

| Pieza | Dónde está | Qué hace |
| --- | --- | --- |
| Interfaz | [src/pages](src/pages) y [src/Layout.astro](src/Layout.astro) | Astro genera la portada, una ficha por canción, la guía y el formulario de alta. El menú se comparte entre páginas. |
| Repertorio | [src/data/songs.json](src/data/songs.json) | Guarda títulos, letras, identificadores de URL y referencias a las grabaciones. |
| Material de ensayo | [public](public) y enlaces a Drive en el repertorio | Los archivos publicados con la web se sirven directamente. Los enlaces a Drive respetan los permisos de cada archivo. |
| Backend de edición | [worker](worker), [db](db) y [drizzle](drizzle) | El proyecto incluye un Worker para leer y guardar canciones en Cloudflare D1. Para guardar requiere identidad del alojamiento. |
| Web en producción | [Proyecto en Vercel](https://vercel.com/andrewurus-projects/siempre-celeste) | El despliegue estático sirve las páginas y el catálogo de consulta. El Worker y D1 no están activos en este despliegue. |

## Trabajar en local

Desde la raíz del repositorio, con Node.js y npm instalados:

```sh
npm ci
npm run dev
```

Abre la dirección que indique Astro en la terminal. Para compilar y probar también el Worker y la base de datos local:

```sh
npm run build
npm run db:local
npm run preview
```

## Cómo publicar un cambio de repertorio

1. Edita [songs.json](src/data/songs.json). Conserva el identificador `slug` de las fichas existentes para que sus enlaces sigan funcionando.
2. Ejecuta `npm run build`. Astro genera las páginas en `dist/client`. El proceso también prepara el Worker en `dist/server`.
3. Guarda los cambios en Git y súbelos a la rama `main`. Vercel compila el repositorio conectado usando [vercel.json](vercel.json), genera los JSON de consulta y publica el contenido de `dist/client`.
4. Cuando termine el despliegue, comprueba la portada, una ficha modificada y el formulario de alta en la URL pública.

# PauseUs

## Subir el proyecto a Expo (EAS)

### 1. Cuenta y herramienta

1. Crea una cuenta en [expo.dev](https://expo.dev) (o inicia sesión).
2. En la carpeta del proyecto, instala la CLI solo cuando la uses (recomendado):

   ```bash
   npx eas-cli login
   ```

### 2. Vincular el proyecto con Expo

La primera vez ejecuta:

```bash
npm run eas:init
```

o:

```bash
npx eas-cli init
```

Esto crea el proyecto en tu cuenta de Expo y, si hace falta, añade `extra.eas.projectId` en `app.json`.

### 3. Variables de entorno (Supabase)

En **Expo Dashboard** → tu proyecto → **Secrets** (o en el build), define:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

O usa un archivo `.env` local (no lo subas a git si tiene secretos) que Expo cargue al hacer build.

### 4. Generar un build (APK de prueba en Android)

```bash
npm run eas:build:android
```

Perfil `preview` en `eas.json`: genera **APK** para instalar sin Play Store.

### 5. iOS

Necesitas **cuenta de Apple Developer** y configurar certificados (EAS puede ayudarte en el primer build):

```bash
npm run eas:build:ios
```

### 6. Publicar en tiendas (opcional)

Tras un build de producción:

```bash
npx eas-cli submit --platform android
npx eas-cli submit --platform ios
```

### Notas

- **Nombre y slug**: en `app.json` están `PauseUs` y `pauseus`. Si el slug ya está ocupado en Expo, cámbialo.
- **IDs de app**: `com.pauseus.app` en iOS/Android. Cámbialos si ya usas otro identificador en las tiendas.

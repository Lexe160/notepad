# 📒 NotaPareja

> Tu bloc de notas compartido en tiempo real

## ¿Qué es esto?

Una aplicación web elegante para escribir notas rápidas y compartirlas en tiempo real con tu pareja. Ambos ven los cambios al instante, sin necesidad de crear cuentas.

---

## 🚀 Cómo usarlo

### 1. Configurar Firebase (una sola vez)

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Haz clic en **"Agregar proyecto"** → elige un nombre → crea el proyecto
3. En el panel lateral ve a **Compilación → Realtime Database** → **Crear base de datos**
   - Selecciona la región más cercana (ej: `us-central1`)
   - Elige **"Iniciar en modo de prueba"** → Habilitar
4. Vuelve al panel principal → haz clic en el ícono `</>` (Web app) → registra la app
5. Copia el objeto `firebaseConfig` que aparece (se ve así):

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "tu-proyecto.firebaseapp.com",
  databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456",
  appId: "1:123456:web:abc123"
};
```

### 2. Abrir la app

1. Abre el archivo `index.html` en tu navegador (o despliégala en GitHub Pages / Netlify para acceso online)
2. Al abrirse, haz clic en **⚙️** para ingresar tu configuración de Firebase
3. Pega el objeto `firebaseConfig` y guarda

### 3. Crear o unirse a una sala

- Haz clic en **"✨ Crear nueva sala"** → se genera un código de 6 letras
- Comparte ese código con tu pareja
- Tu pareja ingresa el código en **"Unirme"** y ya están conectados

---

## ✨ Funciones

| Función | Descripción |
|---|---|
| ⚡ Tiempo real | Los cambios se sincronizan instantáneamente |
| 📝 Múltiples notas | Crea tantas notas como quieras |
| 🎨 Formato básico | Negrita, cursiva, subrayado, listas, citas |
| 🔗 Compartir sala | Botón para copiar código o enlace directo |
| 💾 Auto-guardado | Se guarda automáticamente mientras escribes |
| 📱 Responsive | Funciona en móvil y escritorio |

---

## 🌐 Desplegar online (opcional)

Para que ambos puedan acceder desde cualquier lugar sin abrir el archivo local:

### GitHub Pages (gratis)
1. Sube la carpeta `notepad/` a un repositorio de GitHub
2. Ve a **Settings → Pages → Source** → elige `main` branch
3. Tu app estará en `https://tu-usuario.github.io/notepad/`

### Netlify (gratis, más fácil)
1. Ve a [netlify.com](https://netlify.com) → "Add new site" → "Deploy manually"
2. Arrastra la carpeta `notepad/` → ¡listo!

---

## ⚠️ Nota sobre Firebase gratis

El plan gratuito de Firebase (Spark) incluye:
- **1 GB** de datos almacenados
- **10 GB** de transferencia al mes
- **100,000** conexiones simultáneas

Más que suficiente para uso personal entre dos personas.

---

*Hecho con 💜 — NotaPareja*

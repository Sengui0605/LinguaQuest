# LinguaQuest 🌎

LinguaQuest es una plataforma educativa completa, de código abierto, para aprender inglés. Inspirado en Duolingo y construido completamente desde cero usando Vanilla JavaScript, HTML5 y CSS3, permitiendo un rendimiento ultrarrápido sin dependencias pesadas de frameworks.

Cuenta con contenido para más de 1 año de aprendizaje continuo, ofreciendo 50 cursos repartidos en 3 niveles de dificultad (Básico, Intermedio y Avanzado), abarcando más de 1,500 preguntas interactivas.

## Características Principales 🚀
- **🔥 Gamificación Completa**: Sistema de XP, Niveles de jugador con títulos, Rachas Diarias y Vidas.
- **📚 1 Año de Contenido**: 50 Cursos desde "Verbo To Be" hasta "Phrasal Verbs Avanzados".
- **🏆 Logros**: Más de 20 logros desbloqueables al cumplir ciertos retos educativos.
- **🌐 Dual-Mode**: Funciona 100% Offline e independiente. Se puede usar tanto en Navegador como App de Escritorio.
- **💻 Multiusuario en PC**: Al instalarse usando Electron, el sistema guarda el progreso por sesión de cuenta en la computadora, garantizando que cada usuario en la misma PC tenga su propio progreso separado.
- **📱 Responsive UI**: Interfaz gráfica ultra moderna que se adapta perfectamente tanto a celulares, tablets y escritorios.

---

## 🛠 Instalación y Configuración

LinguaQuest está construido pensando en Linux (como Linux Mint), pero incluye soporte para empaquetarse en múltiples plataformas: Linux (.deb, .AppImage), Windows (.exe) y macOS (.dmg).

### Requisitos previos
- Necesitas tener **Node.js** y **npm** instalados.
  En Linux Mint/Ubuntu:
  ```bash
  sudo apt update
  sudo apt install nodejs npm
  ```

### Clonar o descargar el proyecto
Ubicado en la carpeta `/home/senjiro/Plantillas/LinguaQuest`

### Instalar dependencias
Abre una terminal en la carpeta principal de la aplicación y ejecuta:
```bash
npm install
```

---

## 🖥 Uso y Desarrollo

### Ejecutar como Aplicación Web Local
Si deseas probar el estilo navegador web, puedes usar un servidor http local rápido:
```bash
npx serve .
# o con Python:
python3 -m http.server 8080
```
Luego entra en tu navegador a: http://localhost:8080 (o el puerto indicado)

### Ejecutar como Aplicación de Escritorio (Electron - Pruebas)
Para ejecutar y probar la aplicación de escritorio nativa, ejecuta:
```bash
npm start
```
*Nota: Si ejecutas la aplicación con Electron, el progreso se guardará de forma única por cada sesión de usuario en el sistema operativo mediante `app.getPath('userData')` de Electron.*

---

## 📦 Empaquetar y Distribuir

Hemos configurado `electron-builder` en el `package.json` para que el empaquetado sea fácil.

### 1. Construir las versiones Linux (.deb y .AppImage)
```bash
npm run build:linux
```
Estos instaladores se crearán en la carpeta `dist/`.

### 2. Construir la versión Windows (.exe)
Desde Linux puedes compilar para Windows instalando `wine` primero. Luego ejecuta:
```bash
npm run build:win
```

### 3. Construir la versión Mac (.dmg)
Mismo caso, puedes generarla usando:
```bash
npm run build:mac
```

---

## ☁️ Subir directo a Firebase Hosting

El proyecto ya cuenta con el archivo de configuración `firebase.json`.

1. Instala Firebase Tools si no lo tienes:
```bash
npm install -g firebase-tools
```
2. Inicia sesión en tu cuenta de Firebase:
```bash
firebase login
```
3. Inicializa/despliega:
```bash
firebase deploy
```

---

## 👨‍💻 Estructura de código
- `/index.html`: Base del DOM y UI.
- `/styles/`: Estilos modernos separados por componentes.
- `/data/`: Archivos JSON con la estructura de cursos, logros, ranking, etc.
- `/js/`:
  - `app.js` maneja la interfaz y la navegación fluida.
  - `progress.js` gestiona el **Dual Storage** (localStorage en la Web y IPC fileStorage en modo App de PC).
  - `questions.js` (+ _extra files_) posee toda la lógica y 1500+ preguntas.
  - `quizEngine.js` el núcleo del juego educativo interactivo.
- `/electron/`: Contiene `main.js` y `preload.js` responsables por la seguridad bridge y el guardado de perfiles aislado en disco.

# 🐳 FILEBASE 2.0 NASH - Guía de Instalación en Ugreen NAS

Esta guía te ayudará a desplegar tu propia versión soberana de FileHub en tu NAS Ugreen utilizando Docker.

## Prerrequisitos

1.  **NAS Ugreen** con UGOS Pro.
2.  **Docker** instalado y funcionando en el NAS.
3.  Acceso a la terminal del NAS (SSH) o capacidad de usar la UI de Docker para "Componer" (Projects).

## Pasos de Instalación

### 1. Preparar las Carpetas en el NAS

Crea las carpetas necesarias en tu NAS para guardar los datos de forma persistente. Usando el administrador de archivos de UGOS o la terminal:

```bash
mkdir -p /volume1/docker/filebase_nash/data
mkdir -p /volume1/docker/filebase_nash/uploads
```

### 2. Transferir Archivos

Sube los archivos de este proyecto a una carpeta en tu NAS (por ejemplo `/volume1/docker/filebase_nash/source`) o simplemente asegúrate de tener el `Dockerfile` y `docker-compose.yml` disponibles.

### 3. Despliegue con Docker Compose

Si usas la **Interfaz Gráfica (UI)** de Docker en UGOS:
1.  Ve a la sección "Projects" (o "Docker Compose").
2.  Crea un nuevo proyecto.
3.  Pega el contenido del archivo `docker-compose.yml`.
4.  Asegúrate de que las rutas en `volumes` coincidan con las carpetas que creaste en el paso 1.
5.  Dale a "Deploy" o "Build & Start".

Si usas **Terminal (SSH)**:
Navega a la carpeta donde está el código fuente y ejecuta:

```bash
docker-compose up -d --build
```

### 4. Acceso

Una vez el contenedor esté corriendo, podrás acceder a tu aplicación desde cualquier dispositivo en tu red local:

**URL:** `http://<IP-DE-TU-NAS>:8080`

### 5. Configuración de Seguridad

En el archivo `docker-compose.yml`, cambia la variable de entorno `JWT_SECRET` por una contraseña segura y larga para proteger las sesiones de usuario.

```yaml
environment:
  - JWT_SECRET=tu-secreto-super-seguro-y-largo
```

## Copias de Seguridad

Para hacer un backup completo de tu "Nube Privada", solo necesitas hacer backup de la carpeta:
`/volume1/docker/filebase_nash/data`

El archivo `database.sqlite` dentro de esa carpeta contiene **TODA** tu base de datos (tareas, gastos, usuarios, etc.).

---
**¡Disfruta de tu soberanía de datos con FILEBASE 2.0 NASH!** 🚀

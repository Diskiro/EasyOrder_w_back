# EasyOrder Restaurante OS

EasyOrder es un sistema operativo integral para restaurantes diseñado para gestionar el menú, controlar órdenes, monitorear el mapa de mesas en tiempo real y llevar el control de caja.

Esta versión ha sido completamente decoplada de Supabase y opera bajo una arquitectura autosuficiente con un backend de Node.js, Frontend en React (Vite) y base de datos PostgreSQL.

## 🚀 Inicio Rápido con Docker

La forma más fácil y recomendada de levantar todo el sistema (Frontend, Backend, Base de Datos y Adminer) es utilizando Docker Compose.

### Pre-requisitos
Asegúrate de tener instalados:
* [Docker](https://docs.docker.com/get-docker/)
* [Docker Compose](https://docs.docker.com/compose/install/)
* Git

### Pasos para iniciar el proyecto

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Diskiro/EasyOrder_con_back.git
   cd EasyOrder_con_back
   ```

2. **Levantar los servicios:**
   Ejecuta el siguiente comando en la raíz del proyecto para construir las imágenes y levantar los contenedores:
   ```bash
   docker-compose up --build -d
   ```
   *El flag `-d` arranca los contenedores en segundo plano (detached mode).*

3. **¡Listo! Accede a la aplicación:**
   Una vez que los contenedores estén corriendo, los servicios estarán disponibles en los siguientes puertos locales:

   * 👩‍💻 **Frontend (Aplicación EasyOrder):** [http://localhost](http://localhost) (o puerto 80)
   * ⚙️ **Backend API:** [http://localhost:3000](http://localhost:3000)
   * 🗄️ **Base de Datos (PostgreSQL):** `localhost:5432`
   * 🛠️ **Adminer (Gestor de BD Gráfico):** [http://localhost:8080](http://localhost:8080)

## 🔑 Credenciales por Defecto

Para tu primera sesión, una vez que el sistema inicialice la base de datos (mediante `init_db.sql`), podrás acceder con la cuenta de administrador:

* **Email:** `admin@easyorder.com`
* **Contraseña:** `admin123`

## 🏗️ Arquitectura del Proyecto

El repositorio está dividido en tres componentes principales:

* `/frontend`: Aplicación SPA en React construida con Vite, Material UI y TailwindCSS. Gestor de estado con `@tanstack/react-query`. Comunicación en tiempo real con `socket.io-client`.
* `/backend`: API RESTful construida en Node.js y Express. Manejo de autenticación con JWT y `bcryptjs`. Almacenamiento seguro, enrutador modular y servidor de WebSockets (`socket.io`) para actualizaciones en vivo de órdenes y mesas.
* `/db` & `docker-compose.yml`: Configuración de infraestructura. El archivo `init_db.sql` se ejecuta automáticamente al levantar el contenedor de Postgres por primera vez para asegurar que la estructura esté lista de inmediato.

## 🛑 Detener el sistema

Si deseas detener la aplicación sin borrar los datos guardados:
```bash
docker-compose stop
```

Para detener los contenedores y destruirlos (asegurando una recreación limpia si lo necesitas, *ojo: los datos de la base de datos están bajo un volumen persistente*):
```bash
docker-compose down
```

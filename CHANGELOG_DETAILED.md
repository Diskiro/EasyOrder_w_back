# Guía Técnica: Replicación de Mejoras (Tickets, Seguridad y SRP)

Esta guía está diseñada para que un desarrollador Jr. pueda entender y replicar los cambios realizados en el sistema de gestión de mesas y órdenes.

---

## 🏗️ Fase 1: Sistema de Tickets Térmicos y QR

El objetivo es permitir que cualquier usuario con acceso a las órdenes pueda imprimir un ticket físico optimizado y acceder a uno digital vía QR.

### 1. Dependencias Necesarias
Instala las librerías para impresión y generación de QR:
```bash
npm install react-to-print react-qr-code
```

### 2. El Recibo (`src/components/tables/TicketReceipt.tsx`)
Este componente usa `React.forwardRef` porque `react-to-print` necesita una referencia direta al DOM para saber qué imprimir.
- **Tip**: Usa `font-mono` y un ancho fijo (ej. `300px`) para simular el papel térmico de 80mm.
- **QR**: El valor del QR debe ser la URL absoluta del recibo (usa `window.location.origin`).

### 3. El Botón de Acción (`src/components/tables/PrintTicketAction.tsx`)
Encapsula el hook `useReactToPrint`. 
- **Lógica**: Mantén el `TicketReceipt` oculto con `display: none` en la UI normal, pero deja que el hook lo encuentre mediante la `ref`.

---

## 🛡️ Fase 2: Seguridad y Restricciones de Usuario

Queremos que los meseros puedan añadir productos, pero **no borrar** productos que ya fueron guardados anteriormente por seguridad.

### 1. Extender el Tipo `CartItem`
En `src/components/tables/OrderCart.tsx` (o donde definas tu interfaz), añade el campo `originalQuantity`:
```typescript
export interface CartItem extends Product {
    cartItemId: string | number;
    quantity: number;
    originalQuantity?: number; // <--- Nuevo campo
    notes?: string;
    is_ready?: boolean;
}
```

### 2. Lógica de Sincronización
Cuando cargues una orden existente de la base de datos, asigna el valor de la cantidad actual a `originalQuantity`. Esto nos servirá de "ancla" para saber cuál es el mínimo permitido.

### 3. El "Guardia" en la UI
En el botón de "Menos" del carrito:
```tsx
const isExisting = typeof item.cartItemId === 'number';
const minQty = (isExisting && role !== 'admin') ? (item.originalQuantity || 0) : 0;
// Deshabilita el botón si quantity <= minQty
```

---

## 🧩 Fase 3: Refactorización SRP (TablesView)

`TablesView.tsx` medía más de 400 líneas. Aplicamos el **Principio de Responsabilidad Única (SRP)** para dividirlo.

### 1. El Hook `src/hooks/useTableOrder.ts` (Cerebro)
Mueve **toda** la lógica de:
- Estado del carrito (`cart`).
- Funciones `addToOrder`, `updateQuantity`, `submitOrder`.
- Mutaciones de Supabase.
**Por qué?** Para que la vista solo se encargue de mostrar botones y el hook de procesar datos. Es más fácil de testear.

### 2. Componentes Modulares
Divide la interfaz en piezas lógicas en `src/components/tables/`:
- `TablesHeader.tsx`: Solo el buscador y botones de vista.
- `TableOrderView.tsx`: Todo el diseño de la mesa seleccionada (menú y carrito).
- `ReservationAssignBanner.tsx`: El banner azul de asignación.

---

## 🧪 Fase 4: Pruebas Unitarias (Vitest)

Para asegurar que un cambio no rompa lo anterior:
1. Crea archivos `.test.tsx` junto a tus componentes.
2. Usa `render` de `@testing-library/react`.
3. Simula clics con `fireEvent.click`.
4. **Prueba Crítica**: Verifica que si un mesero intenta bajar la cantidad de un producto existente, el estado del carrito **no cambie**.

### Ejecutar los tests:
```bash
npx vitest run
```

---
**Recuerda**: Mantén tus componentes pequeños (menos de 150 líneas si es posible) y usa siempre TypeScript para atrapar errores de tipos antes de que lleguen a producción.

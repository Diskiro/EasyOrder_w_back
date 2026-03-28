# Guía Técnica: Reimplementación de Mejoras en Monitor de Cocina y Carrito

Este documento es una guía técnica dirigida a desarrolladores para la reimplementación o mantenimiento de las funcionalidades críticas implementadas en el sistema **EasyOrder**.

## 1. Patrón de UX Optimista (Optimistic UI)
Para lograr una respuesta instantánea en el monitor de cocina (donde la latencia de red es crítica), se utilizó el patrón de mutaciones optimistas de `@tanstack/react-query`.

### Reglas de Implementación
*   **[onMutate](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/hooks/useOrders.ts#135-146)**: Al disparar la acción (ej. marcar plato listo), se debe:
    1. Cancelar cualquier query activa de `'orders'` para evitar sobreescritura.
    2. Guardar el estado previo (snapshot).
    3. Actualizar manualmente el caché (`queryClient.setQueryData`) asumiendo éxito.
*   **[onError](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/hooks/useOrders.ts#314-319)**: Si la base de datos falla, se debe restaurar el snapshot guardado en [onMutate](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/hooks/useOrders.ts#135-146).
*   **[onSettled](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/hooks/useOrders.ts#319-323)**: Independientemente del resultado, invalidar la query (`invalidateQueries`) para sincronizarse con los datos reales del servidor.

**Ubicación clave**: [src/hooks/useOrders.ts](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/hooks/useOrders.ts) ([useUpdateOrderStatus](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/hooks/useOrders.ts#75-157) y [useUpdateOrderItemReady](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/hooks/useOrders.ts#259-325)).

## 2. Gestión de Identidad en Carrito (`cartItemId`)
El sistema original agrupaba productos usando `product_id`. Esto impedía separar pedidos nuevos de entregados.

### Nueva Arquitectura
*   **Frontend**: Cada objeto [CartItem](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/components/tables/OrderCart.tsx#9-15) ahora requiere una propiedad `cartItemId: string | number`.
*   **Generación de IDs**: 
    1. Para productos nuevos: Generar un ID temporal único (ej: `new-timestamp-random`).
    2. Para productos que ya existen en la DB: Usar su ID real de la tabla `order_items`.
*   **Lógica de Adición**: Al añadir un producto al carrito, SOLO se debe buscar por `product_id` **donde `is_ready` sea falso**. Si todos los productos iguales ya están listos, se debe insertar un NUEVO ítem con un nuevo `cartItemId`.

**Componentes Críticos**: [src/components/tables/OrderCart.tsx](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/components/tables/OrderCart.tsx) y [src/pages/TablesView.tsx](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/pages/TablesView.tsx).

## 3. Backend: Procesamiento de Órdenes ([useUpdateOrderItems](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/hooks/useOrders.ts#158-258))
La mutación para actualizar órdenes fue rediseñada para ser quirúrgica y evitar duplicados o borrados accidentales.

*   **Identificación de Borrados**: Comparar los IDs existentes en la DB contra los `cartItemId` numéricos recibidos. Cualquier ID en la DB que no esté en la lista recibida debe ser ELIMINADO.
*   **UPSERT Lógico**: 
    - Si el `cartItemId` es numérico: Se realiza un `UPDATE` en `order_items`.
    - Si el `cartItemId` es string (es nuevo): Se realiza un `INSERT`.
*   **Reseteo de Estado**: Si la cantidad de un ítem existente aumenta, se debe forzar `is_ready = false` para avisar a cocina.

## 4. Sincronización Realtime (Supabase Channels)
El monitor de cocina depende de que los datos fluyan sin refrescar. 

*   **Implementación**: Usar `useEffect` dentro de los hooks [useActiveOrders](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/hooks/useOrders.ts#29-74) y [useTables](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/hooks/useTables.ts#13-44) para suscribirse a los cambios de Postgres.
*   **Filtro de Invalidación**: Invalida solo la query específica (`['orders', 'active']`) para evitar tráfico innecesario.
*   **Ubicación**: [src/hooks/useOrders.ts](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/hooks/useOrders.ts) y [src/hooks/useTables.ts](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/hooks/useTables.ts).

## 5. Seguridad de Base de Datos (RLS)
Para que el rol `kitchen` funcione correctamente, las políticas de Supabase deben ser explícitas.

**Política Recomendada para `order_items`**:
```sql
CREATE POLICY "Staff can manage order items" ON public.order_items
FOR ALL TO authenticated
USING ( get_my_role() IN ('admin', 'waiter', 'kitchen') )
WITH CHECK ( get_my_role() IN ('admin', 'waiter', 'kitchen') );
```
*Nota: Sin esta política, las mutaciones optimistas en el monitor de cocina "rebotarán" y los cambios no se guardarán en la DB.*

## 6. Listado de Archivos y Responsabilidades

| Archivo | Acción | Descripción de Funcionalidad |
| :--- | :--- | :--- |
| [src/hooks/useOrders.ts](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/hooks/useOrders.ts) | **MODIFICADO** | Punto central de la lógica. Implementa *Optimistic Updates*, restaura *Realtime Subscriptions* y contiene el nuevo procesamiento de órdenes basado en `cartItemId`. |
| [src/hooks/useTables.ts](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/hooks/useTables.ts) | **MODIFICADO** | Restauración de suscripción en tiempo real para que los cambios de estado en las mesas sean instantáneos en todos los dispositivos. |
| [src/components/tables/OrderCart.tsx](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/components/tables/OrderCart.tsx) | **MODIFICADO** | Actualización de la interfaz del carrito para identificar ítems por `cartItemId`. Incluye el botón de acceso rápido "+ Para llevar". |
| [src/pages/TablesView.tsx](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/pages/TablesView.tsx) | **MODIFICADO** | Lógica de negocio del carrito. Controla cuándo agrupar productos y cuándo crear líneas separadas (evitando agrupar productos ya listos). |
| [src/pages/OrdersView.tsx](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/pages/OrdersView.tsx) | **MODIFICADO** | Mejora visual para mostrar las notas de cada producto (como "Para llevar") directamente en la tarjeta de orden activa. |
| [src/components/tables/OrderCart.test.tsx](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/components/tables/OrderCart.test.tsx) | **MODIFICADO** | Actualización de pruebas unitarias para cumplir con el nuevo contrato de datos (`cartItemId`). |
| [db/policies/fix_kitchen_order_items_rls.sql](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/db/policies/fix_kitchen_order_items_rls.sql) | **NUEVO** | Script SQL crítico para otorgar permisos de actualización al rol de cocina en la tabla `order_items`. |

## 7. Pruebas y Validación (QA)
Cualquier cambio futuro en [CartItem](file:///c:/Users/Joshu/Documents/Proyectos/EasyOrder_Supabase/src/components/tables/OrderCart.tsx#9-15) debe validarse con:
1. `npm run build`: Para asegurar que la propiedad `cartItemId` esté presente en todos los mocks.
2. `npm test`: Para asegurar que las suscripciones a los canales (`supabase.channel`) no se hayan roto.

---
**Autor**: Antigravity AI
**Fecha**: 2026-03-23

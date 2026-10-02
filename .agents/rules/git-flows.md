---
trigger: always_on
description: Regla estricta de flujo de ramas y Pull Requests
---

# Regla de Flujo Git y Despliegue

1. **PROHIBIDO hacer push directo o merge local hacia `main`**:
   - Bajo ninguna circunstancia se debe fusionar localmente a `main` ni ejecutar `git push origin main`.
2. **Uso exclusivo de ramas secundarias**:
   - Todo cambio o fix debe desarrollarse en una rama dedicada (`feature/...` o `fix/...`).
   - Se validan las pruebas locales y se sube únicamente esa rama con `git push -u origin <branch_name>`.
3. **Revisión y Merge Manual por el Usuario**:
   - Se debe entregar el enlace de GitHub para crear/revisar el PR.
   - Es obligatorio esperar a que el USUARIO apruebe y haga el Merge manualmente en GitHub antes de proceder con cualquier paso posterior.
4. **Trazabilidad y Rollback**:
   - Este flujo garantiza la trazabilidad en GitHub y la capacidad inmediata de hacer *Revert/Rollback* limpio en caso de incidencias.


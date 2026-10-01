---
trigger: always_on
description: Regla obligatoria de duplicación máxima de código y cobertura SonarCloud
---

# Regla de Calidad y No Duplicación (Quality Gate)

1. **Duplicación de Código (< 3%):** Antes de generar o proponer cualquier commit, es estrictamente obligatorio verificar que no exista código duplicado o repetitivo. El porcentaje máximo de duplicación permitido es del **3%**.
2. **Reutilización y SRP:** Si se detectan patrones repetidos de consultas SQL, handlers de rutas o validaciones, se deben extraer inmediatamente en módulos de utilidad compartidos (ej. `dbHelpers.ts`, `userValidation.ts`) respetando el Principio de Responsabilidad Única.
3. **Cobertura Mínima (>= 80%):** Todo nuevo endpoint o función debe incluir sus pruebas unitarias o de integración correspondientes para garantizar una cobertura superior al 80% antes de subir cambios.

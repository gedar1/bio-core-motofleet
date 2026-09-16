# Límite municipal de Bello

`bello-antioquia-mgn2025.geojson` contiene exclusivamente la entidad municipal de Bello, Antioquia (código DANE `05088`) usada por la política tarifaria local.

- **Fuente:** Departamento Administrativo Nacional de Estadística (DANE).
- **Conjunto:** Marco Geoestadístico Nacional (MGN) 2025, nivel municipio.
- **Uso:** determinar si los pines exactos de recogida y entrega pertenecen ambos a Bello.
- **Política:** ambos puntos dentro de Bello aplican la tarifa fija local; cualquier otro caso usa la regla exterior.

El archivo se extrajo localmente desde la descarga oficial nacional con `src/scripts/extract-bello-boundary.mjs`. No se usa la dirección escrita ni el punto de acceso vial para decidir la cobertura municipal.

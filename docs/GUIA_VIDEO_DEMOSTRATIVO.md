# Guia para video demostrativo

Duracion maxima: 10 minutos.

## 1. Presentacion del entorno

Mostrar la estructura del proyecto y explicar brevemente:

- API Node.js.
- Prometheus.
- Grafana.
- k6.

## 2. Levantar servicios

```bash
docker compose up --build -d
```

Abrir:

- API: http://localhost:3000
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

## 3. Mostrar endpoints

Probar rapidamente:

```bash
curl http://localhost:3000/
curl http://localhost:3000/slow
curl http://localhost:3000/random-error
curl http://localhost:3000/memory
curl http://localhost:3000/metrics
```

## 4. Mostrar dashboard Grafana

Entrar con `admin` / `admin` y abrir el dashboard:

`Black Friday / Operacion Black Friday - Observabilidad`

Mostrar los paneles obligatorios:

- Disponibilidad.
- CPU.
- Memoria RAM.
- Event loop lag.

## 5. Ejecutar k6

Ejecutar una prueba corta en video:

```bash
docker compose --profile tests run --rm -e SCENARIO=low k6 run -e BASE_URL=http://api:3000 -e SCENARIO=low --summary-export /results/low-summary.json /scripts/black-friday-test.js
```

Explicar que los demas escenarios se ejecutan con:

```bash
docker compose --profile tests run --rm k6 sh /scripts/run-all.sh
```

## 6. Cierre tecnico

Mencionar hallazgos principales:

- `/slow` eleva el P95 por latencia artificial.
- `/random-error` concentra fallos 500.
- `/memory` genera crecimiento sostenido de RAM.
- Las mejoras propuestas son Redis, balanceador de carga, auto scaling, correccion de fuga y circuit breakers.

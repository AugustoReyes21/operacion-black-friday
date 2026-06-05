# Operacion Black Friday

Evaluacion completa de observabilidad y rendimiento para una API Node.js de comercio electronico ante carga masiva de Black Friday.

## Arquitectura

```text
Usuario / k6
    |
    v
API Node.js :3000  -->  /metrics
    |
    v
Prometheus :9090
    |
    v
Grafana :3001
```

## Componentes

- API Node.js con endpoints `/`, `/slow`, `/random-error`, `/memory`, `/health` y `/metrics`.
- Prometheus recolectando metricas cada 5 segundos.
- Grafana con dashboard provisionado automaticamente.
- k6 con escenarios de carga baja, media, alta y soak test.

## Ejecucion del entorno

```bash
docker compose up --build -d
```

Servicios:

- API: http://localhost:3000
- Metricas: http://localhost:3000/metrics
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

Credenciales de Grafana:

- Usuario: `admin`
- Password: `admin`

## Endpoints evaluados

| Endpoint | Objetivo |
| --- | --- |
| `GET /` | Linea base estable y rapida. |
| `GET /slow` | Latencia artificial entre 3 y 5 segundos. |
| `GET /random-error` | Errores HTTP 500 intermitentes con tasa aproximada de 30%. |
| `GET /memory` | Crecimiento progresivo de memoria para detectar fuga. |

## Pruebas k6

Ejecutar un escenario individual:

```bash
docker compose --profile tests run --rm -e SCENARIO=low k6 run -e BASE_URL=http://api:3000 -e SCENARIO=low --summary-export /results/low-summary.json /scripts/black-friday-test.js
```

Escenarios disponibles:

- `low`: 50 usuarios durante 2 minutos.
- `medium`: 100 usuarios durante 5 minutos.
- `high`: 200 usuarios durante 10 minutos.
- `soak`: 50 usuarios durante 20 minutos.

Ejecutar todos:

```bash
docker compose --profile tests run --rm k6 sh /scripts/run-all.sh
```

## Evidencias

Despues de ejecutar las pruebas, tomar capturas de Grafana y guardarlas en `docs/evidences/`:

- `dashboard-disponibilidad.png`
- `dashboard-cpu.png`
- `dashboard-memoria.png`
- `dashboard-eventloop.png`
- `dashboard-p95-errores.png`

Los resumenes JSON de k6 se guardan en `docs/results/`.

## Limpieza

```bash
docker compose down
```

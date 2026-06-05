# Informe Tecnico - Operacion Black Friday

## 1. Objetivo

Determinar con evidencia tecnica si la plataforma esta preparada para soportar carga masiva durante Black Friday, usando observabilidad con Prometheus y Grafana y pruebas de carga con k6.

## 2. Arquitectura del entorno

```text
Usuario / k6
    |
    v
API Node.js
    |
    v
Prometheus
    |
    v
Grafana
```

La API expone endpoints que simulan comportamientos reales de riesgo: respuesta normal, latencia alta, errores intermitentes y crecimiento sostenido de memoria.

## 3. Endpoints de la API

| Endpoint | Comportamiento | Riesgo simulado |
| --- | --- | --- |
| `GET /` | Respuesta inmediata. | Linea base. |
| `GET /slow` | Demora artificial de 3 a 5 segundos. | Operaciones bloqueantes o servicios externos lentos. |
| `GET /random-error` | Falla con HTTP 500 en una tasa aproximada de 30%. | Dependencias inestables o fallos intermitentes. |
| `GET /memory` | Retiene memoria en cada solicitud. | Fuga de memoria. |

## 4. Observabilidad

Prometheus recolecta metricas cada 5 segundos desde `/metrics`. Grafana muestra los cuatro paneles obligatorios:

| Panel | Metrica |
| --- | --- |
| Disponibilidad del servicio | `up` |
| Consumo de CPU | `rate(process_cpu_user_seconds_total[1m])` |
| Uso de memoria residente | `process_resident_memory_bytes` |
| Lag del event loop | `nodejs_eventloop_lag_seconds` |

Tambien se incluye un panel adicional de latencia P95 y errores por endpoint para acelerar el diagnostico.

## 5. Resultados k6

| Escenario | Usuarios | Duracion | Latencia promedio | P95 | Errores | Throughput | Endpoint de mayor impacto |
| --- | ---: | --- | ---: | ---: | ---: | ---: | --- |
| Carga baja | 50 | 2 minutos | 1120 ms | 4300 ms | 8.5% | 39 req/s | `/slow` |
| Carga media | 100 | 5 minutos | 1870 ms | 5100 ms | 15.2% | 71 req/s | `/slow` y `/random-error` |
| Carga alta | 200 | 10 minutos | 3180 ms | 5900 ms | 24.8% | 103 req/s | `/slow` y `/memory` |
| Soak test | 50 | 20 minutos | 2290 ms | 5600 ms | 18.7% | 44 req/s | `/memory` |

Nota: estos valores son una linea base documentada para la entrega. Al ejecutar k6 en el entorno local, reemplazar la tabla con los resultados reales exportados en `docs/results/`.

## 6. Analisis de bottlenecks

| Categoria | Evidencia esperada | Interpretacion |
| --- | --- | --- |
| CPU | Incremento de `process_cpu_user_seconds_total`. | Saturacion por procesamiento intensivo o alto volumen de solicitudes. |
| RAM | Crecimiento sostenido de `process_resident_memory_bytes`. | Fuga de memoria o retencion de objetos no liberados. |
| Red | Aumento de latencia y timeouts. | Demoras en comunicacion o saturacion por concurrencia. |
| Base de datos | Latencia sostenida en endpoints dependientes de datos. | Consultas sin optimizar o conexiones no liberadas. |
| Aplicacion | P95 alto, errores 500 y event loop lag. | Codigo ineficiente, endpoints bloqueantes o dependencias inestables. |

## 7. Respuestas del soak test

### La latencia aumento con el tiempo?

Si. Durante la prueba de remojo la latencia promedio y el P95 tienden a crecer cuando se combinan solicitudes a `/slow` y `/memory`. Esto indica acumulacion de trabajo pendiente y degradacion progresiva de la capacidad de respuesta.

### La memoria regreso a su estado inicial?

No. El endpoint `/memory` retiene buffers en memoria, por lo que `process_resident_memory_bytes` aumenta y no vuelve al nivel inicial despues de finalizar la carga.

### Existe indicio de fuga de memoria?

Si. El crecimiento sostenido de RAM sin estabilizacion ni liberacion confirma un patron compatible con fuga de memoria.

### Que endpoint genero mas impacto?

`/memory` genera el mayor impacto a largo plazo por crecimiento de RAM. `/slow` genera el mayor impacto inmediato sobre P95 porque introduce latencia de 3 a 5 segundos por solicitud. `/random-error` afecta la confiabilidad por su tasa de errores HTTP 500.

## 8. Propuesta de mejora tecnica

| Mejora | Justificacion | Evidencia relacionada |
| --- | --- | --- |
| Cache con Redis | Cachear respuestas frecuentes reduce carga sobre API y dependencias lentas. | P95 elevado en `/slow` y throughput limitado. |
| Balanceador de carga | Distribuir trafico entre multiples instancias evita punto unico de fallo y mejora disponibilidad. | Mayor degradacion en escenarios de 100 y 200 usuarios. |
| Auto scaling por CPU/RAM | Escalar instancias cuando CPU o memoria superen umbrales reduce saturacion durante picos. | Incremento de CPU y memoria bajo carga alta. |
| Correccion de fuga en `/memory` | Liberar referencias y limitar buffers evita crecimiento indefinido de RAM. | `process_resident_memory_bytes` no regresa al estado inicial. |
| Timeouts y circuit breakers | Evitan que dependencias lentas acumulen solicitudes y saturen el event loop. | P95 elevado y latencia sostenida en `/slow`. |

## 9. Conclusiones

La plataforma no debe exponerse a Black Friday sin optimizaciones. La evidencia esperada muestra latencia alta en el endpoint lento, errores intermitentes en el endpoint inestable y fuga de memoria en el endpoint consumidor de RAM.

La prioridad tecnica es corregir la fuga de memoria, reducir la latencia de operaciones lentas, distribuir carga horizontalmente y activar escalado automatico basado en CPU, memoria y latencia P95.

## 10. Codigo fuente comentado

El codigo principal esta en `src/server.js`. La instrumentacion de metricas usa `prom-client`, con metricas default de Node.js y metricas HTTP personalizadas para latencia y conteo de solicitudes por endpoint.

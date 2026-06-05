import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const scenario = __ENV.SCENARIO || 'low';
const baseUrl = __ENV.BASE_URL || 'http://api:3000';
const endpointWeights = [
  ['/', 0.45],
  ['/slow', 0.2],
  ['/random-error', 0.2],
  ['/memory', 0.15]
];

export const errorRate = new Rate('black_friday_errors');

const scenarios = {
  low: {
    vus: 50,
    duration: '2m'
  },
  medium: {
    vus: 100,
    duration: '5m'
  },
  high: {
    vus: 200,
    duration: '10m'
  },
  soak: {
    vus: 50,
    duration: '20m'
  }
};

export const options = {
  scenarios: {
    black_friday: {
      executor: 'constant-vus',
      vus: scenarios[scenario].vus,
      duration: scenarios[scenario].duration
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.40'],
    http_req_duration: ['p(95)<6000']
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max']
};

function pickEndpoint() {
  const roll = Math.random();
  let cumulative = 0;

  for (const [endpoint, weight] of endpointWeights) {
    cumulative += weight;
    if (roll <= cumulative) return endpoint;
  }

  return '/';
}

export default function () {
  const endpoint = pickEndpoint();
  const response = http.get(`${baseUrl}${endpoint}`, {
    tags: { endpoint }
  });

  const ok = check(response, {
    'status esperado': (res) => {
      if (endpoint === '/random-error') return [200, 500].includes(res.status);
      return res.status === 200;
    },
    'respuesta menor a 6s': (res) => res.timings.duration < 6000
  });

  errorRate.add(!ok || response.status >= 500);
  sleep(1);
}

const config = require('./config');

// Metrics stored in memory
const requests = {};
const requestMethods = {};
let users = 0;

// Middleware to track requests
function requestTracker(req, res, next) {
  const endpoint = `[${req.method}] ${req.path}`;
  const method = `[${req.method}]`;
  requests[endpoint] = (requests[endpoint] || 0) + 1;
  requestMethods[method] = (requestMethods[method] || 0) + 1;
  next();
}

const os = require('os');

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  //console.log(cpuUsage)
  //console.log(parseInt((cpuUsage*100).toFixed(2)))
  return  parseInt((cpuUsage).toFixed(2));
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return  parseInt(memoryUsage.toFixed(2));
}

function addUser(){
    users += 1;
}

function logoutUser(){
    users -= 1;
    if (users < 0){
        users = 0;
    }
}
let pizzaSold = 0;
let pizzaFail = 0;
let totalLatency = [];
let pizzaLatency = [];
let sales = 0;
let authSuccess = 0;
let authFail = 0;
function pizzaPurchase(success, latency, price){
    if(success){
        pizzaSold += 1;
        pizzaLatency.push(latency)
        sales += price; 
    } else {
        pizzaFail += 1;
        pizzaLatency.push(latency)
    }
}

function authApproved(){
    authSuccess += 1
}
function authDenied(){
    authFail +=1;
}
function addLatency(latency){
    //console.log(latency)
    totalLatency.push(latency)
    //console.log(totalLatency)
}

function getLatency(){
    if(totalLatency.length == 0){
        //console.log('empty');
        return 0;
    }
    const total = totalLatency.reduce((sum, currentValue) => sum + currentValue, 0) / totalLatency.length;
    totalLatency = []
    //console.log('total:' + total);
    return total;
}
function getPizzaLatency(){
    if(pizzaLatency.length == 0){
        return 0;
    }
    const total = pizzaLatency.reduce((sum, currentValue) => sum + currentValue, 0) / pizzaLatency.length;
    pizzaLatency = []
    return total;
}

// This will periodically send metrics to Grafana
setInterval(() => {
  const metrics = [];
  Object.keys(requests).forEach((endpoint) => {
    metrics.push(createMetric('requests', requests[endpoint], '1', 'sum', 'asInt', { endpoint }));
  });
  Object.keys(requestMethods).forEach((method) => {
    metrics.push(createMetric('methods', requestMethods[method], '1', 'sum', 'asInt', { method }));
  });
  //console.log(requestMethods)
  metrics.push(createMetric('cpuTemp',getCpuUsagePercentage(), '%','gauge' , 'asInt',{}));
  metrics.push(createMetric('memoryUsage',getMemoryUsagePercentage(),'%' ,'gauge' , 'asInt',{}));
  metrics.push(createMetric('numberOfUsers', users, '1', 'gauge','asInt',{}))
  metrics.push(createMetric('endPointLatency',getLatency(),'1','gauge','asDouble',{}))
  metrics.push(createMetric('pizzaCreation',pizzaSold,'1','sum','asInt',{}))
  metrics.push(createMetric('pizzaFailed',pizzaFail,'1','sum','asInt',{}))
  metrics.push(createMetric('pizzaSales',sales,'1','sum','asDouble',{}))
  metrics.push(createMetric('pizzaLatency',getPizzaLatency(),'1','gauge','asDouble',{}))
  metrics.push(createMetric('authSuccess',authSuccess,'1','sum','asInt',{}))
  metrics.push(createMetric('authFail',authFail,'1','sum','asInt',{}))

  sendMetricToGrafana(metrics);
}, 10000);

function createMetric(metricName, metricValue, metricUnit, metricType, valueType, attributes) {
  attributes = { ...attributes, source: config.metrics.source };

  const metric = {
    name: metricName,
    unit: metricUnit,
    [metricType]: {
      dataPoints: [
        {
          [valueType]: metricValue,
          timeUnixNano: Date.now() * 1000000,
          attributes: [],
        },
      ],
    },
  };

  Object.keys(attributes).forEach((key) => {
    metric[metricType].dataPoints[0].attributes.push({
      key: key,
      value: { stringValue: attributes[key] },
    });
  });

  if (metricType === 'sum') {
    metric[metricType].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
    metric[metricType].isMonotonic = true;
  }

  return metric;
}

function sendMetricToGrafana(metrics) {
  const body = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics,
          },
        ],
      },
    ],
  };

  fetch(`${config.metrics.url}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP status: ${response.status}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

module.exports = { requestTracker, authApproved, authDenied, addLatency, pizzaPurchase, addUser, logoutUser };
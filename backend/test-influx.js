// Quick test script to check InfluxDB thresholds
require('dotenv').config();
const { fetch } = require('undici');

const INFLUX_URL = process.env.INFLUX_V1_URL || process.env.INFLUX_URL || process.argv[2];
const INFLUX_DB = process.env.INFLUX_V1_DB || process.env.INFLUX_DB || process.argv[3];

async function testInflux() {
  if (!INFLUX_URL || !INFLUX_DB) {
    console.log('❌ Missing InfluxDB configuration!\n');
    console.log('Usage:');
    console.log('  node test-influx.js <INFLUX_URL> <INFLUX_DB>\n');
    console.log('Example:');
    console.log('  node test-influx.js http://localhost:8086 veahome\n');
    console.log('Or create a .env file with:');
    console.log('  INFLUX_V1_URL=http://localhost:8086');
    console.log('  INFLUX_V1_DB=veahome');
    return;
  }
  
  const query = 'SELECT LAST(tempMin) AS tempMin, LAST(tempMax) AS tempMax, LAST(humMin) AS humMin, LAST(humMax) AS humMax, LAST(dustHigh) AS dustHigh, LAST(mq2High) AS mq2High, time FROM smartmonitor_thresholds WHERE deviceId=\'1\'';
  
  const url = `${INFLUX_URL}/query?db=${INFLUX_DB}&q=${encodeURIComponent(query)}`;
  
  console.log('Testing InfluxDB connection...');
  console.log('URL:', INFLUX_URL);
  console.log('DB:', INFLUX_DB);
  console.log('Query:', query);
  console.log('');
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Response:', JSON.stringify(data, null, 2));
    
    const series = data?.results?.[0]?.series?.[0];
    if (series) {
      console.log('\n✅ Found thresholds!');
      console.log('Columns:', series.columns);
      console.log('Values:', series.values);
    } else {
      console.log('\n❌ No thresholds found in InfluxDB');
      console.log('This means your ESP32 hasn\'t published thresholds yet.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testInflux();

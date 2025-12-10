#!/usr/bin/env node
/**
 * Test script to inspect GoMarket WebSocket data formats
 * Usage: node scripts/test-gomarket-ws.js [l2-orderbook|last-trades]
 */

const WebSocket = require('ws');

const endpoint = process.argv[2] || 'l2-orderbook';
const symbol = 'BTCUSDT';
const exchange = 'binance-usdm';

const url = `wss://gomarket-api.goquant.io/ws/${endpoint}/${exchange}/${symbol}`;

console.log(`Connecting to: ${url}`);
console.log('Press Ctrl+C to stop\n');

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('✓ Connected\n');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('Received message:');
    console.log(JSON.stringify(message, null, 2));
    console.log('\n---\n');
  } catch (error) {
    console.log('Raw message:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('\nConnection closed');
  process.exit(0);
});

// Close after 10 seconds or after receiving 5 messages
let messageCount = 0;
setTimeout(() => {
  console.log('\nStopping after 10 seconds...');
  ws.close();
}, 10000);


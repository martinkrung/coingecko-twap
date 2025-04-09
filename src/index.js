#!/usr/bin/env node

const axios = require('axios');
const _ = require('lodash');
const yargs = require('yargs');

const argv = yargs
    .option('id', {
        description: 'Coingecko asset ID',
        type: 'string'
    })
    .option('days', {
        description: 'Length of the TWAP in days',
        type: 'int'
    })
    .demandOption(['id','days'])
    .help()
    .argv

let coinId = argv.id;
let days = argv.days;

(async () => {
    let url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    let response = await axios.get(url)
    
    // Calculate TWAP - Time Weighted Average Price
    const prices = response.data.prices;
    let twap = 0;
    let totalTimeWeight = 0;
    
    for (let i = 0; i < prices.length - 1; i++) {
        const currentPrice = prices[i][1];
        const currentTimestamp = prices[i][0];
        const nextTimestamp = prices[i + 1][0];
        const timeWeight = nextTimestamp - currentTimestamp;
        
        twap += currentPrice * timeWeight;
        totalTimeWeight += timeWeight;
    }
    
    // Handle the last price point if needed (using same weight as previous interval)
    if (prices.length > 0) {
        const lastPrice = prices[prices.length - 1][1];
        if (prices.length > 1) {
            const lastInterval = prices[prices.length - 1][0] - prices[prices.length - 2][0];
            twap += lastPrice * lastInterval;
            totalTimeWeight += lastInterval;
        }
    }
    
    twap = twap / totalTimeWeight;
    console.log(twap);
})()

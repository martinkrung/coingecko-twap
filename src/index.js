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
    // Fetch data only once for the maximum number of days
    let url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
    let response = await axios.get(url);
    const allPrices = response.data.prices;
    
    // Calculate TWAP for each day, from days to 1
    const twapResults = [];
    const now = Date.now();
    
    for (let period = days; period >= 1; period--) {
        // Filter data for the current period (last 'period' days)
        const periodStart = now - (period * 24 * 60 * 60 * 1000);
        const prices = allPrices.filter(pricePoint => pricePoint[0] >= periodStart);
        
        // Calculate TWAP - Time Weighted Average Price
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
        
        // Handle the last price point if needed
        if (prices.length > 0) {
            const lastPrice = prices[prices.length - 1][1];
            if (prices.length > 1) {
                const lastInterval = prices[prices.length - 1][0] - prices[prices.length - 2][0];
                twap += lastPrice * lastInterval;
                totalTimeWeight += lastInterval;
            }
        }
        
        if (totalTimeWeight > 0) {
            twap = twap / totalTimeWeight;
        } else {
            twap = 0; // Default to 0 if no data available
        }
        
        twapResults.push({
            days: period,
            price: twap
        });
        
        console.log(`TWAP for ${period} day(s): ${twap}`);
    }
    
    // Print data in a format suitable for graphing
    console.log("\nData for graphing:");
    console.log("Days,Price");
    twapResults.forEach(result => {
        console.log(`${result.days},${result.price}`);
    });
    
    // Simple ASCII graph visualization
    console.log("\nSimple ASCII Graph (Days vs Price):");
    console.log("Y-axis: Price in USD");
    console.log("X-axis: Days");
    
    // Find max price for scaling
    const maxPrice = Math.max(...twapResults.map(r => r.price));
    const height = 50; // Increased height to 50 for more granularity
    
    // Draw the graph rows from top to bottom
    for (let row = height; row >= 0; row--) {
        const price = (row / height) * maxPrice;
        let line = price.toFixed(2).padStart(8) + " |";
        
        for (const result of twapResults) {
            // More precise calculation to determine if we should place an asterisk
            const normalizedResultHeight = (result.price / maxPrice) * height;
            if (normalizedResultHeight >= row && normalizedResultHeight < row + 1) {
                line += "  *  "; // Consistent 5-character width
            } else if (normalizedResultHeight >= row) {
                line += "  |  "; // Consistent 5-character width for the bar
            } else {
                line += "     "; // Consistent 5-character width for empty space
            }
        }
        
        console.log(line);
    }
    
    // Draw the x-axis
    let xAxis = "         +";
    for (let i = 0; i < twapResults.length; i++) {
        xAxis += "-----"; // Make consistent with the width above
    }
    console.log(xAxis);
    
    // Draw the day labels with proper padding
    let labels = "          ";
    for (const result of twapResults) {
        // Center the day number in the 5-character space
        labels += result.days.toString().padStart(3).padEnd(5);
    }
    console.log(labels);

    // Calculate and display percent changes
    let percentChanges = "          ";
    for (let i = 0; i < twapResults.length; i++) {
        if (i === twapResults.length - 1) {
            // Last item doesn't have a next item to compare with
            percentChanges += "     ";
        } else {
            // Calculate percent change from current to next day
            const currentPrice = twapResults[i].price;
            const nextPrice = twapResults[i + 1].price;
            
            if (currentPrice === 0) {
                percentChanges += "  -  "; // Handle division by zero
            } else {
                const percentChange = ((nextPrice - currentPrice) / currentPrice) * 100;
                // Format to show 1 decimal place with % sign, centered in 5 chars
                const changeStr = percentChange.toFixed(1) + "%";
                percentChanges += changeStr.padStart(3).padEnd(5);
            }
        }
    }
    console.log(percentChanges);
})()

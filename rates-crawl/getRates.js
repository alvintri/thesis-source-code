const request = require('supertest');
const { createObjectCsvWriter } = require('csv-writer');
const jsonPath = require('jsonpath');
const fs = require('fs');
const csv = require('csv-parser');

const courierType = "reguler"
const token = ''
const originDestinationFilePath = './shortest-origin/nearestOrigins.csv'
const baseUrl = 'http://3pl-client-gateway./'
// Define the request body
const requestBodyTemplate = {
    "destinationLatitude": 0,
    "destinationLongitude": 0,
    "isCod": false,
    "isUseInsurance": false,
    "itemPrice": 500145,
    "logisticCode": [
    ],
    "originLatitude": 0,
    "originLongitude": 0,
    "originPostalCode": "42415",
  "destinationPostalCode": "40191",
    "packageTypeId": 1,
    "serviceType": [  
    ],
    "shipmentType": 1,
    "weight": 1000,
    "width": 5,
    "height" : 2,
    "length": 2
  };

  async function requestBody(requestBody,csvFilePath){
    const data =await readCSVFile(csvFilePath)
    requestBody.originPostalCode = await data.originPostalCode;
    requestBody.destinationPostalCode = await data.destinationPostalCode
    return await requestBody
  }

// Define the JSON query to extract the minimum price from the response body
const jsonQuery = `$.data.${courierType}[*].price`;

// Define the CSV writer
const csvWriter = createObjectCsvWriter({
    path: './result/getRates.csv',
    header: ['MinimumPrice'] // Adjust the header according to your needs
  });
  
  // Function to make the request and extract the minimum price
  function makeRequestAndExtractPrice() {
    return new Promise((resolve, reject) => {
      request(baseUrl)
        .post('/v1/rates/') // Replace '/endpoint' with the desired endpoint
        .send(requestBody(requestBodyTemplate,originDestinationFilePath))
        .set({
          Authorization: `Bearer ${token}`
        })
        .expect(200) // Set the desired HTTP response status code
        .end((err, res) => {
          if (err) {
            console.error('Error:', err);
            reject(err);
            return;
          }
  
          // Extract the minimum price from the response body
          const ratePrice = jsonPath.query(res.body, jsonQuery);
          console.log(ratePrice)
          const respData = res.body.data

            //Find minimum price
            const minRatePrice = Math.min(...ratePrice)
            console.log(minRatePrice)

            const respDataReg = respData.reguler
            let newRates = {}

            for(let key in respDataReg){
                if(respDataReg[key].price === minRatePrice){
                    newRates = {
                        logisticName : respDataReg[key].logisticName,
                        price : respDataReg[key].price,
                        rateCode : respDataReg[key].rateCode
                    }
                }
            }
          resolve(newRates);
        });
    });
  }
  
  // Array to store the extracted prices
  const prices = [];
  
  // Loop through the requests
  async function loopRequests() {
    const prices = [];
  
    for (let i = 0; i < 2; i++) {
      try {
        const minimumPrice = await makeRequestAndExtractPrice();
        console.log(minimumPrice);
        prices.push({
          logisticName: minimumPrice.logisticName,
          price: minimumPrice.price,
          rateCode: minimumPrice.rateCode,
        });
      } catch (err) {
        console.error('Error:', err);
      }
    }
  
    // Create the CSV writer
    const csvWriter = createObjectCsvWriter({
      path: './result/getRates.csv',
      header: [
        { id: 'logisticName', title: 'logisticName' },
        { id: 'price', title: 'price' },
        { id: 'rateCode', title: 'rateCode' },
      ],
    });
  
    // Write the extracted prices to CSV
    csvWriter
      .writeRecords(prices)
      .then(() => console.log('CSV file has been written successfully.'))
      .catch((err) => console.error('Error while writing CSV file:', err));
  }
  
  function readCSVFile(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = csv.parse(fileContent, { columns: true });
    return records;
  }

  loopRequests();
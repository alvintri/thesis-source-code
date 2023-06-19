const request = require('supertest');
const { createObjectCsvWriter } = require('csv-writer');
const jsonPath = require('jsonpath');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config(); // Load environment variables from .env file

//Config file Path URL
const warehouseType = process.env.WAREHOUSE_TYPE;
const numberOfData = process.env.NUMBER_OF_DATA;
const courierType = process.env.COURIER_TYPE;

//PATH URL
const originDestinationFilePath = `./results/shortest-origin/warehouse-${warehouseType}/originDestination-${numberOfData}.csv`;
const resultsCsvPath = `./results/rates-${courierType}/warehouse-${warehouseType}/result-data-${numberOfData}.csv`;

//CONFIG
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6IjdiOWQwMDJjLTA3MjgtNDNmYy05MGUyLTc4NzFmODlmNTM1YSIsImV4cGlyZXNJbiI6MTY4NzI1MzY2MX0.9T3IAY5q4UWkdrZiG6yJufg6kM688XQ-eJQN5Zn8MWQ'
const baseUrl = 'http://evm-3pl-client-gateway.prod.internal/';

// Define the request body template
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


async function createRequestBody(data) {
  const requestBody = requestBodyTemplate ;
  requestBody.originPostalCode = `${data.originPostalCode}`;
  requestBody.destinationPostalCode =`${data.destinationPostalCode}`;
  return requestBody;
}

// Define the JSON query to extract the minimum price from the response body
const jsonQuery = `$.data.${courierType}[*].price`;

// Define the CSV writer for the final results
const csvWriter = createObjectCsvWriter({
  path: resultsCsvPath,
  header: [
    { id: 'id', title: 'No.' },
    { id: 'logisticName', title: 'Nama Logistic' },
    { id: 'originPostalCode', title: 'Kode Pos Asal' },
    { id: 'destinationPostalCode', title: 'Kode Pos Tujuan' },
    { id: 'price', title: 'Ongkir' },
    { id: 'rateCode', title: 'Rate Code' },
    { id: 'rateType', title: 'Rate Type' },
  ]
});

// Function to make the request and extract the minimum price
function makeRequestAndExtractPrice(requestBody) {
  return new Promise((resolve, reject) => {
    request(baseUrl)
      .post('/v1/rates/') // Replace '/endpoint' with the desired endpoint
      .send(requestBody)
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
        const respData = res.body.data;

        // Find the minimum price
        const minRatePrice = Math.min(...ratePrice);

        const respDataReg = respData.reguler;
        let newRates = {};

        for (let key in respDataReg) {
          if (respDataReg[key].price === minRatePrice) {
            newRates = {
              logisticName: respDataReg[key].logisticName,
              price: respDataReg[key].price,
              rateCode: respDataReg[key].rateCode
            };
          }
        }
        resolve(newRates);
      });
  });
}

// Loop through the requests
async function loopRequests() {
  const prices = [];
  const data = await readCSVFile(originDestinationFilePath);

  for (let key=0; key<=data.length; key++) {
    try {
     const requestBody = await createRequestBody(data[key]);
      const minimumPrice = await makeRequestAndExtractPrice(requestBody);
      prices.push({
        id : key+1,
        originPostalCode : requestBody.originPostalCode,
        destinationPostalCode : requestBody.destinationPostalCode,
        logisticName: minimumPrice.logisticName,
        price: minimumPrice.price,
        rateCode: minimumPrice.rateCode,
        rateType : courierType
      });
    } catch (err) {
      console.error('Error:', err);
    }
  }

  // Write the extracted prices to CSV
  csvWriter
    .writeRecords(prices)
    .then(() => console.log('Get Rates CSV file has been written successfully.'))
    .catch((err) => console.error('Error while writing CSV file:', err));
}

function readCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

loopRequests();

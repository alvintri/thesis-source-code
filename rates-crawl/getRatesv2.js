const request = require('supertest');
const { createObjectCsvWriter } = require('csv-writer');
const jsonPath = require('jsonpath');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config(); // Load environment variables from .env file

//Config file Path URL
const courierType = process.env.COURIER_TYPE;

//PATH URL
const originDestinationFilePath = `./results/wh-bandung/origin-dest.csv`;
const resultsCsvPath = `./results/wh-bandung/result-data-01.csv`;

//CONFIG
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6IjdiOWQwMDJjLTA3MjgtNDNmYy05MGUyLTc4NzFmODlmNTM1YSIsImV4cGlyZXNJbiI6MTcyNDgxNzQ3MH0.A8lsLXMM_aoBiDCa8sFgXYawH6xb0qwA3BKKQAEit-c'
const baseUrl = 'http://evm-3pl-client-gateway.prod.internal/';

// Define the request body template
const requestBodyTemplate = {
    "customRateKeys" : ["bDZ1XzeBAvJ0XpZwE1De"
    ],
    "destinationLatitude": 0,
    "destinationLongitude": 0,
    "isCod": false,
    "isUseInsurance": false,
    "itemPrice": 10000,
    "logisticCode": [
      "JNE","IDX","JNT"
    ],
    "originLatitude": 0,
    "originLongitude": 0,
    "originPostalCode": "42415",
    "destinationPostalCode": "40191",
    "packageTypeId": 1,
    "serviceType": [  
      "reguler"
    ],
    "shipmentType": 2,
    "weight": 1000,
    "width": 5,
    "height" : 2,
    "length": 2
  };


async function createRequestBody(data) {
  console.log(JSON.stringify(data))
  const requestBody = requestBodyTemplate ;
  requestBody.originPostalCode = `${data.originPostalCode}`;
  requestBody.destinationPostalCode =`${data.destinationPostalCode}`;
  requestBody.weight = parseInt(data.totalWeight);
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
    { id: 'orderReceiptCode', title: 'Order Receipt Code' },
    { id: 'price', title: 'Ongkir' },
    { id: 'rateCode', title: 'Rate Code' },
    { id: 'rateType', title: 'Rate Type' },
    { id: 'isFlatRate', title: 'Flat Rate' },
    { id: 'weight', title: 'Total Weight' },
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
              rateCode: respDataReg[key].rateCode,
              isFlatRate: respDataReg[key].isFlatRate,
              weight : respDataReg[key].weight
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
  console.log(JSON.stringify(data))

  for (let key=0; key<=data.length; key++) {
    try {
     const requestBody = await createRequestBody(data[key]);
      const minimumPrice = await makeRequestAndExtractPrice(requestBody);
      prices.push({
        id : key+1,
        originPostalCode : data[key].originPostalCode,
        destinationPostalCode : data[key].destinationPostalCode,
        orderReceiptCode : data[key].orderReceiptCode,
        logisticName: minimumPrice.logisticName,
        price: minimumPrice.price,
        rateCode: minimumPrice.rateCode,
        rateType : courierType,
        isFlatRate : minimumPrice.isFlatRate,
        weight : minimumPrice.weight
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
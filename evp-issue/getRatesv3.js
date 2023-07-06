const request = require('supertest');
const { createObjectCsvWriter } = require('csv-writer');
const jsonPath = require('jsonpath');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config(); // Load environment variables from .env file

//Config file Path URL
const courierType = process.env.COURIER_TYPE;
const rateType = 'Recrawl'

//PATH URL
const originDestinationFilePath = `./data/evp-issue/originData_${rateType}.csv`;
const resultsCsvPath = `./data/evp-issue/result_${rateType}.csv`;

//CONFIG
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6IjdiOWQwMDJjLTA3MjgtNDNmYy05MGUyLTc4NzFmODlmNTM1YSIsImV4cGlyZXNJbiI6MTY4OTIwMTY1NH0._CBiu9a5s2R0Ru15lJp_xKLzXZox5vT56cCjY8mof30'
const baseUrl = 'http://evm-3pl-client-gateway.prod.internal/';

// Define the request body template
const requestBodyTemplate = {
    "destinationLatitude": 0,
    "destinationLongitude": 0,
    "isCod": false,
    "isUseInsurance": false,
    "itemPrice": 500145,
    "logisticCode": [
      "JNE"
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

  requestBody.originPostalCode = `${data.origin_postal_code}`;
  requestBody.destinationPostalCode =`${data.destination_postal_code}`;
  return requestBody;
}

// Define the JSON query to extract the minimum price from the response body
const jsonQuery = `$.data.reguler[?(@.rateCode="REG23")]`;

// Define the CSV writer for the final results
const csvWriter = createObjectCsvWriter({
  path: resultsCsvPath,
  header: [
    { id: 'id', title: 'No' },
    { id: 'clientOrderNo', title: 'shipment_order_no' },
    { id: 'logisticName', title: 'logistic_name' },
    { id: 'originPostalCode', title: 'origin_postal_code' },
    { id: 'destinationPostalCode', title: 'destination_postal_code' },
    { id: 'awbNo', title: 'awb_number' },
    { id: 'minDuration', title: 'min_sla_api' },
    { id: 'maxDuration', title: 'max_sla_api' },
  ]
});

// Function to make the request and extract the minimum price
function makeRequestAndExtractPrice(requestBody,data) {
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
        //const respData = jsonPath.query(res.body, jsonQuery);
        //console.log(JSON.stringify(respData))

        const respDataReg = res.body.data.reguler;
        let newRates = {};

        for (let key in respDataReg) {
          if (respDataReg[key].rateCode == `${data.rate_code}`) {
            newRates = {
              logisticName  : respDataReg[key].logisticName,
              price         : respDataReg[key].price,
              rateCode      : respDataReg[key].rateCode,
              minDuration   : respDataReg[key].minDuration,
              maxDuration   : respDataReg[key].maxDuration,
            };
          }
        }
        resolve(newRates);
      });
  });
}

// Loop through the requests
async function loopRequests() {
  const result = [];
  const data = await readCSVFile(originDestinationFilePath);
  for (let key=0; key<=data.length; key++) {
    reqData = data[key]
    try {
     const requestBody = await createRequestBody(reqData);
      const respBody = await makeRequestAndExtractPrice(requestBody,reqData);
      result.push({
        id                    : key+1,
        awbNo                 : reqData.awb_number,
        clientOrderNo         : reqData.shipment_order_no,
        originPostalCode      : reqData.origin_postal_code,
        destinationPostalCode : reqData.destination_postal_code,
        logisticName          : respBody.logisticName,
        minDuration           : respBody.minDuration,
        maxDuration           : respBody.maxDuration,
        rateCode              : respBody.rateCode,
      });
    } catch (err) {
      console.log(key+1)
    }
  }

  // Write the extracted prices to CSV
  csvWriter
    .writeRecords(result)
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
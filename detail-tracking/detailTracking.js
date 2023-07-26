const request = require('supertest');
const { createObjectCsvWriter } = require('csv-writer');
const jsonPath = require('jsonpath');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config(); // Load environment variables from .env file

//Config file Path URL
const courierType = process.env.COURIER_TYPE;
const FileName = 'IDX_3'

//PATH URL
const trackingFilePath = `./data/tracking-issue/TrackingData_${FileName}.csv`;
const resultsCsvPath = `./data/tracking-issue/result_${FileName}.csv`;

//CONFIG
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6IjdiOWQwMDJjLTA3MjgtNDNmYy05MGUyLTc4NzFmODlmNTM1YSIsImV4cGlyZXNJbiI6MTY4OTI5ODY4Nn0.PkexLuhOlPTKYAZhzCMqHxfY4tsREHHZKf_F3draDp0'
const baseUrl = 'http://evm-3pl-client-gateway.prod.internal/';

// Define the request body template
const requestBodyTemplate = {
    "data": [
      {
        "awbNumber": "IDE702469824468",
        "logisticCode": "IDX"
      }
    ],
    "filterStatus": "undelivered"
  }

  async function createRequestBody(data) {
    const requestBody = requestBodyTemplate ;
  
    requestBody.data[0].awbNumber = `${data.awb_number}`;
    requestBody.data[0].logisticCode =`${data.logistic_code}`;
    return requestBody;
  }

// Define the CSV writer for the final results
const csvWriter = createObjectCsvWriter({
    path: resultsCsvPath,
    header: [
      { id: 'id', title: 'No' },
      { id: 'shipment_order_no', title: 'shipment_order_no' },
      { id: 'logistic_code', title: 'logistic_code' },
      { id: 'awb_no', title: 'awb_no' },
      { id: 'undelivered_date_1', title: 'undelivered_date_1' },
      { id: 'undelivered_image_1', title: 'undelivered_image_1' },
      { id: 'undelivered_note_1', title: 'undelivered_note_1' },
      { id: 'undelivered_date_2', title: 'undelivered_date_2' },
      { id: 'undelivered_image_2', title: 'undelivered_image_2' },
      { id: 'undelivered_note_2', title: 'undelivered_note_2' },    
      { id: 'undelivered_date_3', title: 'undelivered_date_3' },
      { id: 'undelivered_image_3', title: 'undelivered_image_3' },
      { id: 'undelivered_note_3', title: 'undelivered_note_3' },
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
                responseBody  : JSON.stringify(res.body.data)
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
        console.log(key+1)
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
          requestPayload        : JSON.stringify(requestBody),
          responsePayload       : respBody.responseBody,
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
  
  

loopRequests();
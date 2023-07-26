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



// Define the CSV writer for the final results
const csvWriter = createObjectCsvWriter({
  path: resultsCsvPath,
  header: [
    { id: 'id', title: 'No' },
    { id: 'shipment_order_no', title: 'shipment_order_no' },
    { id: 'logistic_code', title: 'logistic_code' },
    { id: 'awb_no', title: 'awb_no' },
    { id: 'dispatch_at', title: 'dispatch_at' },
    { id: 'delivered_at', title: 'delivered_at' },
    { id: 'in_process_return', title: 'in_process_return' },
    { id: 'return_at', title: 'return_at' },
  ]
});

// Function to make the request and extract the minimum price
function makeRequestAndExtractPrice(data) {
  return new Promise((resolve, reject) => {
    //let endpoint = `/v1/tracking/${data.awb_number}?logisticCode=${data.logistic_code.toLowerCase()}`
    let endpoint = `/v1/tracking/${data.awb_number}?logisticCode=idx`
    request(baseUrl)
      .get(endpoint) // Replace '/endpoint' with the desired endpoint
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
        const respData = res.body.data;
        console.log(respData.inProcessReturnAt)
        console.log(respData.returnedAt)

        let trackingResp = {
            dispatch_at         : convertToUTCAndUnix(respData.dispatchAt),
            delivered_at        : convertToUTCAndUnix(respData.deliveredAt),
            in_process_return   : convertToUTCAndUnix(respData.inProcessReturnAt),
            return_at           : convertToUTCAndUnix(respData.returnedAt),
        };

        resolve(trackingResp);
      });
  });
}

// Loop through the requests
async function loopRequests() {
  const result = [];
  const data = await readCSVFile(trackingFilePath);
  for (let key=0; key<=data.length; key++) {
    var reqData = data[key]
    var length  = data.length+1

    try {
      const respBody = await makeRequestAndExtractPrice(reqData);
      result.push({
        id                      : key+1,
        awb_no                  : reqData.awb_number,
        shipment_order_no       : reqData.shipment_order_no,
        logistic_code           : reqData.logistic_code,
        dispatch_at             : respBody.dispatch_at,
        delivered_at            : respBody.delivered_at,
        in_process_return       : respBody.in_process_return,
        return_at               : respBody.return_at,
      });
      console.log(key+1 + " from " +  length)
    } catch (err) {
        console.log(err)
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

function convertToUTCAndUnix(dateString) {
    if(dateString!=""){
        var givenDateTime = new Date(dateString);
        var subtractedDateTime = new Date(givenDateTime.getTime() - (7 * 60 * 60 * 1000));
        var unixTimestamp = Math.floor(subtractedDateTime.getTime() / 1000);
        return unixTimestamp;
    }
    else{
        return 0
    }
  }
  
  

loopRequests();
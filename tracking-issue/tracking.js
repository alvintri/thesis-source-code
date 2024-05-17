const request = require('supertest');
const { createObjectCsvWriter } = require('csv-writer');
const jsonPath = require('jsonpath');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config(); // Load environment variables from .env file

//Config file Path URL
const courierType = process.env.COURIER_TYPE;
//const FileName = '1'
const FileName = '2_caa74744'


//PATH URL
const trackingFilePath = `./data/tracking-issue/TrackingData_${FileName}.csv`;
const resultsCsvPath = `./data/tracking-issue/result_${FileName}.csv`;

//CONFIG
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6IjdiOWQwMDJjLTA3MjgtNDNmYy05MGUyLTc4NzFmODlmNTM1YSIsImV4cGlyZXNJbiI6MTcxNjUxNjI3MH0.VHKDRBtlPGxPw48ztXjypJK8aw5t4qmxKcr2Nh447_U'
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
    { id: 'is_found', title: 'is_found' },
  ]
});

function makeRequestAndExtractPrice(data) {
  return new Promise((resolve, reject) => {
    let endpoint = `/v1/tracking/${data.awb_number}?logisticCode=${data.logistic_code_lower}`;
    request(baseUrl)
      .get(endpoint)
      .set({
        Authorization: `Bearer ${token}`
      })
      .expect(200)
      .end((err, res) => {


          let trackingResp; // Declare trackingResp here with a default value

          if (res.status === 200) {
            if (res.body && res.body.data && typeof res.body.data === 'object') {
              const respData = res.body.data;
              trackingResp = {
                dispatch_at: convertToUTCAndUnix(respData.dispatchAt),
                delivered_at: convertToUTCAndUnix(respData.deliveredAt),
                in_process_return: convertToUTCAndUnix(respData.inProcessReturnAt),
                return_at: convertToUTCAndUnix(respData.returnedAt),
                isFound: "TRUE"
              };
            } else {
              // The 'data' property is missing or not an object, handle the error here
              reject(new Error("Error: 'data' property missing or invalid in the response body."));
              return;
            }
          } else {
            trackingResp = {
              dispatch_at: null,
              delivered_at: null,
              in_process_return: null,
              return_at: null,
              isFound: "FALSE"
            };
          }

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
        is_found                : respBody.isFound
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
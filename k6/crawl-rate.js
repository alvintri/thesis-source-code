import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { sleep } from 'k6';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js'

export const options = {
    scenarios: {
      contacts: {
        executor: 'per-vu-iterations',
        maxDuration: '120m',
      },
    },
  };
  

const configLogisticCode = ["IDX"]
// Load CSV data
const csvData = new SharedArray('ewikiData', function() {
    return papaparse.parse(open('./dataJakarta1.csv'), {header: true,}).data
});

export default function() {
    csvData.forEach(data => {
        const payload = JSON.stringify({
            //customRateKey : "bDZ1XzeBAvJ0XpZwE1De",
            destinationLatitude: 0,
            destinationLongitude: 0,
            isCod: false,  // Set as per your requirements
            isUseInsurance: false,  // Set as per your requirements
            itemPrice: 100000,  // Set as per your requirements or load from CSV if needed
            logisticCode: configLogisticCode,  // Set as per your requirements
            originLatitude: 0,
            originLongitude: 0,
            originPostalCode: data.originPostalCode,
            destinationPostalCode: data.destinationPostalCode,
            packageTypeId: 1,  // Set as per your requirements
            serviceType: [
            ],  // Set as per your requirements
            serviceCode: [],  // Set as per your requirements
            shipmentType: 2,  // Set as per your requirements
            weight: 100,  // Set as per your requirements
            width: 1,  // Set as per your requirements
            height: 1,  // Set as per your requirements
            length: 1  // Set as per your requirements
        });

        const headers = {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6IjdiOWQwMDJjLTA3MjgtNDNmYy05MGUyLTc4NzFmODlmNTM1YSIsImV4cGlyZXNJbiI6MTcyNDM5NTUyN30.EQqM7e6TNUosUUvzkgU7tQad36XoYHSR1es9wHvql-g',
        };

        const res = http.post('http://evm-3pl-client-gateway.prod.internal/v1/rates/', payload, { headers: headers });

        check(res, {
            'status is 200': (r) => r.status === 200,
        });

        const print = {
            id : data.No,
            origin_postal_code: data.originPostalCode,
            origin_kecamatan: data.originDistrictName,
            origin_kota: data.originCityName,
            origin_provinsi: data.originProvince,
            dest_postal_code: data.destinationPostalCode,
            dest_kecamatan: data.destDistrictName,
            dest_kota: data.destinationCityName,
            dest_provinsi: data.destProvince,
            response : res.json().data
        }
        console.log(JSON.stringify(print))
        sleep(0.3)
    });
}

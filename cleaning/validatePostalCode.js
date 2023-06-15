const data = require('../data/oldKodePost')
const locationCheck = require('../data/locationCheck')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

let new_array = [];
//Read and mapping csv
const csvWriter = createCsvWriter({
    path: 'cek_lokasi.csv',
    header: [
        { id: 'id', title: 'Id' },
        { id: 'provinceId', title: 'provinceId' },
        { id: 'districtName', title: 'districtName' },
        { id: 'postalCode', title: 'postalCode' },
        { id: 'isAvailable', title: 'isAvailable' }
    ]
});

for (let i = 0; i < locationCheck.hasilTest.length; i++) {
    let new_entry = {
        id : data.location[i].Id,
        provinceId : data.location[i].provinceId,
        districtName : data.location[i].districtName,
        postalCode : data.location[i].postalCode,
        isAvailable : locationCheck.hasilTest[i].status
    }
    console.log(new_entry)
    new_array.push(new_entry);
}

console.log(locationCheck.hasilTest[1])

// Write the new_array to CSV
csvWriter.writeRecords(new_array)
    .then(() => console.log('CSV file has been written successfully.'))
    .catch((err) => console.error('Error while writing CSV file:', err));
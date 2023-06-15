const geolib = require('geolib');
const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
require('dotenv').config(); // Load environment variables from .env file

//Config file Path URL
const warehouseType = process.env.WAREHOUSE_TYPE;
const numberOfData = process.env.NUMBER_OF_DATA;

const destinationFilePath = `./results/generate-destination/randomDestinationResult-${numberOfData}.csv`;
const originFilePath = `./data/warehouse/warehouse-${warehouseType}.csv`;

//Config write PATH URL 
const resultsCsvPath = `./results/shortest-origin/warehouse-${warehouseType}/originDestination-${numberOfData}.csv`;

var index = 0;
// Read data from destination.csv
const destinationData = [];
fs.createReadStream(destinationFilePath)
  .pipe(csv())
  .on('data', (row) => {
    destinationData.push(row);
  })
  .on('end', () => {
    // Read data from origin-Warehouse1.csv
    const originData = [];
    fs.createReadStream(originFilePath)
      .pipe(csv())
      .on('data', (row) => {
        originData.push(row);
      })
      .on('end', () => {
        const results = [];

        // Function to get the nearest origin
        function getNearestOrigin(destLat, destLong, originData) {
          let nearestOrigin = null;
          let minDistance = Infinity;
          originData.forEach((row) => {
            const originLat = row.Latitude;
            const originLong = row.Longitude;
            const distance = geolib.getDistance(
              { latitude: destLat, longitude: destLong },
              { latitude: originLat, longitude: originLong }
            );

            if (distance < minDistance) {
              minDistance = distance;
              nearestOrigin = row;
            }
          });

          return nearestOrigin;
        }

        // Loop through each row in destinationData
        destinationData.forEach((destRow) => {
          const destPostalCode = destRow.postalCode;
          const destLat = destRow.Latitude;
          const destLong = destRow.Longitude;

          // Get the nearest origin for Warehouse1
          const nearestOrigin = getNearestOrigin(destLat, destLong, originData);
          index++

          results.push({
            id : index,
            originCityName : nearestOrigin.cityName,
            originPostalCode: nearestOrigin.postalCode,
            originLat: nearestOrigin.Latitude,
            originLong: nearestOrigin.Longitude,
            destinationPostalCode: destPostalCode,
            destinationLat: destLat,
            destinationLong: destLong
          });
        });

        // Create the CSV writer
        const csvWriter = createCsvWriter({
          path: resultsCsvPath,
          header: [
            { id: 'id', title: 'No' },
            { id: 'originCityName', title: 'originCityName' },
            { id: 'originPostalCode', title: 'originPostalCode' },
            { id: 'originLat', title: 'originLat' },
            { id: 'originLong', title: 'originLong' },
            { id: 'destinationPostalCode', title: 'destinationPostalCode' },
            { id: 'destinationLat', title: 'destinationLat' },
            { id: 'destinationLong', title: 'destinationLong' },
          ]
        });

        // Write the results to CSV
        csvWriter
          .writeRecords(results)
          .then(() => console.log('CSV get origin by destination file has been written successfully.'))
          .catch((err) => console.error('Error while writing CSV file:', err));
      });
  });

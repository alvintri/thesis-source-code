const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
require('dotenv').config(); // Load environment variables from .env file

//CONFIG
const numberOfData = process.env.NUMBER_OF_DATA; 

// Define the path to the CSV file
const csvFilePath = './data/destinationData.csv';
const resultCsvPath = `./results/generate-destination/randomDestinationResult-${numberOfData}.csv`

// Define an empty array to store the data objects
const data = [];


// Read the CSV file and process the data
fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (row) => {
    // Process each row of data here
    // You can access the fields in each row using the corresponding column headers

    // Example: Assuming the CSV has columns: 'Id', 'provinceId', 'provinceName', 'typeLabel', 'cityName', 'Daerah', 'Latitude', 'Longitude', 'postalCode', 'regionWage', 'population', 'marketValue', 'probability'
    const id = row['Id'];
    const provinceId = parseInt(row['provinceId']);
    const provinceName = row['provinceName'];
    const typeLabel = row['typeLabel'];
    const cityName = row['cityName'];
    const daerah = row['Daerah'];
    const latitude = parseFloat(row['Latitude']);
    const longitude = parseFloat(row['Longitude']);
    const postalCode = parseInt(row['postalCode']);
    const regionWage = parseInt(row['regionWage']);
    const population = parseInt(row['population']);
    const marketValue = parseFloat(row['marketValue']);
    const probability = parseFloat(row['probability']);

    // Create a data object for the row
    const rowData = {
      id,
      provinceId,
      provinceName,
      typeLabel,
      cityName,
      daerah,
      latitude,
      longitude,
      postalCode,
      regionWage,
      population,
      marketValue,
      probability
    };

    // Store the data object in the array
    data.push(rowData);
  })
  .on('end', () => {
    // Calculate total market value and total probability
    let totalMarketValue = 0;
    let totalProbability = 0;

    data.forEach(({ marketValue, probability }) => {
      totalMarketValue += marketValue;
      totalProbability += probability;
    });

    // Calculate the normalized probability of each area
    const probabilities = data.reduce((probs, { id, marketValue, probability }) => {
      const normalizedProbability = probability / totalProbability;
      probs[id] = {
        marketValue,
        probability: normalizedProbability
      };
      return probs;
    }, {});

    // Generate number of data random data based on area probabilities
    const randomData = generateRandomData(probabilities, parseInt(numberOfData));

    // Display the random data as a JSON object
    console.log('Success generate random destination');
    const randomDataJSON = randomData.map((id) => {
        const { provinceName, cityName, latitude, longitude, postalCode } = data.find((item) => item.id === id);
        return { id, provinceName, cityName, latitude, longitude, postalCode };
    });
    //console.log(JSON.stringify(randomDataJSON));
    // Create the CSV writer
    const csvWriter = createObjectCsvWriter({
        path: resultCsvPath,
        header: [
            { id: 'id', title: 'Id' },
            { id: 'provinceName', title: 'provinceName' },
            { id: 'cityName', title: 'City Name' },
            { id: 'latitude', title: 'Latitude' },
            { id: 'longitude', title: 'Longitude' },
            { id: 'postalCode', title: 'postalCode' },
        ],
      });

    csvWriter.writeRecords(randomDataJSON)
            .then(() => console.log('CSV file has been written successfully.'))
            .catch((err) => console.error('Error while writing CSV file:', err));
  });

// Function to generate random data based on probabilities
function generateRandomData(probabilities, count) {
  const areas = Object.keys(probabilities);
  const randomData = [];

  for (let i = 0; i < count; i++) {
    const randomNumber = Math.random();
    let cumulativeProbability = 0;

    for (const id of areas) {
      cumulativeProbability += probabilities[id].probability;

      if (randomNumber <= cumulativeProbability) {
        randomData.push(id);
        break;
      }
    }
  }

  return randomData;
}


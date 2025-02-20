// Import the required modules
const { Teams } = require('pokemon-showdown');
const fs = require('fs');
const path = require('path');

// Define the file paths
const inputFilePath = path.join(__dirname, 'data/team.txt');
const outputJSONFilePath = path.join(__dirname, 'data/team.json');
const outputPackedFilePath = path.join(__dirname, 'data/packedteam.txt');

// Read the exported team string from team.txt
fs.readFile(inputFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  // Convert the exported team string to a JSON team
  const jsonTeam = Teams.import(data);

  // Convert the JSON team to a string format
  const jsonString = JSON.stringify(jsonTeam, null, 2);

  // Save the JSON team to a file
  
  fs.writeFile(outputJSONFilePath, jsonString, { flag: 'w' }, (err) => {
    if (err) {
      console.error('Error writing JSON team file:', err);
    } else {
      console.log('Team saved to', outputJSONFilePath);
    }
  });


  // Convert the exported team string to a JSON team
  const packedTeam = Teams.pack(jsonTeam);

  // Save the packed team to a file
  fs.writeFile(outputPackedFilePath, packedTeam, { flag: 'w' }, (err) => {
    if (err) {
      console.error('Error writing packed team file:', err);
    } else {
      console.log('Team saved to', outputPackedFilePath);
    }
  });
});

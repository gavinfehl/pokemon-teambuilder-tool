const fs = require('fs');

function parseUsageStats(filePath) {
    const pokemonData = [];
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');
    
    let tableStart = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('|') && lines[i].includes('Rank')) {
            tableStart = i + 2;
            break;
        }
    }
    
    for (let i = tableStart; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line === '' || line.includes('+----+')) continue;
        
        let fields = line.split('|').map(field => field.trim());
        if (fields.length < 6) continue;
        
        let rank = fields[1];
        let pokemon = fields[2];
        let usagePercent = parseFloat(fields[3].replace('%', ''));
        
        if (!rank || !pokemon || isNaN(usagePercent)) continue;
        
        rank = parseInt(rank, 10).toString();
        
        let viabilityCeiling = usagePercent >= 25 ? 'Centralizing' :
                              usagePercent >= 15 ? 'Very Popular' :
                              usagePercent >= 8 ? 'Popular' :
                              usagePercent >= 4 ? 'Common' :
                              usagePercent >= 2 ? 'Notable' :
                              usagePercent >= 1 ? 'Uncommon' :
                              usagePercent >= 0.2 ? 'Rare' : 'Very Rare';
        
        pokemonData.push({
            rank,
            name: pokemon,
            usage_percent: usagePercent,
            viability_ceiling: viabilityCeiling
        });
    }
    
    return pokemonData;
}

function parseMovesetUsageStats(filename) {
    const outputFile = `${filename}.json`;

    // Read the data from the file
    const data = fs.readFileSync(filename, 'utf8');

    // List of section names
    const sectionNames = ["Basic Info", "Abilities", "Items", "Spreads", "Moves", "Tera Types", "Teammates", "Checks and Counters"];

    let pokemonList = data.split(' +----------------------------------------+ \n +----------------------------------------+ ');
    let jsonData = [];

    // Iterate over list to parse relevant data
    for (let pokemon of pokemonList) {
        let jsonEntry = {};
        let currentSection = "Basic Info";
        let lines = pokemon.split('\n');

        // Store section data in arrays
        let sectionData = {
            "Abilities": [],
            "Items": [],
            "Spreads": [],
            "Moves": [],
            "Tera Types": [],
            "Teammates": [],
            "Checks and Counters": []
        };

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            line = line.replace("+----------------------------------------+", "").replace(" | ", "").replace(" |", "").replace(")|", ")").trim();

            if (line === "") continue;

            // Handle section headers
            if (sectionNames.includes(line)) {
                currentSection = line;
                continue;
            }

            // Capture Pokémon name
            if (currentSection === "Basic Info" && !line.includes(":")) {
                jsonEntry["Pokemon"] = line;
                continue;
            }

            // Capture Raw count, Avg. weight, Viability Ceiling
            if (line.includes(":") && currentSection === "Basic Info") {
                let [key, value] = line.split(": ");
                jsonEntry[key.trim().replace(' ', '_')] = value ? value.trim() : "WTF";
                continue;
            }
            
            // Handle "Checks and Counters" separately (includes KO % and Switch Out %)

            if (currentSection === "Checks and Counters") {
                console.log("Processing CAC line:", line);
                if (line.charAt(0) === '('){
                    console.log("Skipping line:", line);
                    continue;
                }
                let match = line.match(/([\w%-]+)\s+([\d.]+)\s+\(([\d.]+)±([\d.]+)\)/);

                if (match) {
                    console.log("Pokemon:", match[1]);
                    console.log("First Number:", match[2]);  // 79.817
                    console.log("Second Number:", match[3]);  // 95.90
                    console.log("Third Number:", match[4]);  // 4.02

                    let nextIndex = i + 1;  
                    if (nextIndex < lines.length) {
                        let nextLine = lines[nextIndex].trim();
                        console.log("Next Line for KO/Switch:", nextLine);  // Debug KO/Switch Line
                    
                        let koMatch = nextLine.match(/([\d.]+%) KOed \/ ([\d.]+%) switched out/);
                        if (koMatch) {
                            console.log("KO%:", koMatch[1]);
                            console.log("Switch Out%:", koMatch[2]);
                            sectionData[currentSection].push({
                                pokemon: match[1].trim().replace(' ', '-'),
                                // Number n of times the matchup occurred (don't count U-Turn KOs or force-outs
                                matchup_occurred: match[2].trim(),
                                // fraction p of times the counter got the KO or caused a switch
                                counter_kos_or_forces_switch_percent: match[3].trim(),
                                // sqrt(p*(1.0-p)/n)
                                stdevofkoswitch: match[4].trim(),
                                // percent of times the counter got the KO
                                ko_percent: koMatch[1].trim(),
                                // percent of times the counter caused a switch
                                switch_out_percent: koMatch[2].trim()
                            });
                        } else {
                            console.log("KO/Switch regex failed on:", nextLine);
                        }
                    }
                }else{
                    console.log("Check/Counter regex failed on:", nextLine);
                }
            }
            // Handle percentage-based sections and store as arrays
            if (line.includes("%")) {
                let parts = line.split(/\s+(?=[\d.]+%$)/);
                if (parts.length === 2) {
                    let [item, value] = parts;
                    sectionData[currentSection].push({ item: item.trim().replace(' ', '_'), value: value.trim() });
                }
                continue;
            }           
        }

        // Merge section data into the final JSON structure
        Object.assign(jsonEntry, sectionData);
        jsonData.push(jsonEntry);
    }
    return jsonData
}


function saveToJson(data, outputFile) {
    if (!data.length) {
        throw new Error("No data to save");
    }
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');
}

// Main function takes the filenames as an argument no extension
function main(usage, movesetusage) {
    const inputUsageFile = `${usage}.txt`;
    const inputMovesetUsageFile = `${movesetusage}.txt`;
    const outputUsageFile = `../data/parsedusagedata.json`;
    const outputMovesetUsageFile = `../data/parsedmovesetusagedata.json`;
    
    try {
        console.log(`Parsing usage stats from ${inputUsageFile}...`);
        const usageData = parseUsageStats(inputUsageFile);
        
        console.log(`Saving data to ${outputUsageFile}...`);
        saveToJson(usageData, outputUsageFile);
        console.log(`Successfully processed ${usageData.length} Pokémon`);
        console.log(`Data saved to ${outputUsageFile}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
    try {
        console.log(`Parsing usage stats from ${inputMovesetUsageFile}...`);
        const movesetUsageData = parseMovesetUsageStats(inputMovesetUsageFile);
        
        console.log(`Saving data to ${outputMovesetUsageFile}...`);
        saveToJson(movesetUsageData, outputMovesetUsageFile);
        console.log(`Successfully processed ${movesetUsageData.length} Pokémon`);
        console.log(`Data saved to ${outputMovesetUsageFile}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
    } 
}

main("../data/usage", "../data/movesetusage");

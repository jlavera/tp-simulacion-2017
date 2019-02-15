const Moment = require('moment');
const momentRange = require('moment-range');

const moment = momentRange.extendMoment(Moment);

const file = 'history_export_2019-02-07T03_03_50.csv';
// const file = 'history_export_2019-02-07T03_19_39_low_resolution.csv';

const lineReader = require('readline').createInterface({
    input: require('fs').createReadStream(file)
});

// const aggregate = {};
const seasons = {
    winter: [],
    summer: [],
    fall:   [],
    spring: []
};

function getSeason(month, day) {
    switch (month) {
        case 1:
            return 'summer';
        case 2:
            return 'summer';
        case 3:
            return day < 21 ? 'summer' : 'fall';
        case 4:
            return 'fall';
        case 5:
            return 'fall';
        case 6:
            return day < 21 ? 'fall' : 'winter';
        case 7:
            return 'winter';
        case 8:
            return 'winter';
        case 9:
            return day < 21 ? 'winter' : 'spring';
        case 10:
            return 'spring';
        case 11:
            return 'spring';
        case 12:
            return day < 21 ? 'spring' : 'summer';
    }
}

let fullDay = null;
let dayRains = [];

lineReader.on('line', duration);

lineReader.on('close', () => {
    const fs = require('fs');
    Object.keys(seasons)
        .forEach(season => {  
            fs.writeFile(`output-duration-${season}.csv`, seasons[season].join('\n'), function(err) {
                if (err) {
                    return console.log(err);
                }
                
                console.log(`The file ${season} was saved!`);
            });
        });
});

let lastRainDay = null;

function buildDay(year, month, day, hour) {
    return moment(`${year}-${month}-${day} ${hour}:00:00`);
}

function interval(line) {
    let [year, month, day, hour, minute, rain] = line.split(';');
    if (!isNaN(rain) && rain !== '' && rain !== '0.00') {
        let today = buildDay(year, month,day, hour);

        if (lastRainDay !== null) {
            let range = moment.range(lastRainDay, today);
            if (range.diff('hours') > 1 && range.diff('years') === 0) {
                let season = getSeason(+month, +day);

                seasons[season].push(range.diff('hours'));
            }
        }
        lastRainDay = today;
    }
}

let durationCount = 0;
function duration(line) {
    let [year, month, day, hour, minute, rain] = line.split(';');
    if (!isNaN(rain) && rain !== '' && rain !== '0.00') {
        let today = buildDay(year, month,day, hour);

        if (lastRainDay !== null) {
            let range = moment.range(lastRainDay, today);

            if (range.diff('years') === 0) {
                if (range.diff('hours') === 1) {
                    durationCount = durationCount + 1;
                } else {
                    let season = getSeason(+month, +day);

                    seasons[season].push(durationCount + 1);
                    durationCount = 0;
                }
            }
        }
        lastRainDay = today;
    }
}


function rains(line) {
    let [year, month, day, hour, minute, rain] = line.split(';');
    if (!isNaN(rain) && rain !== '' && rain !== '0.00') {
        let season = getSeason(+month, +day);

        seasons[season].push(+rain);
    }
}

function dayWithRains(line) {
    let [year, month, day, hour, minute, rain] = line.split(';');

    if (fullDay !== `${year}/${month}/${day}`) {
        fullDay = `${year}/${month}/${day}`;
        dayRains.push(+rain);

        if (dayRains.some(dayRain => dayRain > 0)) {
            if (!isNaN(rain) && rain !== '') { // && rain !== '0.00') {
                let season = getSeason(+month, +day);
                // seasons[season].push(`${year}/${month}/${day}`);
                dayRains.forEach(dayRain => seasons[season].push(dayRain));
            }
        }

        dayRains = [];
    } else {
        dayRains.push(+rain);
    }
}

function group(line) {
    let [year, month, day, hour, minute, rain] = line.split(';');

    console.log('Line from file:', rain);

    if (!aggregate[year]) {
        aggregate[year] = {};
    }

    if (!aggregate[year][month]) {
        aggregate[year][month] = {};
    }

    if (!aggregate[year][month][day]) {
        aggregate[year][month][day] = +rain;
    } else {
        aggregate[year][month][day] = aggregate[year][month][day] + (+rain);
    }

    if (!aggregate[year][month][day][hour]) {
        aggregate[year][month][day][hour] = rain;
    }
}
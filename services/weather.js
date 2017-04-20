"use strict";

const fetch = require("node-fetch");
const moment = require("moment");

const NIGHT_TIME = "03:00";
const MORNING_TIME = "06:00";
const DAY_TIME = "15:00";
const EVENING_TIME = "21:00";

class WeatherService {

	constructor() {

	}

	async get(count) {
		let response = await fetch("http://api.openweathermap.org/data/2.5/forecast?q=Togliatti,ru&units=metric&appid=b09110cb86a171ccab617ef86ecd2071&lang=ru");
		let weather = await response.json();
		let dates = weather.list.reduce((p, c) => {
			let date = moment(c.dt * 1000, "x").format("YYYY-MM-DD");
			if (!p.includes(date)) {
				p.push(date);
			}
			return p;
		}, []);
		let result = [];
		for (let date of dates) {
			if (result.length === 2) { break; }
			let day = { date, dateLabel: moment(date, "YYYY-MM-DD").format("DD.MM.YYYY") };
			for (let l of weather.list) {
				l.image = "http://openweathermap.org/img/w/" + l.weather[0].icon + ".png";
				if (l.dt_txt.indexOf(date + " " + NIGHT_TIME) > -1) {
					day.night = l;
				} else if (l.dt_txt.indexOf(date + " " + MORNING_TIME) > -1) {
					day.morning = l;
				} else if (l.dt_txt.indexOf(date + " " + DAY_TIME) > -1) {
					day.day = l;
				} else if (l.dt_txt.indexOf(date + " " + EVENING_TIME) > -1) {
					day.evening = l;
				}
			}
			result.push(day);
		}
		return result;
	}

};

module.exports = new WeatherService();
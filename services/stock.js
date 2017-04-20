"use strict";

const fs = require("fs");
const path = require("path");
const Canvas = require("canvas");
const canvas = new Canvas(660, 340);
const ctx = canvas.getContext("2d");
const Chart = require("nchart");
const fetch = require("node-fetch");
const sanitizeHtml = require("sanitize-html");
const moment = require("moment");
const config = require("../config")

class StockService {

	constructor() {

	}

	async get(symbol) {
		let time = Math.round(moment().valueOf() / 1000);
		let from = Math.round(moment().subtract(48, "hours").valueOf() / 1000);
		let response = await fetch("http://jq.forexpf.ru/html/tw/history?symbol=" + symbol + "&resolution=60&from=" + from + "&to=" + time);

		let stock = await response.json();
		let timeLabels = stock.t.map(item => {
			return "";
		});
		let chartFilename = await this._createChart(timeLabels, stock.c);

		return {
			symbol: symbol,
			value: stock.c[stock.c.length - 1],
			datetimeLabel: moment(stock.t[stock.c.length - 1] * 1000, "x").format("DD MMM YYYY HH:mm"),
			chart: config.server.external.uri + "/files/" + chartFilename,
			link: "http://www.forexpf.ru/" + symbol.toLowerCase() + "/"
		};
	}

	_createChart(labels, values) {
		return new Promise((resolve, reject) => {
			new Chart(ctx).Line(
				{
					labels: labels,
					datasets: [
						{
							fillColor: "rgba(0,0,220,0.2)",
							strokeColor: "rgba(0,0,220,0.8)",
							pointColor: "rgba(0,0,220,1)",
							pointStrokeColor: "#fff",
							pointHighlightFill: "#fff",
							pointHighlightStroke: "rgba(220,220,220,1)",
							data: values
						}
					]
				}
			);

			canvas.toBuffer((err, buf) => {
				if (err) { return reject(err); }
				let filename = "chart-" + moment().valueOf() + ".png";
				fs.writeFile(path.join(config.filesStore, filename), buf, (err) => {
					resolve(filename);
				});
			});
		});
	};

};

module.exports = new StockService();
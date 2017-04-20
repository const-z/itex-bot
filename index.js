"use strict";

const restify = require("restify");
const builder = require("botbuilder");
const config = require("./config");
const fetch = require("node-fetch");
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const sanitizeHtml = require('sanitize-html');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
const server = restify.createServer();
server.listen(config.server.port, "localhost", () => {
	console.log("%s listening to %s", server.name, server.url);
});

// Create chat bot
const connector = new builder.ChatConnector({
	appId: config.bot.appId,
	appPassword: config.bot.appPassword
});
server.post("/", connector.listen());
server.get("/files/:filename", (request, response) => {
	fs.readFile(path.join(config.filesStore, request.params.filename), (err, data) => {
		if (err) {
			return response.send(404);
		}
		response.write(data);
		response.end();
	});
});

//=========================================================

const bot = new builder.UniversalBot(connector);

//=========================================================

bot.on("receive", (message) => {
	null;
});

bot.on("conversationUpdate", (message) => {
	// bot.beginDialog(message.address, "greetings");
	//deleteUser(message.address);
});

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog("/", [
	session => {
		session.beginDialog("menu");
	}
]);

bot.dialog("menu", [
	session => {
		builder.Prompts.choice(session, "", ["Курс валюты", "Погода", "Анекдот"], { listStyle: builder.ListStyle.button });
	},
	(session, results) => {
		switch (results.response.index) {
			case 0:
				session.beginDialog("stock");
				break;
			case 1:
				session.beginDialog("weather");
				break;
			case 2:
				session.beginDialog("joke");
				break;
			default:
				session.endDialog();
				break;
		}
	},
	session => {
		session.replaceDialog("menu");
	}
]).reloadAction("showMenu", null, { matches: /^(menu|back)/i });

bot.dialog("stock", [
	session => {
		builder.Prompts.choice(session, "", ["USDRUB", "EURRUB"], { listStyle: builder.ListStyle.button });
	},
	async (session, results) => {
		session.sendTyping();
		let symbol = "";
		switch (results.response.index) {
			case 0:
				symbol = "USDRUB";
				break;
			case 1:
				symbol = "EURRUB";
				break;
			default:
				symbol = "USDRUB";
				break;
		}
		let time = Math.round(moment().valueOf() / 1000);
		let from = Math.round(moment().subtract(48, "hours").valueOf() / 1000);
		let response = await fetch("http://jq.forexpf.ru/html/tw/history?symbol=" + symbol + "&resolution=60&from=" + from + "&to=" + time);

		let stock = await response.json();
		let timeLabels = stock.t.map(item => {
			return moment(item * 1000, "x").format("HH DD:MM");
		});
		let chartFilename = await createChart(timeLabels, stock.c);
		let msg = new builder.Message(session)
			.attachments([
				new builder.HeroCard(session)
					.title(symbol + " → " + stock.c[stock.c.length - 1])
					.subtitle(moment(stock.t[stock.c.length - 1] * 1000, "x").format("DD MMM YYYY HH:mm"))
					.images([
						builder.CardImage.create(session, config.server.external.uri + "/files/" + chartFilename)//"http://j1.forexpf.ru/delta/prochart?type=" + symbol + "&amount=100&chart_height=340&chart_width=660&grtype=2&tictype=4&m_action=zoom_all")
					])
					.tap(builder.CardAction.openUrl(session, "http://www.forexpf.ru/" + symbol.toLowerCase() + "/"))
			]);
		session.endDialog(msg);
	}
]).triggerAction({ matches: /stock/i });

bot.dialog("weather", [
	async (session, results) => {
		session.sendTyping();
		let time = Math.round(moment().valueOf() / 1000);
		let response = await fetch("http://api.openweathermap.org/data/2.5/forecast?q=Togliatti,ru&units=metric&appid=b09110cb86a171ccab617ef86ecd2071&lang=ru");
		let weather = await response.json();

		const createTempLine = (list, date, time, label) => {
			let data;
			for (let l of list) {
				if (l.dt_txt.indexOf(date + " " + time) > -1) {
					data = l;
					break;
				}
			}
			if (!data) { return; }
			return builder.ReceiptItem
				.create(session, (data.main.temp < 0 ? "" : "+") + data.main.temp + " °C", label)
				.subtitle(data.weather[0].description)
				.image(builder.CardImage.create(session, "http://openweathermap.org/img/w/" + data.weather[0].icon + ".png"));
		};

		let cards = [];
		let dates = weather.list.reduce((p, c) => {
			let date = moment(c.dt * 1000, "x").format("YYYY-MM-DD");
			if (!p.includes(date)) {
				p.push(date);
			}
			return p;
		}, []);
		for (let date of dates) {
			let items = [
				createTempLine(weather.list, date, "03:00", "Ночь"),
				createTempLine(weather.list, date, "06:00", "Утро"),
				createTempLine(weather.list, date, "15:00", "День"),
				createTempLine(weather.list, date, "21:00", "Вечер")
			].filter(item => !!item);
			if (!items.length) { break; }
			let card = new builder.ReceiptCard(session)
				.title(moment(date, "YYYY-MM-DD").format("DD.MM.YYYY"))
				.items(items);
			cards.push(card);
		}

		let msg = new builder.Message(session)
			.attachmentLayout(builder.AttachmentLayout.carousel)
			.attachments(cards);

		session.endDialog(msg);
	}
]).triggerAction({ matches: /weather/i });

bot.dialog("joke", [
	async (session, results) => {
		session.sendTyping();

		let response = await fetch("http://www.umori.li/api/get?site=bash.im&name=bash&num=1");
		let jokes = await response.json();
		let joke = jokes[0];

		let card = new builder.HeroCard(session)
			// .title('BotFramework Hero Card')
			.subtitle(joke.site + " - " + joke.desc)
			.text(sanitizeHtml(joke.elementPureHtml, {
				allowedTags: [],
				allowedAttributes: {}
			}));

		let msg = new builder.Message(session)
			.textFormat(builder.TextFormat.xml)
			.attachments([card]);

		session.endDialog(msg);
	}
]).triggerAction({ matches: /joke/i });



const createChart = (labels, values) => {
	return new Promise((resolve, reject) => {
		const Canvas = require("canvas");
		const canvas = new Canvas(660, 340);
		const ctx = canvas.getContext("2d");
		const Chart = require("nchart");
		const fs = require("fs");

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

//createChart();
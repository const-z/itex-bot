"use strict";

const restify = require("restify");
const builder = require("botbuilder");
const config = require("./config");
const fetch = require("node-fetch");
const moment = require("moment");

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
server.post('/', connector.listen());

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
		let response = await fetch("http://jq.forexpf.ru/html/tw/history?symbol=" + symbol + "&resolution=1&from=" + time + "&to=" + time);
		let stock = await response.json();
		let msg = new builder.Message(session)
			.attachments([
				new builder.HeroCard(session)
					.title(symbol + " -> " + stock.c[0])
					.subtitle(moment(stock.t[0] * 1000, "x").format("DD MMM YYYY HH:mm"))
					//.text("#" +  + "")
					.images([
						builder.CardImage.create(session, "http://j1.forexpf.ru/delta/prochart?type=" + symbol + "&amount=100&chart_height=340&chart_width=660&grtype=2&tictype=3&m_action=zoom_all")
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

		let cards = [];
		for (let i = 0; i < weather.list.length; i += 8) {
			let wnight = weather.list[i];
			let wmorning = weather.list[i + 2];
			let wday = weather.list[i + 5];
			let wevening = weather.list[i + 7];
			let card = new builder.ReceiptCard(session)
				.title(moment(wnight.dt * 1000, "x").format("DD.MM.YYYY"))
				.items([
					builder.ReceiptItem.create(session, (wnight.main.temp < 0 ? "" : "+") + wnight.main.temp + " °C", 'Ночь')
						.subtitle(wnight.weather[0].description)
						.image(builder.CardImage.create(session, "http://openweathermap.org/img/w/" + wnight.weather[0].icon + ".png")),
					builder.ReceiptItem.create(session, (wmorning.main.temp < 0 ? "" : "+") + wmorning.main.temp + " °C", 'Утро')
						.subtitle(wmorning.weather[0].description)
						.image(builder.CardImage.create(session, "http://openweathermap.org/img/w/" + wmorning.weather[0].icon + ".png")),
					builder.ReceiptItem.create(session, (wday.main.temp < 0 ? "" : "+") + wday.main.temp + " °C", 'День')
						.subtitle(wday.weather[0].description)
						.image(builder.CardImage.create(session, "http://openweathermap.org/img/w/" + wday.weather[0].icon + ".png")),
					builder.ReceiptItem.create(session, (wevening.main.temp < 0 ? "" : "+") + wevening.main.temp + " °C", 'Вечер')
						.subtitle(wevening.weather[0].description)
						.image(builder.CardImage.create(session, "http://openweathermap.org/img/w/" + wevening.weather[0].icon + ".png")),

				]);
			cards.push(card);
		}

		let msg = new builder.Message(session)
			.attachmentLayout(builder.AttachmentLayout.carousel)
			.attachments(cards);

		session.endDialog(msg);
	}
]).triggerAction({ matches: /weather/i });
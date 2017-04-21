"use strict";

const restify = require("restify");
const builder = require("botbuilder");
const fs = require("fs");
const path = require("path");
const WeatherService = require("./services/weather");
const JokeService = require("./services/joke");
const StockService = require("./services/stock");
const config = require("./config");

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
		if (request.params.filename.indexOf(".png") > -1) {
			response.setHeader("content-type", "image/png");
		}
		response.write(data);
		response.end();
	});
});

//=========================================================

const bot = new builder.UniversalBot(connector);

//=========================================================

bot.on("receive", (message) => {
	console.log(JSON.stringify(message));
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
		let st = await StockService.get(symbol);
		let msg = new builder.Message(session)
			.attachments([
				new builder.HeroCard(session)
					.title(st.symbol + " → " + st.value)
					.subtitle(st.datetimeLabel)
					.images([
						builder.CardImage.create(session, st.chart)
					])
					.tap(builder.CardAction.openUrl(session, st.link))
			]);
		session.endDialog(msg);
	}
]).triggerAction({ matches: /stock/i });

bot.dialog("weather", [
	async (session, results) => {
		session.sendTyping();
		let weathers = await WeatherService.get(2);
		let cards = [];
		for (let weather of weathers) {
			let w = weather.day || weather.evening;
			let card = new builder.ThumbnailCard(session)
				.title((w.main.temp < 0 ? "" : "+") + w.main.temp + " °C")
				.subtitle(weather.dateLabel)
				.text(w.weather[0].description)
				.images([
					builder.CardImage.create(session, w.image)
				]);
			cards.push(card);
		}
		let msg = new builder.Message(session).attachments(cards);
		session.endDialog(msg);
	}
]).triggerAction({ matches: /weather/i });

bot.dialog("joke", [
	async (session, results) => {
		session.sendTyping();
		let msg = await JokeService.get();
		session.send(msg).endDialog();
	}
]).triggerAction({ matches: /joke/i });
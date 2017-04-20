"use strict";

const fetch = require("node-fetch");
const sanitizeHtml = require("sanitize-html");

class JokeService {

	constructor() {
		this.sites = [
			{
				"site": "anekdot.ru",
				"name": "new anekdot"
			},
			{
				"site": "bash.im",
				"name": "bash"
			}
		];
		this.collection = [];
	}

	async get() {
		if (this.collection.length === 0) {
			for (let site of this.sites) {
				let response = await fetch("http://www.umori.li/api/get?site=" + site.site + "&name=" + site.name + "&num=100");
				this.collection = this.collection.concat(await response.json());
			}
		}
		let joke = this.collection.pop();
		let msg = sanitizeHtml(joke.elementPureHtml, { allowedTags: [], allowedAttributes: {} }) + "\n\n*" + joke.site + " - " + joke.desc + "* :)";
		return msg;
	}

};

module.exports = new JokeService();
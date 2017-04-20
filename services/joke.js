"use strict";

const fetch = require("node-fetch");
const sanitizeHtml = require("sanitize-html");

class JokeService {

	constructor() {
		this.collection = [];
	}

	async get() {
		if (this.collection.length === 0) {
			let response = await fetch("http://www.umori.li/api/random?num=100");
			// let response = await fetch("http://www.umori.li/api/get?site=bash.im&name=bash&num=100");
			this.collection = await response.json();
		}
		let joke = this.collection.pop();
		let msg = sanitizeHtml(joke.elementPureHtml, { allowedTags: [], allowedAttributes: {} }) + "\n\n*" + joke.site + " - " + joke.desc + "* :)";
		return msg;
	}

};

module.exports = new JokeService();
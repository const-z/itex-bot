"use strict";

let config = null;

try {
	config = require("./config-custom");
} catch (err) {
	null;
}

if (!config) {
	config = {
		bot: {
			appId: "",
			appPassword: ""
		},
		server: {
			port: 3978,
			external: {
				uri: "http://localhost:3978"
			}
		},
		filesStore: "./.etc/files"
	}
}

module.exports = config;
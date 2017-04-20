"use strict";

let config = null;

try {
	config = require("./config-custom");
} catch (err) {
	null;
}

if (!config) {
	config = {
		bot:{
			appId: "",
			appPassword: ""
		},
		server: {
			port: 3978
		}
	}
}

module.exports = config;
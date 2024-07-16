"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// sample.ts
require("dotenv/config");
var index_d_1 = require("../dist/index.d");
var openai_1 = require("openai");
var t = require("io-ts");
var openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || ''
});
var tool = {
    name: 'Echo',
    description: 'Echoes back the input',
    parameters: t.type({
        message: t.string
    })
};
var tools = [tool];
var prompt = "Please echo back the following message: 'Hello, world!'";
(0, index_d_1.queryAi)(openai, prompt, tools)
    .then(function (result) {
    console.log("Tool called:", result.tool.name);
    console.log("Parameters:", result.parameters);
})
    .catch(function (err) {
    console.error("Error:", err);
});


'use strict';

var Redis = require('ioredis');
var Realm = require('realm');
const express = require('express');
const app = express();

// Realm schema for Process list
const ProcessSchema = {
  name: 'Process',
  primaryKey: 'hash',
  properties: {
  	hash: 'string',
    name:  'string',
    pid: 'int',
    type: 'string',
    start_time: 'date',
    end_time: {type:'date', optional:true},
    logs: {type: 'data', optional: true},
    payload: {type: 'string', optional:true}
  }
};

let realm = new Realm({schema: [ProcessSchema]});

let redis = new Redis();

redis.subscribe('process_stats', 'command_stats', 'job_stats', function(err, count){
	console.log('Subscribed to all 3 channels');
});

redis.on('message', function(channel, message) {

	var data = JSON.parse(message);

	// console.log('Message: '+data.hash+' Channel: '+channel);

	var modelData = {};
	modelData.hash = data.hash;
	modelData.name = data.name;
	modelData.pid = data.pid;
	modelData.type = data.type;
	if(data.start_time && data.start_time != null) {
		modelData.start_time = new Date(Date.parse(data.start_time));
	}
	if(data.end_time && data.end_time != null) {
		modelData.end_time = new Date(Date.parse(data.end_time));
	}
	if(data.payload && data.payload != null) {
		modelData.payload = data.payload;
	}

	realm.write(() => {
		realm.create('Process', modelData, true);
	});

});

app.get('/', function (req, res) {

	let processes = realm.objects('Process');
	var arr = Object.keys(processes).map(function(k) { return processes[k] });
  	res.json(arr);
});

app.use('/stats', express.static('public'));

app.listen(3300, function () {
  	console.log('Task Monitor listening on port 3300!');
});
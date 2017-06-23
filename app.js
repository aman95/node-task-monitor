
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
    isCompleted: {type: 'bool', default: false},
    entry_time: {type: 'date', optional:true},
    start_time: 'date',
    end_time: {type:'date', optional:true},
    // execution_time: {type: 'int', optional:true},
    // wait_time: {type: 'int', optional:true},
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

	console.log('Message: '+data.hash+' Channel: '+channel);

	var modelData = {};
	modelData.hash = data.hash;
	modelData.name = data.name;
	modelData.pid = data.pid;
	modelData.type = data.type;

	if(data.entry_time && data.entry_time != null) {
		modelData.start_time = new Date(Date.parse(data.entry_time));
		modelData.entry_time = new Date(Date.parse(data.entry_time));
	}

	if(data.start_time && data.start_time != null) {
		modelData.start_time = new Date(Date.parse(data.start_time));
	}
	if(data.end_time && data.end_time != null) {
		modelData.end_time = new Date(Date.parse(data.end_time));
		modelData.isCompleted = true;
	}
	if(data.payload && data.payload != null) {
		modelData.payload = data.payload;
	}

	realm.write(() => {
		realm.create('Process', modelData, true);
	});

});

app.get('/api/v1/stats/:name', function (req, res) {

	let processes = realm.objects('Process');
	// console.log(req.params.name);
	var data = processes.filtered('name = "'+req.params.name+'"');
	// data = processes;
	var arr = Object.keys(data).map(function(k) { return data[k] });
  	res.json(arr);
});

app.use('/', express.static('public'));

app.listen(3300, function () {
  	console.log('Task Monitor listening on port 3300!');
});
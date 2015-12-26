var USER_SPEED = "slow";
var millisPerTick = 750;

var NUM_PRODUCERS = 6;
var NUM_PROCESSORS = 4;

var width = 1000,
	height = 800,
	padding = 1,
	maxRadius = 3,
	radius = 5,
	globalSeqNum = 0;
// color = d3.scale.category10();
var doneProgressI = d3.interpolate(1, 0);
var PRODUCER_COLORS = [
	"#e0d400",
	"#1c8af9",
	"#51BC05",
	"#FF7F00",
	"#DB32A4",
	"#00CDF8",
	"#E63B60",
	"#8E5649",
	"#68c99e",
	"#a477c8",
	"#5C76EC",

];

var producers = [];
var processors = [];
var speeds = {
	"slow": 1000,
	"medium": 200,
	"fast": 50
};

// Activity to put in center of circle arrangement
// var center_pt = {
// 	"x": 380,
// 	"y": 365
// };

var inFlightMessages = [];
var queuedMessages = [];
var inProcessingMessages = [];
var postProcessingMessages = [];

var sendTick = function (tick, producer) {
	if (!producer.nextMessageAt || producer.nextMessageAt === tick) {
		//Need to see if we should send a message now
		if (producer.numInFlight < producer.maxInFlight) {
			//We are go to send
			if (!producer.sentMsgs) {
				producer.sentMsgs = 0;
			}
			producer.sentMsgs++;
			var msg = {
				msgId: globalSeqNum++,
				sender: producer,
				sendTime: tick,
				color: PRODUCER_COLORS[producer.index]
			};
			inFlightMessages.push(msg);
			queuedMessages.push(msg);
			producer.nextMessageAt += producer.ticksBtwMessages;
			producer.delay = 0;
			producer.numInFlight++;
		} else {
			//We cant send a mesage now
			producer.nextMessageAt++;
			producer.delay++;
		}
	}
};

var acceptTick = function (tick, processor) {
	sendMsg = false;
	if (processor.currentMessage) {
		var msg = processor.currentMessage;
		if (msg.processStartTick + processor.serviceTimeTicks == tick) {
			//We're done here.
			msg.processEndTick = tick;
			msg.sender.numInFlight--;
			postProcessingMessages.push(msg);
			inProcessingMessages.shift();
			sendMsg = true;
		}
	}
	if (sendMsg) {
		processor.progressMeter.transition().duration(millisPerTick)
			.tween("progress", function () {
				return function (t) {
					processor.progressMeter.attr("d", proc.processorArc.endAngle(2 * Math.PI * -doneProgressI(t)));
				};
			});
		delete processor.currentMessage;
	}

	if ((!processor.currentMessage || sendMsg) && queuedMessages.length > 0) {
		//We are emtpy, need to pull from the queue
		var msg = queuedMessages.shift();
		inProcessingMessages.push(msg);
		msg.processStartTick = tick;
		msg.processor = processor;
		processor.currentMessage = msg;
		processor.doneWork = true;
	}


};

var updateInFlightPositions = function () {

	postProcessingMessages.forEach(function (msg, i) {
		msg.x = msg.sender.x + (producerDefaults.width / 2) + messageSize;
		msg.y = msg.sender.y + producerDefaults.height;
		msg.r = messageSize / 2;
	});
	inProcessingMessages.forEach(function (msg) {
		proc = msg.processor;
		msg.x = proc.x + (padding.processorInnerPadding / 2) + largeMessageSize / 2;
		msg.y = proc.y + processorLoc.height / 2;
		msg.r = largeMessageSize / 2;

	});

	queuedMessages.forEach(function (msg, i) {
		msg.x = (queue.x + queue.width) - ((i + 1) * (padding.x + messageSize));
		msg.y = queue.y + queue.height / 2;
		msg.r = messageSize / 2;
	});
};

var updateD3 = function () {

	plottedMsgs = messageGroup.selectAll("circle")
		.data(inFlightMessages, function (d) {
			return d.msgId;
		});
	plottedMsgs.transition()
		.attr("cx", function (d) {
			return d.x;
		})
		.attr("cy", function (d) {
			return d.y;
		}).attr("r", function (d) {
			return d.r;
		}).duration(millisPerTick);

	plottedMsgs.enter()
		.append("circle")
		.attr("r", radius)
		.attr("fill-opacity", 1)
		.attr("stroke-width", 1)
		.style("fill", function (d) {
			return d.color;
		})
		.style("stroke", function (d) {
			return "d.color";
		})
		.attr("cx", function (d) {
			return d.sender.x + (producerDefaults.width / 2);
		})
		.attr("cy", function (d) {
			return d.sender.y + producerDefaults.height;
		}).transition()
		.duration(millisPerTick)
		.ease('linear')
		//Move to the start of the queue
		.attr("cx", function (d, i) {
			return queue.x - messageSize;
		})
		.attr("cy", function (d) {
			return d.y;
			//Move to the right position in the queue
		}).each("end", function () { // as seen above

			d3.select(this). // this is the object
			transition().duration(millisPerTick).ease('linear') // a new transition!
				.attr("cx", function (d) {
					return d.x;
				})
				.attr("cy", function (d) {
					return d.y;
				}).attr("r", function (d) {
					return d.r;
				});
			// .each("end" construct here.
		});
	plottedMsgs.exit().transition().duration(400).style("opacity", 0).remove();
};

var handleTick = function (tick) {
	//console.log("Handling tick " + tick)
	producers.forEach(function (producer, i) {
		sendTick(tick, producer);
	});

	//Do processing work for current tick and update the progress bar,
	//the		if (proc.currentMessage) {n accept a new message into the proc if we can
	processors.forEach(function (proc, i) {
		proc.progressMeter.attr('fill', function () {
			if (proc.currentMessage) {
				return proc.currentMessage.color;
			} else {
				return "white";
			}
		});

		if (proc.currentMessage) {
			var msg = proc.currentMessage;
			proc.progressMeter.transition()
				.tween("progress", function () {
					var work = proc.serviceTimeTicks;
					var startTime = msg.processStartTick;
					var left = ((tick - startTime)) / work;
					var oldLeft = ((tick - startTime - 1)) / work;
					if (left === 0) {
						//edge case
						oldLeft = (work - 1) / work;
						left = 1;
					}
					var i = d3.interpolate(oldLeft, left);
					return function (t) {
						progress = i(t);
						proc.progressMeter.attr("d", proc.processorArc.endAngle(2 * Math.PI * progress));
						//text.text(formatPercent(progress));
					};
				});
		}

		//Accept new message into proc
		acceptTick(tick, proc);
	});

	//Expire returned message
	var expire = tick - 2;
	for (var j = inFlightMessages.length - 1; j >= 0; j--) {
		if (inFlightMessages[j].processEndTick && inFlightMessages[j].processEndTick === expire) {
			inFlightMessages.splice(j, 1);
		}
	}
	for (var j = postProcessingMessages.length - 1; j >= 0; j--) {
		if (postProcessingMessages[j].processEndTick && postProcessingMessages[j].processEndTick === expire) {
			postProcessingMessages.splice(j, 1);

		}
	}

	updateInFlightPositions();
	updateD3();
};

// Start the SVG
var svg = d3.select("#chart").append("svg")
	.attr("width", width)
	.attr("height", height);

var processorGroup = svg.append('g').attr('id', 'processorGroup');
var producerGroup = svg.append('g').attr('id', 'producerGroup');
var messageGroup = svg.append('g').attr('id', 'messageGroup');

var messageSize = radius * 2;
var largeMessageSize = radius * 6 * 2;
var maxQueue = 40 - (radius);
var padding = {
	x: 10,
	y: 10,
	processorInnerPadding: 40,
	processorOuterPadding: 50,
	producerPadding: 40
};

var processorLoc = {
	x: width / 2 - (radius),
	y: height / 2,
	height: largeMessageSize + padding.processorInnerPadding,
	width: largeMessageSize + padding.processorInnerPadding
};
var qWidth = (messageSize + padding.x) * maxQueue;
var queue = {
	x: 2 * messageSize,
	y: processorLoc.y + 200,
	height: messageSize + padding.y,
	width: qWidth
};

var producerDefaults = {
	width: 100,
	height: 50
};

var addProcessor = function () {
	var num = processors.length + 1;
	processors.push({
		"name": "Processor " + num,
		"serviceTimeTicks": 7
	});
	processorLoc.x = (width / 2) - (processorLoc.width * processors.length / 2);
	processors.forEach(function (proc, i) {
		proc.x = processorLoc.x + (i * (processorLoc.width + padding.processorOuterPadding));
		proc.y = processorLoc.y;
	});

	//processor
	var rects = processorGroup.selectAll(".procs")
		.data(processors, function (proc) {
			return proc.name;
		});
	//On new processor creation
	rects.enter().append("rect")
		.attr("class", "procs")
		.attr("width", processorLoc.width)
		.attr("height", processorLoc.height)
		.attr("fill", "#F9F9F9")
		.attr("stroke", "#CCC")
		.attr("stroke-width", 1)
		.each(function (proc) {
			proc.processorArc = d3.svg.arc()
				.startAngle(0)
				.innerRadius(largeMessageSize / 2 - 2) //Some padding to avoid very small gap
				.outerRadius(largeMessageSize / 2 + 10);

			proc.progressMeter = svg.append("path")
				.attr("transform", "translate(" + (proc.x + largeMessageSize / 2 + padding.processorInnerPadding / 2) +
					", " + (proc.y + largeMessageSize / 2 + padding.processorInnerPadding / 2) + ")")
				.attr("opacity", 0.66);
		});

	rects.attr("x", function (proc) {
			return proc.x;
		})
		.attr("y", function (proc) {
			return proc.y;
		})
		.each(function (proc) {
			proc.progressMeter.transition()
				.attr("transform", "translate(" + (proc.x + largeMessageSize / 2 + padding.processorInnerPadding / 2) +
					", " + (proc.y + largeMessageSize / 2 + padding.processorInnerPadding / 2) + ")");
		});


};
for (i = 0; i < NUM_PROCESSORS; i++) {
	addProcessor();
}

//queue
processorGroup.append("rect")
	.attr("width", queue.width)
	.attr("height", queue.height)
	.attr("x", queue.x)
	.attr("fill", "#F9F9F9")
	.attr("stroke", "#CCC")
	.attr("stroke-width", 1)
	.attr("y", queue.y);

var addActor = function () {
	var num = producers.length;
	producers.push({
		"index": num,
		"name": "Actor " + (num + 1),
		"numInFlight": 0,
		"ticksBtwMessages": 3,
		"maxInFlight": 4
	});

	var theta = producers.length > 1 ? -1 * Math.PI / (2 * (producers.length - 1)) : 0;

	producers.forEach(function (producer, i) {
		producer.x = 500 * Math.cos(i * theta - Math.PI / 4) + 500;
		producer.y = 500 * Math.sin(i * theta - Math.PI / 4) + 500;
	});
	acts = producerGroup.selectAll(".producers")
		.data(producers, function (d) {
			return d.index;
		});
	//On new producer creation
	acts.enter()
		.append("rect")
		.attr("class", "producers")
		.attr("width", producerDefaults.width)
		.attr("height", producerDefaults.height)
		.attr("rx", 3)
		.attr("ry", 3)
		.attr("fill", function (d) {
			return PRODUCER_COLORS[d.index];
		}) //"#F9F9F9")
		.attr("fill-opacity", 0.2)
		.attr("stroke", function (d) {
			return PRODUCER_COLORS[d.index];
		}).attr("stroke-opacity", 0.75) //"#CCC")
		.attr("stroke-width", 3);

	acts.transition().attr("y", function (d) {
		return (d.y);
	}).attr("x", function (d) {
		return (d.x);
	});
};

for (i = 0; i < NUM_PRODUCERS; i++) {
	addActor();
}


var curTick = 0;
setInterval(function () {
	handleTick(curTick++);
}, millisPerTick);


setTimeout(function () {
	addActor();
}, 5000);

setTimeout(function () {
	addActor();
}, 10000);

setTimeout(function () {
	addProcessor();
}, 5000);
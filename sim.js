var USER_SPEED = "slow";
var millisPerTick = 750;
var width = 1000,
	height = 800,
	padding = 1,
	maxRadius = 3,
	radius = 5,
	globalSeqNum = 0;
// color = d3.scale.category10();

var actorColors = [
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


var actors = [{
	"index": 0,
	"short": "Actor 1",
	"numInFlight": 0,
	"ticksBtwMessages": 3,
	"maxInFlight": 4,
	"nextMessageAt": 0,
}, {
	"index": "1",
	"short": "Actor 2",
	"numInFlight": 0,
	"ticksBtwMessages": 5,
	"maxInFlight": 4,
	"nextMessageAt": 0,
}, {
	"index": "2",
	"short": "Actor 3",
	"numInFlight": 0,
	"ticksBtwMessages": 3,
	"maxInFlight": 4,
	"nextMessageAt": 0,
}, {
	"index": "3",
	"short": "Actor 4",
	"numInFlight": 0,
	"ticksBtwMessages": 7,
	"maxInFlight": 100,
	"nextMessageAt": 0,
}, {
	"index": "4",
	"short": "Actor 5",
	"numInFlight": 0,
	"ticksBtwMessages": 2,
	"maxInFlight": 100,
	"nextMessageAt": 0,
}];

var processors = [{
	"name": "Processor 1",
	"serviceTimeTicks": 2,
	"doneWithCurrentMessage": true
}, {
	"name": "Processor 2",
	"serviceTimeTicks": 2,
	"doneWithCurrentMessage": true
}, {
	"name": "Processor 3",
	"serviceTimeTicks": 2,
	"doneWithCurrentMessage": true
}, ];


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

var sendTick = function (tick, agent) {
	if (agent.nextMessageAt === tick) {
		//Need to see if we should send a message now
		if (agent.numInFlight < agent.maxInFlight) {
			//We are go to send
			if (!agent.sentMsgs) {
				agent.sentMsgs = 0;
			}
			agent.sentMsgs++;
			var msg = {
				msgId: globalSeqNum++,
				sender: agent,
				sendTime: tick,
			}
			inFlightMessages.push(msg)
			queuedMessages.push(msg)
			agent.nextMessageAt += agent.ticksBtwMessages;
			agent.delay = 0;
			agent.numInFlight++;
		} else {
			//We cant send a mesage now
			agent.nextMessageAt++;
			agent.delay++;
		}
	}
}

var processTick = function (tick, processor) {
	if (processor.currentMessage && !processor.doneWithCurrentMessage) {
		var msg = processor.currentMessage;
		if (msg.processStartTick + processor.serviceTimeTicks == tick) {
			//We're done here.
			msg.processEndTick = tick;
			msg.sender.numInFlight--;
			postProcessingMessages.push(msg)
			inProcessingMessages.shift()
			processor.doneWithCurrentMessage = true;
		}
	}
}

var acceptTick = function (tick, processor) {
	if (processor.doneWithCurrentMessage) {
		//We are emtpy, need to pull from the queue
		var msg = queuedMessages.shift();
		inProcessingMessages.push(msg)
		msg.processStartTick = tick;
		msg.processor = processor;
		processor.currentMessage = msg
		processor.doneWithCurrentMessage = false;
	}
}

var updateInFlightPositions = function (tick) {
	inFlightMessages.forEach(function (msg) {
		msg.color = actorColors[msg.sender.index];
	})

	postProcessingMessages.forEach(function (msg, i) {
		msg.x = msg.sender.x + (actorDefaults.width / 2) + messageSize;
		msg.y = msg.sender.y + actorDefaults.height;
		msg.r = messageSize / 2;
	})
	inProcessingMessages.forEach(function (msg) {
		proc = msg.processor;
		msg.x = proc.x + (padding.processorInnerPadding / 2) + largeMessageSize / 2
		msg.y = proc.y + processorLoc.height / 2;
		msg.r = largeMessageSize / 2;

	})
	queuedMessages.forEach(function (msg, i) {
		msg.x = (queue.x + queue.width) - ((i + 1) * (padding.x + messageSize))
		msg.y = queue.y + queue.height / 2;
		msg.r = messageSize / 2;
	})
};

var updateD3 = function (tick) {

	plottedMsgs = svg.selectAll("circle")
		.data(inFlightMessages, function (d) {
			return d.msgId;
		})
	plottedMsgs.transition()
		.attr("cx", function (d) {
			return d.x;
		})
		.attr("cy", function (d) {
			return d.y;
		}).attr("r", function (d) {
			return d.r;
		}).duration(millisPerTick)

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
			return d.sender.x + (actorDefaults.width / 2);
		})
		.attr("cy", function (d) {
			return d.sender.y + actorDefaults.height;
		}).transition().duration(millisPerTick).ease('linear')
		.attr("cx", function (d, i) {
			return queue.x - messageSize
		})
		.attr("cy", function (d) {
			return d.y
		}).each("end", function () { // as seen above

			d3.select(this). // this is the object
			transition().duration(millisPerTick).ease('linear') // a new transition!
				.attr("cx", function (d) {
					return d.x
				})
				.attr("cy", function (d) {
					return d.y
				})
				// .each("end" construct here.
		});
	plottedMsgs.exit().transition().duration(400).style("opacity", 0).remove();
}

var handleTick = function (tick) {
	//console.log("Handling tick " + tick)
	actors.forEach(function (actor, i) {
		sendTick(tick, actor)
	});

	//Do processing work for current tick and update the progress bar,
	//then accept a new message into the proc if we can
	processors.forEach(function (proc, i) {
		processTick(tick, proc);
		console.log(proc)
		proc.progressMeter.attr('fill', function () {
			if (proc.currentMessage) {
				return proc.currentMessage.color
			} else {
				return "white"
			}
		})
		proc.progressMeter.transition()
			.tween("progress", function () {
				var work = proc.serviceTimeTicks
				var startTime = proc.currentMessage.processStartTick;
				var left = ((tick - startTime)) / work;
				var oldLeft = ((tick - startTime - 1)) / work;
				if (left == 0) {
					//edge case
					oldLeft = (work - 1) / work;
					left = 1
				}
				var i = d3.interpolate(oldLeft, left);
				return function (t) {
					progress = i(t);
					proc.progressMeter.attr("d", proc.processorArc.endAngle(2 * Math.PI * progress));
					//text.text(formatPercent(progress));
				};
			});

		if (proc.doneWithCurrentMessage) {
			//Swing the progress bar back around
			proc.progressMeter.transition().duration(millisPerTick)
				.tween("progress", function () {
					return function (t) {
						proc.progressMeter.attr("d", proc.processorArc.endAngle(2 * Math.PI * -doneProgressI(t)));
					};
				});
		}

		//Accept new message into proc
		acceptTick(tick, proc);
	})

	//Expire returned message
	$.each(inFlightMessages, function (j) {
		if (inFlightMessages[j].processEndTick === tick - 3) {
			inFlightMessages.splice(j, 1);
			return false
		}
	});

	updateInFlightPositions(tick);
	updateD3(tick);
}

// Start the SVG
var svg = d3.select("#chart").append("svg")
	.attr("width", width)
	.attr("height", height);

var messageSize = radius * 2;
var largeMessageSize = radius * 6 * 2;
var maxQueue = 40 - (radius);
var padding = {
	x: 10,
	y: 10,
	processorInnerPadding: 40,
	processorOuterPadding: 50,
	actorPadding: 40
}

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

var actorDefaults = {
	width: 100,
	height: 50
}




var doneProgressI = d3.interpolate(1, 0);

var prepareProcessor = function (proc, i) {
	proc.x = processorLoc.x + (i * (processorLoc.width + padding.processorOuterPadding));
	proc.y = processorLoc.y

}
processors.forEach(prepareProcessor);

//processor
svg.selectAll("#procs")
	.data(processors, function (proc) {
		return proc.name;
	})
	.enter().append("rect")
	.attr("width", processorLoc.width)
	.attr("height", processorLoc.height)
	.attr("x", function (proc) {
		return proc.x
	})
	.attr("y", function (proc) {
		return proc.y
	})
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




//queue
svg.append("rect")
	.attr("width", queue.width)
	.attr("height", queue.height)
	.attr("x", queue.x)
	.attr("fill", "#F9F9F9")
	.attr("stroke", "#CCC")
	.attr("stroke-width", 1)
	.attr("y", queue.y);


var theta = -1 * Math.PI / (2 * (actors.length - 1));

var prepareActors = function (actor, i) {
	actor.x = 500 * Math.cos(i * theta - Math.PI / 4) + 500;
	actor.y = 500 * Math.sin(i * theta - Math.PI / 4) + 500;
}
actors.forEach(prepareActors);

svg.selectAll("#actors")
	.data(actors, function (d) {
		return d.index;
	})
	.enter()
	.append("rect")
	.attr("width", actorDefaults.width)
	.attr("height", actorDefaults.height)
	.attr("x", function (d) {
		return (d.x)
	})
	.attr("fill", "#F9F9F9")
	.attr("stroke", "#CCC")
	.attr("stroke-width", 1)
	.attr("y", function (d) {
		return (d.y)
	});

var curTick = 0;
setInterval(function () {
	handleTick(curTick++);
}, millisPerTick)
var USER_SPEED = "slow";

var width = 1200,
	height = 800,
	padding = 1,
	maxRadius = 3;
radius = 5;
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

var sched_objs = [],
	curr_minute = 0;

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
	"ticksBtwMessages": 3,
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
	"ticksBtwMessages": 2,
	"maxInFlight": 100,
	"nextMessageAt": 0,
}];

var processors = [{
	"index": "4",
	"short": "Processor 1",
	"serviceTimeTicks": 2
}, ];


var speeds = {
	"slow": 1000,
	"medium": 200,
	"fast": 50
};

// Activity to put in center of circle arrangement
var center_pt = {
	"x": 380,
	"y": 365
};

var inFlightMessages = [];
var queuedMessages = [];
var inProcessingMessages = [];
var postProcessingMessages = [];

var messageProcessed = function (agent, message) {
	agent.numInFlight--;
	postProcessingMessages.push(message)
}

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
	if (processor.currentMessage) {
		var msg = processor.currentMessage;
		if (msg.processStartTick + processor.serviceTimeTicks == tick) {
			//We're done here.
			msg.processEndTick = tick;
			messageProcessed(msg.sender, msg);
			inProcessingMessages.shift()
			processor.currentMessage = null;
		}
	}

	if (!processor.currentMessage) {
		//We are emtpy, need to pull from the queue
		var msg = queuedMessages.shift();
		inProcessingMessages.push(msg)
		msg.processStartTick = tick;
		processor.currentMessage = msg
	}
}

var prepareActors = function () {
	var theta = -1 * Math.PI / (2 * (actors.length - 1));

	actors.forEach(function (actor, i) {
		actor.x = 500 * Math.cos(i * theta - 0.785) + 380,
			actor.y = 400 * Math.sin(i * theta - 0.785) + 400
	})
}

var prepareInflights = function () {
	inFlightMessages.forEach(function (msg) {
		msg.color = actorColors[msg.sender.index];
	})

	postProcessingMessages.forEach(function (msg, i) {
		msg.x = msg.sender.x + (actorDefaults.width / 2) + messageSize;
		msg.y = msg.sender.y + actorDefaults.height;
	})
	inProcessingMessages.forEach(function (msg) {
		msg.x = processorLoc.x + (padding.x)
		msg.y = queue.y + queue.height / 2;
	})
	queuedMessages.forEach(function (msg, i) {
		msg.x = (queue.x + queue.width) - ((i + 1) * (padding.x + messageSize))
		msg.y = queue.y + queue.height / 2;
	})
};

var updateD3 = function () {

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
		}).duration(1000)

	plottedMsgs.enter()
		.append("circle")
		.attr("r", radius)
		.attr("fill-opacity", 1)
		.attr("stroke-width", 1)
		.style("fill", function (d) {
			return d.color;
		})
		.style("stroke", function (d) {
			return d.color;
		})
		.attr("cx", function (d) {
			return d.sender.x + (actorDefaults.width / 2);
		})
		.attr("cy", function (d) {
			return d.sender.y + actorDefaults.height;
		}).transition().duration(1000).ease('linear')
		.attr("cx", function (d, i) {
			return queue.x - messageSize
		})
		.attr("cy", function (d) {
			return d.y
		}).each("end", function () { // as seen above

			d3.select(this). // this is the object
			transition().duration(1000).ease('linear') // a new transition!
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
	console.log("Handling tick " + tick)
	actors.forEach(function (actor, i) {
		sendTick(tick, actor)
	})

	processors.forEach(function (proc, i) {
			processTick(tick, proc);
		})
		//Expire returned message



	$.each(inFlightMessages, function (j) {
		if (inFlightMessages[j].processEndTick === tick - 3) {
			inFlightMessages.splice(j, 1);
			return false
		}
	});

	postProcessingMessages.forEach(function (msg) {

	})

	prepareInflights();
	updateD3();
}

//
// // Coordinates for activities
// var foci = {};
// actors.forEach(function (code, i) {
// 	var theta = 2 * Math.PI / (actors.length - 1);
// 	foci[code.index] = {
// 		x: 250 * Math.cos(i * theta) + 380,
// 		y: 250 * Math.sin(i * theta) + 365
// 	};
// });
//
// processors.forEach(function (code, i) {
// 	foci[code.index] = center_pt;
// });


// Start the SVG
var svg = d3.select("#chart").append("svg")
	.attr("width", width)
	.attr("height", height);

var messageSize = radius * 2;
var maxQueue = 40;
var padding = {
	x: 10,
	y: 10,
	actorPadding: 40
}

var processorLoc = {
	x: 3 * (width - messageSize) / 4,
	y: height / 2,
	height: messageSize + padding.y
};
var qWidth = (messageSize + padding.x) * maxQueue;
var queue = {
	x: processorLoc.x - qWidth - messageSize,
	y: processorLoc.y,
	height: processorLoc.height,
	width: qWidth
};

var actorDefaults = {
	width: 100,
	height: 50
}

//processor
svg.append("rect")
	.attr("width", messageSize * 2)
	.attr("height", processorLoc.height)
	.attr("x", processorLoc.x)
	.attr("fill", "#F9F9F9")
	.attr("stroke", "#CCC")
	.attr("stroke-width", 1)
	.attr("y", processorLoc.y);

//queue
svg.append("rect")
	.attr("width", queue.width)
	.attr("height", queue.height)
	.attr("x", queue.x)
	.attr("fill", "#F9F9F9")
	.attr("stroke", "#CCC")
	.attr("stroke-width", 1)
	.attr("y", queue.y);


prepareActors();

actorObjs = svg.selectAll("#actors")
	.data(actors, function (d) {
		return d.index;
	})

actorObjs.enter().append("rect")
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

console.log(actorObjs)


var curTick = 0;
setInterval(function () {
	if (curTick < 100) {
		handleTick(curTick++);
	}
}, 1000)


//
//
//
//
//
// // A node for each person's schedule
// var nodes = sched_objs.map(function (o, i) {
// 	var act = o[0].act;
// 	act_counts[act] += 1;
// 	var init_x = foci[act].x + Math.random();
// 	var init_y = foci[act].y + Math.random();
// 	return {
// 		act: act,
// 		radius: 3,
// 		x: init_x,
// 		y: init_y,
// 		color: color(act),
// 		moves: 0,
// 		next_move_time: o[0].duration,
// 		sched: o,
// 	}color
// });
//
// var force = d3.layout.force()
// 	.nodes(nodes)
// 	.size([width, height])
// 	// .links([])
// 	.gravity(0)
// 	.charge(0)
// 	.friction(.9)
// 	.on("tick", tick)
// 	.start();
//
// var circle = svg.selectAll("circle")
// 	.data(nodes)
// 	.enter().append("circle")
// 	.attr("r", function (d) {
// 		return d.radius;
// 	})
// 	.style("fill", function (d) {
// 		return d.color;
// 	});
// // .call(force.drag);
//
// // Activity labels
// var label = svg.selectAll("text")
// 	.data(actors)
// 	.enter().append("text")
// 	.attr("class", "actlabel")
// 	.attr("x", function (d, i) {
// 		if (d.desc == center_act) {
// 			return center_pt.x;
// 		} else {colorcolor
// 			var theta = 2 * Math.PI / (actors.length - 1);
// 			return 340 * Math.cos(i * theta) + 380;
// 		}
//
// 	})
// 	.attr("y", function (d, i) {
// 		if (d.desc == center_act) {
// 			return center_pt.y;
// 		} else {
// 			var theta = 2 * Math.PI / (actors.length - 1);
// 			return 340 * Math.sin(i * theta) + 365;
// 		}
//
// 	});
//
// label.append("tspan")
// 	.attr("x", function () {
// 		return d3.select(this.parentNode).attr("x");
// 	})
// 	// .attr("dy", "1.3em")
// 	.attr("text-anchor", "middle")
// 	.text(function (d) {
// 		return d.short;
// 	});
// label.append("tspan")
// 	.attr("dy", "1.3em")
// 	.attr("x", function () {
// 		return d3.select(this.parentNode).attr("x");
// 	})
// 	.attr("text-anchor", "middle")
// 	.attr("class", "actpct")
// 	.text(function (d) {
// 		return act_counts[d.index] + "%";
// 	});
//
//
// // Update nodes based on activity and duration
// function timer() {
// 	d3.range(nodes.length).map(function (i) {
// 		var curr_node = nodes[i],
// 			curr_moves = curr_node.moves;
//
// 		// Time to go to next activity
// 		if (curr_node.next_move_time == curr_minute) {
// 			if (curr_node.moves == curr_node.sched.length - 1) {
// 				curr_moves = 0;
// 			} else {
// 				curr_moves += 1;
// 			}
//
// 			// Subtract from current activity count
// 			act_counts[curr_node.act] -= 1;
//
// 			// Move on to next activity
// 			curr_node.act = curr_node.sched[curr_moves].act;
//
// 			// Add to new activity count
// 			act_counts[curr_node.act] += 1;
//
// 			curr_node.moves = curr_moves;
// 			curr_node.cx = foci[curr_node.act].x;
// 			curr_node.cy = foci[curr_node.act].y;
//
// 			nodes[i].next_move_time += nodes[i].sched[curr_node.moves].duration;
// 		}
//
// 	});
//
// 	force.resume();
// 	curr_minute += 1;
//
// 	// Update percentages
// 	label.selectAll("tspan.actpct")
// 		.text(function (d) {
// 			return readablePercent(act_counts[d.index]);
// 		});
//
// 	// Update time
// 	var true_minute = curr_minute % 1440;
// 	d3.select("#current_time").text(minutesToTime(true_minute));
//
// 	setTimeout(timer, speeds[USER_SPEED]);
// }
// setTimeout(timer, speeds[USER_SPEED]);
//
//
//
//
// function tick(e) {
// 	var k = 0.04 * e.alpha;
//
// 	// Push nodes toward their designated focus.
// 	nodes.forEach(function (o, i) {
// 		var curr_act = o.act;
//
// 		// Make sleep more sluggish moving.
// 		if (curr_act == "0") {
// 			var damper = 0.6;
// 		} else {
// 			var damper = 1;
// 		}
// 		o.color = color(curr_act);
// 		o.y += (foci[curr_act].y - o.y) * k * damper;
// 		o.x += (foci[curr_act].x - o.x) * k * damper;
// 	});
//
// 	circle
// 		.each(collide(.5))
// 		.style("fill", function (d) {
// 			return d.color;
// 		})
// 		.attr("cx", function (d) {
// 			return d.x;
// 		})
// 		.attr("cy", function (d) {
// 			return d.y;
// 		});
// }
//
//
// // Resolve collisions between nodes.
// function collide(alpha) {
// 	var quadtree = d3.geom.quadtree(nodes);
// 	return function (d) {
// 		var r = d.radius + maxRadius + padding,
// 			nx1 = d.x - r,
// 			nx2 = d.x + r,
// 			ny1 = d.y - r,
// 			ny2 = d.y + r;
// 		quadtree.visit(function (quad, x1, y1, x2, y2) {
// 			if (quad.point && (quad.point !== d)) {
// 				var x = d.x - quad.point.x,
// 					y = d.y - quad.point.y,
// 					l = Math.sqrt(x * x + y * y),
// 					r = d.radius + quad.point.radius + (d.act !== quad.point.act) * padding;
// 				if (l < r) {
// 					l = (l - r) / l * alpha;
// 					d.x -= x *= l;
// 					d.y -= y *= l;
// 					quad.point.x += x;
// 					quad.point.y += y;
// 				}
// 			}
// 			return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
// 		});
// 	};
// }
//
//
//
//
// // Speed toggle
// d3.selectAll(".togglebutton")
// 	.on("click", function () {
// 		if (d3.select(this).attr("data-val") == "slow") {
// 			d3.select(".slow").classed("current", true);
// 			d3.select(".medium").classed("current", false);
// 			d3.select(".fast").classed("current", false);
// 		} else if (d3.select(this).attr("data-val") == "medium") {
// 			d3.select(".slow").classed("current", false);
// 			d3.select(".medium").classed("current", true);
// 			d3.select(".fast").classed("current", false);
// 		} else {
// 			d3.select(".slow").classed("current", false);
// 			d3.select(".medium").classed("current", false);
// 			d3.select(".fast").classed("current", true);
// 		}
//
// 		USER_SPEED = d3.select(this).attr("data-val");
// 	});
//
//
//
// function color(activity) {
//
// 	var colorByActivity = {
// 		"0": "#e0d400",
// 		"1": "#1c8af9",
// 		"2": "#51BC05",
// 		"3": "#FF7F00",
// 		"4": "#DB32A4",
// 		"5": "#00CDF8",
// 		"6": "#E63B60",
// 		"7": "#8E5649",
// 		"8": "#68c99e",
// 		"9": "#a477c8",
// 		"10": "#5C76EC",
// 		"11": "#E773C3",
// 		"12": "#799fd2",
// 		"13": "#038a6c",
// 		"14": "#cc87fa",
// 		"15": "#ee8e76",
// 		"16": "#bbbbbb",
// 	}
//
// 	return colorByActivity[activity];
//
// }
//
//
//
// // Output readable percent based on count.
// function readablePercent(n) {
//
// 	var pct = 100 * n / 1000;
// 	if (pct < 1 && pct > 0) {
// 		pct = "<1%";
// 	} else {
// 		pct = Math.round(pct) + "%";
// 	}
//
// 	return pct;
// }
//
//
// // Minutes to time of day. Data is minutes from 4am.
// function minutesToTime(m) {
// 	var minutes = (m + 4 * 60) % 1440;
// 	var hh = Math.floor(minutes / 60);
// 	var ampm;
// 	if (hh > 12) {
// 		hh = hh - 12;
// 		ampm = "pm";
// 	} else if (hh == 12) {
// 		ampm = "pm";
// 	} else if (hh == 0) {
// 		hh = 12;
// 		ampm = "am";
// 	} else {
// 		ampm = "am";
// 	}
// 	var mm = minutes % 60;
// 	if (mm < 10) {
// 		mm = "0" + mm;
// 	}
//
// 	return hh + ":" + mm + ampm
// }
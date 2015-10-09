var fetch = require("node-fetch");
var L = require("polyline-encoded");
var rx = require("rx");

var stories = [
	{
		user: "yshay3",
		speed: 100,
		routes: [["רוטשילד תל אביב", "לנדאו חולון"]]
	},
	{
		user: "asaf",
		speed: 50,
		routes: [["רוטשילד תל אביב", "אבן גבירול תל אביב"]]
	},
	{
		user: "segal",
		speed: 140,
		routes: [["רוטשילד תל אביב", "חיפה"]]
	},
	{
		user: "friend",
		speed: 80,
		routes: [["רוטשילד תל אביב", "גבעתיים"]]
	}
]


var org = process.argv[2];
var dest = process.argv[3];

function runRoutes(story)
{
	return rx
	.Observable
	.fromArray(story.routes)
	.concatMap(route=>{
		var url = "https://maps.googleapis.com/maps/api/directions/json?origin=" + encodeURIComponent(route[0]) + "&destination=" + encodeURIComponent(route[1]) + "&key=AIzaSyDiZjFcys_D9VKtOAiuVwaghJDo4bFdWrY";
		return fetch(url)
			.then(x=>x.json())
			.then(x=> x.routes[0].overview_polyline.points)
			.then(x=> L.decode(x))
			.then(x=> {
				var io = require('socket.io-client');
				var socket = io.connect("http://localhost:3000/", {multiplex:false});
				console.log("start driving")
				socket.emit('start driving', story.user, 33);
				return rx.Observable
				.fromArray(x)
				.zip(rx.Observable.interval(200 - story.speed), (a,b)=>a)
				.do(x=>{
					console.log(x);
					socket.emit('position update', new Date(), 100, JSON.stringify({longitude:x[1], latitude:x[0]}))
				}).toPromise();
			})
		}).concat(rx.Observable.defer(()=>{
				console.log("rewinding")
				return runRoutes({
					user: story.user,
					routes: story.routes.slice().reverse().map(t=>t.slice().reverse()),
					speed: story.speed
				}) })); 
			
}


stories.forEach(story=>{
	runRoutes(story).subscribe();
})
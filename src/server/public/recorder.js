$(document).ready(function(){
	var audioContext = new AudioContext();
	var audioInput; 
	var inputPoint; 

	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia 
	    || navigator.mozGetUserMedia || navigator.msGetUserMedia;

	function gotStream(stream){
		audioInput = audioContext.createMediaStreamSource(stream);
		inputPoint = audioContext.createGain();		
		inputPoint.gain.value = 1;
		audioInput.connect(inputPoint);
		inputPoint.connect(audioContext.destination);
		
		console.log(audioInput);
		console.log(inputPoint.context);
	}   

	if(navigator.getUserMedia){
		console.log(navigator.getUserMedia);
	    navigator.getUserMedia({video:false, audio:true}, gotStream,
	    function(e){
	    	alert('error getting media');
	    	console.log(e);
	    });
	}
});
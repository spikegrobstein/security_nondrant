var SecurityNondrant = function(element, callback) {
	this.element = element[0]; // the element that we're drawing to (canvas)
	this.callback = callback; // the callback that will be provided the input code as an array of ints 0-8
	
	this.context = null; // the drawing context
	
	// width and height of element for quick reference.
	this.w = null;
	this.h = null;
	
	// the code as it's being input
	this.code = [];
	
	// region sizes in ratio (1.0 == 100%, 0.9 == 90%)
	this.start_region_size = 0.9; // finger must be in a start_region to initiate input
	this.waypoint_region_size = 0.5; // finger must be in a waypoint region to trigger that nondrant
	
	this.render_cache = null; // the cache for storing the image data for faster drawing
	
	return this;
}


		
/*
**	initialize this object
*/
SecurityNondrant.prototype.init = function() {
	if (!this.check_browser()) {
		return;
	}
	this.initialize_context();
	this.initialize_events();
	this.render();
};

/*
**	make sure the browser supports touchstart... this could be made more robust
**	oh yeah, and it doesn't work.
*/
SecurityNondrant.prototype.check_browser = function() {
	if (! 'ontouchstart' in document.documentElement) {
		throw("Unsupported browser: does not support touchstart event.");
		return false;
	}
	
	return true;
};

/*
**	initialize the drawing context and the w/h values for this object
*/
SecurityNondrant.prototype.initialize_context = function() {
	this.context = this.element.getContext('2d');
	this.w = this.element.width;
	this.h = this.element.height;
};

/*
**	set up event listeners
*/
SecurityNondrant.prototype.initialize_events = function() {
	var _security_nondrant = this;
	
	$(this.element).bind("touchstart", function(e) {
		e.preventDefault();
		e.stopPropagation();
		_security_nondrant.start_code(_security_nondrant, e.originalEvent);
	});
	
	$(this.element).bind("touchmove", function(e) {
		e.preventDefault();
		e.stopPropagation();
		_security_nondrant.finger_move(_security_nondrant, e.originalEvent);
	});
	
	$(this.element).bind("touchend", function(e) {
		e.preventDefault();
		e.stopPropagation();
		_security_nondrant.end_code(_security_nondrant, e.originalEvent);
	});
	
	
	// register event listeners.
//	this.element.addEventListener("touchstart", this.start_code, false);
//	this.element.addEventListener("touchmove", this.finger_move, false);
//	this.element.addEventListener("touchend", this.end_code, false);
};

/*
**	render the current state of the canvas
*/
SecurityNondrant.prototype.render = function() {
	this.render_background();
	
	this.render_first(); // render the first-selected square
	
	// set up basic context shit.
	this.context.lineWidth = 1.0;
	this.context.lineJoin = 'butt';
	this.context.lineCap = 'miter';
	
	// render the look and feel of each nondrant.
	// the box in the middle or whatever.
	// currently, it draws the regions
	for (var i = 0; i < 9; i++) {
		var nondrant_info = this.nondrant_offset(i);
		
		// draw the start region
		this.context.strokeStyle = 'rgb(0,0,255)';
		this.context.strokeRect(
			nondrant_info.origin_x - Math.floor((nondrant_info.w * this.start_region_size) / 2),
			nondrant_info.origin_y - Math.floor((nondrant_info.h * this.start_region_size) / 2),
			Math.floor(nondrant_info.w * this.start_region_size),
			Math.floor(nondrant_info.h * this.start_region_size)
		);

		// draw the waypoint region
		this.context.strokeStyle = 'rgb(0, 255, 255)';
		this.context.strokeRect(
			nondrant_info.origin_x - Math.floor((nondrant_info.w * this.waypoint_region_size) / 2),
			nondrant_info.origin_y - Math.floor((nondrant_info.h * this.waypoint_region_size) / 2),
			Math.floor(nondrant_info.w * this.waypoint_region_size),
			Math.floor(nondrant_info.h * this.waypoint_region_size)
		);
	}
	
	this.render_lines();
	
	// cache the base render
	// this is the code as-is-input with all styles and everything
	// doesn't include the line to the user's finger. this enables much faster screen updating,
	// since we only have to render an image, then a line from the last nondrant to the finger. 
	this.render_cache = this.context.getImageData(0, 0, this.w, this.h);		
};

/*
**	render the basic background
**	fill with black and draw lines
*/
SecurityNondrant.prototype.render_background = function() {
	this.context.beginPath();
	this.context.fillStyle = 'rgb(0,0,0)';
	this.context.fillRect(0, 0, this.w, this.h);

	this.context.strokeStyle = 'rgba(255,255,255,1.0)';
	this.context.lineWidth = 1.0;

	// draw vertical lines
	this.context.moveTo(this.w / 3, 0);
	this.context.lineTo(this.w / 3, this.h);
	this.context.moveTo(this.w / 3 * 2, 0);
	this.context.lineTo(this.w / 3 * 2, this.h);

	// draw horizontal lines
	this.context.moveTo(0, this.h / 3);
	this.context.lineTo(this.w, this.h / 3);
	this.context.moveTo(0, this.h / 3 * 2);
	this.context.lineTo(this.w, this.h / 3 * 2);
	
	this.context.stroke();
	this.context.closePath();
};

/*
**	right now, we draw the first nondrant a little differently. could change in the future.
*/
SecurityNondrant.prototype.render_first = function() {
	if (this.code.length == 0) { return; }
	
	var nondrant = this.nondrant_offset(this.code[0]);
	
	this.context.fillStyle = 'rgb(255,255,0)';
	this.context.fillRect(nondrant.x, nondrant.y, nondrant.w, nondrant.h);
};

/*
**	draw the lines showing the currently input code.
*/
SecurityNondrant.prototype.render_lines = function() {
	if (this.code.length == 0) { return; }
	
	this.context.beginPath();
	this.context.lineWidth = 10.0;
	this.context.lineJoin = 'round';
	this.context.lineCap = 'round';
	this.context.strokeStyle = 'rgb(255,0,0)';
	this.context.fillStyle = 'rgb(0,255,0)';
			
	var info = this.nondrant_offset(this.code[0]);
	this.context.moveTo(info.origin_x, info.origin_y);
	
	for(var i = 0; i < this.code.length; i++) {
		info = this.nondrant_offset(this.code[i]);
		this.context.lineTo(info.origin_x, info.origin_y);
		this.context.fillRect(info.origin_x - 10, info.origin_y - 10, 20, 20);
	}
	
	this.context.stroke();
	this.context.closePath();
};

/*
**	draws the line from the last nondrant in the code to where the user's finger currently is
*/
SecurityNondrant.prototype.render_current = function(event) {
	this.context.putImageData(this.render_cache, 0, 0);
	
	this.context.lineWidth = 10.0;
	this.context.lineJoin = 'round';
	this.context.lineCap = 'round';
	this.context.strokeStyle = 'rgb(255,0,0)';
	
	var x = event.touches[0].pageX - this.element.offsetLeft;
	var y = event.touches[0].pageY - this.element.offsetTop;
	var info = this.nondrant_offset(this.code[this.code.length - 1]);
	
	this.context.beginPath();
	
	this.context.moveTo(info.origin_x, info.origin_y);
	this.context.lineTo(x, y);
	
	this.context.stroke();
	this.context.closePath();
};

/*
**	returns the nondrant number of where the user's finger currently resides.
*/
SecurityNondrant.prototype.current_nondrant = function(security_nondrant, event) {
	/*
		returns the nondrant that the user's finger is currently in:

		0 1 2
		3 4 5
		6 7 8

	*/
	
	var w = security_nondrant.element.width;
	var h = security_nondrant.element.height;
	var x = event.touches[0].pageX - security_nondrant.element.offsetLeft;
	var y = event.touches[0].pageY - security_nondrant.element.offsetTop;

	// and apply the magic formula..
	return Math.floor(x / Math.floor(w / 3)) + 3 * Math.floor(y / Math.floor(h / 3));
};

/*
**	returns a hash of the nondrant's { x, y, w, h, origin_x, origin_y }
*/
SecurityNondrant.prototype.nondrant_offset = function(nondrant) {
	var nondrant_width = Math.floor(this.element.width / 3);
	var nondrant_height = Math.floor(this.element.height / 3);
	
	var nondrant_left = (nondrant % 3) * nondrant_width;
	var nondrant_top = Math.floor(nondrant / 3) * nondrant_height;
	
	return {
		x: nondrant_left,
		y: nondrant_top,
		w: nondrant_width,
		h: nondrant_height,
		origin_x: nondrant_left + Math.floor(nondrant_width / 2), // center
		origin_y: nondrant_top + Math.floor(nondrant_height / 2), // center
	};
};

/*
**	in the nondrant, which region is the user's finger in?
**	returns: 'none', 'start', 'waypoint'
*/
SecurityNondrant.prototype.nondrant_region = function(event) {
	var nondrant = this.current_nondrant(this, event);
	var nondrant_info = this.nondrant_offset(nondrant);
	
	var x = event.touches[0].pageX - this.element.offsetLeft;
	var y = event.touches[0].pageY - this.element.offsetTop;
	
	if (this.in_region(event, this.waypoint_region_size)) {
		return 'waypoint';
	} else if (this.in_region(event, this.start_region_size)) {
		return 'start';
	}
	
	return 'none';
};

/*
**	returns whether the user's finger is in the specified region
**	region is provided as a ratio of the size of the region relative to the nondrant's dimensions
*/
SecurityNondrant.prototype.in_region = function(event, region_ratio) {
	var n = this.current_nondrant(this, event);
	var info = this.nondrant_offset(n);
	
	// translate the x/y to canvas's x/y
	var x = event.touches[0].pageX - this.element.offsetLeft;
	var y = event.touches[0].pageY - this.element.offsetTop;
	
	// translate canvas's x/y to nondrant's x/y
	var nx = x - info.x;
	var ny = y - info.y;
	
	// translate nondrant origin to local values
	var nox = Math.floor(info.w / 2);
	var noy = Math.floor(info.h / 2);
	
	// the distance of the cursor from the origin
	var x_dist = Math.abs(nox - nx);
	var y_dist = Math.abs(noy - ny);
	
	// the maximum distance the cursor can be from the origin and still remain in the region.
	var max_x_dist = (info.w * region_ratio / 2);
	var max_y_dist = (info.h * region_ratio / 2);
	
	//$('#n_info').html(info.x + '|' + info.y + ' # ' + info.origin_x + '|' + info.origin_y + ' # ' + info.w + '|' + info.h);
	
	$('#info_aux').html(n + '|' + Math.abs(nox - nx) + '|' + Math.abs(noy - ny));
	
	return ( x_dist <= max_x_dist ) && ( y_dist <= max_y_dist );
};

/*
**	event that is triggered when the user puts their finger down
*/
SecurityNondrant.prototype.start_code = function(security_nondrant, event) {
	//event.preventDefault();
	//event.stopPropagation();
	
	this.code = []; // initialize the code
	
	this.code.push(this.current_nondrant(security_nondrant, event));
	
	this.render();
	
	$('#info_aux').html('start');
	$('#info_x').html(event.touches[0].pageX);
	$('#info_y').html(event.touches[0].pageY);
};

/*
**	event that is triggered as the user's finger is dragged around
*/
SecurityNondrant.prototype.finger_move = function(security_nondrant, event) {
	//event.preventDefault();
	//event.stopPropagation();
	
	var x = event.touches[0].pageX - this.offsetLeft;
	var y = event.touches[0].pageY - this.offsetTop;
	
	if (x < 0 || y < 0 || x > this.element.width || y > this.element.height) { return; }
							
	//$('#info_aux').html(s.current_nondrant(event));
	$('#info_x').html(x);
	$('#info_y').html(y);
	
	// let's track some regions and shit
	var current_nondrant = this.current_nondrant(security_nondrant, event);
	var region = this.nondrant_region(event);
	
	$('#n_info').html(region);
	
	// if the region hits the waypoint, then append the current nondrant to the code
	if (region == 'waypoint') {
		// assuming this nondrant hasn't already been used
		if (!( current_nondrant in oc(this.code) )) {
			this.code.push(current_nondrant);
			this.render();
		}
	}
	
	
	this.render_current(event);
	
	$('#info_aux').html(this.code.join(''));
};

/*
**	event that is triggered when the user lifts her finger.
*/
SecurityNondrant.prototype.end_code = function(security_nondrant, event) {
	//event.preventDefault();
	//event.stopPropagation();
	
	this.render();
	
	$('#info_aux').html('end');
	
	this.callback(this.code);
	
};
	
// object converter
// stolen from: http://snook.ca/archives/javascript/testing_for_a_v
// converts an array into an object so you can use the 'in' operator
function oc(a)
{
  var o = {};
  for(var i=0;i<a.length;i++)
  {
    o[a[i]]='';
  }
  return o;
}
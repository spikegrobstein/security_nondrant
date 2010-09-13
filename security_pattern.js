function SecurityPattern(element, callback) {
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
		
	/*
	**	initialize this object
	*/
	this.init = function() {
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
	this.check_browser = function() {
		if (! 'ontouchstart' in document.documentElement) {
			throw("Unsupported browser: does not support touchstart event.");
			return false;
		}
		
		return true;
	};
	
	/*
	**	initialize the drawing context and the w/h values for this object
	*/
	this.initialize_context = function() {
		this.context = this.element.getContext('2d');
		this.w = this.element.width;
		this.h = this.element.height;
	};
	
	/*
	**	set up event listeners
	*/
	this.initialize_events = function() {
		
		// register event listeners.
		this.element.addEventListener("touchstart", this.start_code, false);
		this.element.addEventListener("touchmove", this.finger_move, false);
		this.element.addEventListener("touchend", this.end_code, false);
	};
	
	/*
	**	render the current state of the canvas
	*/
	this.render = function() {
		s.render_background();
		
		s.render_first(); // render the first-selected square
		
		// set up basic context shit.
		s.context.lineWidth = 1.0;
		s.context.lineJoin = 'butt';
		s.context.lineCap = 'miter';
		
		// render the look and feel of each nondrant.
		// the box in the middle or whatever.
		// currently, it draws the regions
		for (var i = 0; i < 9; i++) {
			var nondrant_info = s.nondrant_offset(i);
			
			// draw the start region
			s.context.strokeStyle = 'rgb(0,0,255)';
			s.context.strokeRect(
				nondrant_info.origin_x - Math.floor((nondrant_info.w * s.start_region_size) / 2),
				nondrant_info.origin_y - Math.floor((nondrant_info.h * s.start_region_size) / 2),
				Math.floor(nondrant_info.w * s.start_region_size),
				Math.floor(nondrant_info.h * s.start_region_size)
			);

			// draw the waypoint region
			s.context.strokeStyle = 'rgb(0, 255, 255)';
			s.context.strokeRect(
				nondrant_info.origin_x - Math.floor((nondrant_info.w * s.waypoint_region_size) / 2),
				nondrant_info.origin_y - Math.floor((nondrant_info.h * s.waypoint_region_size) / 2),
				Math.floor(nondrant_info.w * s.waypoint_region_size),
				Math.floor(nondrant_info.h * s.waypoint_region_size)
			);
		}
		
		s.render_lines();
		
		// cache the base render
		// this is the code as-is-input with all styles and everything
		// doesn't include the line to the user's finger. this enables much faster screen updating,
		// since we only have to render an image, then a line from the last nondrant to the finger. 
		s.render_cache = s.context.getImageData(0,0,s.w, s.h);		
	};
	
	/*
	**	render the basic background
	**	fill with black and draw lines
	*/
	this.render_background = function() {
		s.context.beginPath();
		s.context.fillStyle = 'rgb(0,0,0)';
		s.context.fillRect(0, 0, s.w, s.h);

		s.context.strokeStyle = 'rgba(255,255,255,1.0)';
		s.context.lineWidth = 1.0;

		// draw vertical lines
		s.context.moveTo(s.w / 3, 0);
		s.context.lineTo(s.w / 3, s.h);
		s.context.moveTo(s.w / 3 * 2, 0);
		s.context.lineTo(s.w / 3 * 2, s.h);

		// draw horizontal lines
		s.context.moveTo(0, s.h / 3);
		s.context.lineTo(s.w, s.h / 3);
		s.context.moveTo(0, s.h / 3 * 2);
		s.context.lineTo(s.w, s.h / 3 * 2);
		
		s.context.stroke();
		s.context.closePath();
	};
	
	/*
	**	right now, we draw the first nondrant a little differently. could change in the future.
	*/
	this.render_first = function() {
		if (s.code.length == 0) { return; }
		
		var nondrant = s.nondrant_offset(s.code[0]);
		
		s.context.fillStyle = 'rgb(255,255,0)';
		s.context.fillRect(nondrant.x, nondrant.y, nondrant.w, nondrant.h);
	};
	
	/*
	**	draw the lines showing the currently input code.
	*/
	this.render_lines = function() {
		if (s.code.length == 0) { return; }
		
		s.context.beginPath();
		s.context.lineWidth = 10.0;
		s.context.lineJoin = 'round';
		s.context.lineCap = 'round';
		s.context.strokeStyle = 'rgb(255,0,0)';
		s.context.fillStyle = 'rgb(0,255,0)';
				
		var info = s.nondrant_offset(s.code[0]);
		s.context.moveTo(info.origin_x, info.origin_y);
		
		for(var i = 0; i < this.code.length; i++) {
			info = s.nondrant_offset(this.code[i]);
			s.context.lineTo(info.origin_x, info.origin_y);
			s.context.fillRect(info.origin_x - 10, info.origin_y - 10, 20, 20);
		}
		
		s.context.stroke();
		s.context.closePath();
	};
	
	/*
	**	draws the line from the last nondrant in the code to where the user's finger currently is
	*/
	this.render_current = function() {
		s.context.putImageData(s.render_cache, 0, 0);
		
		s.context.lineWidth = 10.0;
		s.context.lineJoin = 'round';
		s.context.lineCap = 'round';
		s.context.strokeStyle = 'rgb(255,0,0)';
		
		var x = event.touches[0].pageX - element[0].offsetLeft;
		var y = event.touches[0].pageY - element[0].offsetTop;
		var info = s.nondrant_offset(s.code[s.code.length - 1]);
		
		s.context.beginPath();
		
		s.context.moveTo(info.origin_x, info.origin_y);
		s.context.lineTo(x, y);
		
		s.context.stroke();
		s.context.closePath();
	};
	
	/*
	**	returns the nondrant number of where the user's finger currently resides.
	*/
	this.current_nondrant = function(event) {
		/*
			returns the nondrant that the user's finger is currently in:

			0 1 2
			3 4 5
			6 7 8

		*/
		var element = $('#security_pattern');
		var w = element.width();
		var h = element.height();
		var x = event.touches[0].pageX - element[0].offsetLeft;
		var y = event.touches[0].pageY - element[0].offsetTop;

		// and apply the magic formula..
		return Math.floor(x / Math.floor(w / 3)) + 3 * Math.floor(y / Math.floor(h / 3));
	};
	
	/*
	**	returns a hash of the nondrant's { x, y, w, h, origin_x, origin_y }
	*/
	this.nondrant_offset = function(nondrant) {
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
	this.nondrant_region = function(event) {
		var nondrant = s.current_nondrant(event);
		var nondrant_info = s.nondrant_offset(nondrant);
		
		var x = event.touches[0].pageX - s.element.offsetLeft;
		var y = event.touches[0].pageY - s.element.offsetTop;
		
		if (s.in_region(event, s.waypoint_region_size)) {
			return 'waypoint';
		} else if (s.in_region(event, s.start_region_size)) {
			return 'start';
		}
		
		return 'none';
	};
	
	/*
	**	returns whether the user's finger is in the specified region
	**	region is provided as a ratio of the size of the region relative to the nondrant's dimensions
	*/
	this.in_region = function(event, region_ratio) {
		var n = s.current_nondrant(event);
		var info = s.nondrant_offset(n);
		
		// translate the x/y to canvas's x/y
		var x = event.touches[0].pageX - s.element.offsetLeft;
		var y = event.touches[0].pageY - s.element.offsetTop;
		
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
	this.start_code = function(event) {
		event.preventDefault();
		event.stopPropagation();
		
		s.code = []; // initialize the code
		
		s.code.push(s.current_nondrant(event));
		
		s.render();
		
		$('#info_aux').html('start');
		$('#info_x').html(event.touches[0].pageX);
		$('#info_y').html(event.touches[0].pageY);
	};
	
	/*
	**	event that is triggered as the user's finger is dragged around
	*/
	this.finger_move = function(event) {
		event.preventDefault();
		event.stopPropagation();
		
		var x = event.touches[0].pageX - this.offsetLeft;
		var y = event.touches[0].pageY - this.offsetTop;
		
		if (x < 0 || y < 0 || x > s.element.width || y > s.element.height) { return; }
								
		//$('#info_aux').html(s.current_nondrant(event));
		$('#info_x').html(x);
		$('#info_y').html(y);
		
		// let's track some regions and shit
		var current_nondrant = s.current_nondrant(event);
		var region = s.nondrant_region(event);
		
		$('#n_info').html(region);
		
		// if the region hits the waypoint, then append the current nondrant to the code
		if (region == 'waypoint') {
			// assuming this nondrant hasn't already been used
			if (!( current_nondrant in oc(s.code) )) {
				s.code.push(current_nondrant);
				s.render();
			}
		}
		
		
		s.render_current();
		
		$('#info_aux').html(s.code.join(''));
	};
	
	/*
	**	event that is triggered when the user lifts her finger.
	*/
	this.end_code = function(event) {
		event.preventDefault();
		event.stopPropagation();
		
		s.render();
		
		$('#info_aux').html('end');
		
		s.callback(s.code);
		
	};
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
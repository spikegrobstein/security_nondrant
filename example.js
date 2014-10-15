window.requestAnimFrame = function(){
    return (
            window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function(/* function */ callback){
                window.setTimeout(callback, 1000 / 60);
            }
        );
}();

(function( window, document ) {
  var Nondrant = function( ele ) {
    this.ele = ele;
    this.realCtx = this.ele.getContext('2d');
    this.realCtx.strokeStyle = '#00ff00';
    this.realCtx.lineCap = "round";
    this.realCtx.lineWidth = "4";

    this.width = this.ele.offsetWidth;
    this.height = this.ele.offsetHeight;

    // init image
    this.offscreenImage = document.createElement('canvas');
    this.offscreenImage.width = this.width;
    this.offscreenImage.height = this.height;
    this.ctx = this.offscreenImage.getContext('2d');
    this.ctx.fillStyle = '#6666bb';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // pen style
    this.ctx.strokeStyle = '#00ff00';
    this.ctx.lineCap = "round";
    this.ctx.lineWidth = "4";

    this.fingerDown = false;
    this.currentPoint = null;

    this.buttons = [];
    this.currentState = []; // the currently input code

    this.initializeButtons();
    this.initializeEvents();
    this.drawLoop();
  };

  Nondrant.prototype.drawLoop = function() {
    this.draw();

    window.requestAnimFrame( this.drawLoop.bind(this) );
  }

  Nondrant.prototype.draw = function() {
    this.realCtx.drawImage( this.offscreenImage, 0, 0, this.width, this.height );

    if ( ! this.lastButton() ) { return; }

    this.realCtx.moveTo( this.lastButton().x, this.lastButton().y );
    this.realCtx.lineTo( this.currentPoint.x, this.currentPoint.y );

    this.realCtx.stroke();
  }

  Nondrant.prototype.lastButton = function() {
    return this.buttons[this.currentState[this.currentState.length - 1]];
  }

  // callbacks
  // onStart -- finger hits, process starts
  // onFinish -- finger is lifted, passes code
  // onInput -- each time a new value is added
  Nondrant.prototype.onStart = function( callback ) {
    this.doOnStart = callback;
  };
  Nondrant.prototype.onFinish = function( callback ) {
    this.doOnFinish = callback;
  };
  Nondrant.prototype.onInput = function( callback ) {
    this.doOnInput = callback;
  };

  Nondrant.prototype.initializeEvents = function() {
    this.ele.addEventListener( 'touchstart', function( event ) {
      // TODO: fire off event that input started
      // this.handleInteraction( 'start', { x: event.touches[0].clientX, y: event.touches[0].clientY } );
    }.bind(this), false );

    this.ele.addEventListener( 'touchend', function( event ) {
      // TODO: fire off event that input ended
      // this.handleInteraction( 'end', { x: null, y: null } );
    }.bind(this), false );

    this.ele.addEventListener( 'touchmove', function( event ) {
      this.handleInteraction( 'move', { x: event.touches[0].clientX, y: event.touches[0].clientY } );
    }.bind(this), false );

    this.ele.addEventListener( 'mousedown', function( event ) {
      this.fingerDown = true;
      // TODO: fire off event that the user started
      // this.handleInteraction( 'down', { x: event.clientX, y: event.clientY } );
    }.bind(this), false );

    this.ele.addEventListener( 'mouseup', function( event ) {
      this.fingerDown = false;
      // TODO: fire off event that the user finished
      // this.handleInteraction( 'end', { x: null, y: null } );
    }.bind(this), false );

    this.ele.addEventListener( 'mousemove', function( event ) {
      if ( ! this.fingerDown ) { return; }
      this.handleInteraction( 'move', { x: event.clientX, y: event.clientY } );
    }.bind(this), false );
  };

  Nondrant.prototype.initializeButtons = function() {
    var i = 0;
    for ( i = 0; i < 9; i++ ) {
      // x and y are the center of this button
      var button = {
        id: i,
        pressed: false,
        x: ( this.width / 6 + this.width / 3 * ( i % 3 ) ),
        y: ( this.height / 6 + this.height / 3 * Math.trunc( i / 3 ) ),
        threshold: this.width / 12 // 50% coverage
      };

      this.buttons.push( button );
    }
  }

  Nondrant.prototype.resetState = function() {
    var i = 0;
    for ( i in this.buttons ) {
      i = this.buttons[i];
      i.pressed = false;
    }

    this.currentState = [];
  }

  // pythagorean theorum
  Nondrant.prototype.distanceBetween = function( p1, p2 ) {
    return Math.sqrt(
      Math.pow( Math.abs( p1.x - p2.x ), 2 )
      + Math.pow( Math.abs( p1.y - p2.y), 2 )
    );
  }

  Nondrant.prototype.findButton = function( p ) {
    var b = 0;
    for ( b in this.buttons ) {
      b = this.buttons[b];
      if ( this.distanceBetween( p, b ) < b.threshold && ! b.pressed ) {
        return b;
      }
    }

    return null;
  }

  Nondrant.prototype.handleInteraction = function( type, p ) {
    var button = this.findButton( p ),
        b; // iterated button
    this.currentPoint = p;
    if ( ! button ) { return; }

    button.pressed = true;

    b = this.lastButton();
    this.currentState.push(button.id);

    if ( this.currentState.length == 1 ) { return; }

    this.ctx.moveTo( b.x, b.y );

    for ( b in this.currentState ) {
      b = this.buttons[this.currentState[b]];

      this.ctx.lineTo( b.x, b.y );
      this.ctx.moveTo( b.x, b.y );
      this.ctx.stroke();
    }


    console.log( "Just pressed button: " + button.id );
    // TODO: fire off input event
  }


  window.Nondrant = Nondrant;
})( window, document );

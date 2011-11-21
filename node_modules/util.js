var fs = require( 'fs' );

exports.Util = new Util();

function Util () {

  this.appendFile =  function ( path, text ) {
    try {
      fs.open( path, 'a', 0666, function( err, fd ) {
        if ( err ) { throw err; }
        try {
          var buffer = new Buffer( text  );
          fs.write( fd, buffer, 0, buffer.length, null, function( err, written, buffer ) {
            if ( err ) {
              throw err; 
            }
            fs.close( fd, function() {
              return;
            } );
          } );
        }
        catch ( err ) {
          console.log( err );
        }
      });
    }
    catch ( err ) {
      console.log( err );
    }
  };

  this.iso8601Date = function (d) {
    d = new Date ( d );
    function pad(n){return n<10 ? '0'+n : n}
    return d.getUTCFullYear()+'-'
        + pad(d.getUTCMonth()+1)+'-'
        + pad(d.getUTCDate())+'T'
        + pad(d.getUTCHours())+':'
        + pad(d.getUTCMinutes())+':'
        + pad(d.getUTCSeconds())+'Z';
  };

  this.sanitizeConnection = function ( connection ) {
    if (!connection)
      return;
    if ( connection.password )
      delete connection.password;
    if ( connection.lastActive ) {
      var t = this.timeElapse( ( new Date() ).getTime(), connection.lastActive.getTime() );
      connection.timeElapse = t;
    }
    return connection;
  };

  this.spitFile = function ( path, prompt ) {
    try {
      fs.readFile( path, function (err, data) {
        if (err) throw err;
        console.log( data.toString() );
        prompt.show();
        return;
      });
    }
    catch ( err ) {
      console.log( err );
    }
  };

  this.timeElapse = function ( ms1, ms2 ) {
    var timeDiff = ms2 - ms1;
    timeDiff /= 1000;
    var seconds = parseInt(timeDiff % 60);
    timeDiff /= Math.round(60);
    var minutes = parseInt(timeDiff % 60);
    timeDiff /= Math.round(60);
    var hours = parseInt(timeDiff % 24);
    timeDiff /= Math.round(24);
    var days = parseInt(timeDiff);
    return days + 'd' + hours + 'h' + minutes + 'm' + seconds +'s';
  };

}

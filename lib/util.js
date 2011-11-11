exports.Util = new Util();

function Util () {
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

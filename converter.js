var sys = require('sys');
var fs = require('fs');
var S = require('string');
var util = require('util');
var exec = require('child_process').exec;
var child;

function doJob(pptPath, pptTitle, callback){
	var rel_dest = "public\\host_public\\" + pptTitle;
	var abs_dest = __dirname + "\\public\\host_public\\" + pptTitle;
	child = exec(__dirname+"/converter.exe " + pptPath + " " + abs_dest, function (error, stdout, stderr) {
	  sys.print('stdout: ' + stdout);
	  sys.print('stderr: ' + stderr);
	  if (error !== null) {
	    console.log('exec error: ' + error);
	  }
	  
	  fs.unlink(pptPath, function (err) {
		  if (err) throw err;
		  console.log('successfully deleted ' + pptPath);
	  });

	  var dir = fs.readdirSync(abs_dest);
	  var appendedDir = dir;
      for(var i=0; i < dir.length; i++){
		appendedDir[i] = rel_dest + "\\" + dir[i];
	  }
	  callback(appendedDir.sort(Comparator), rel_dest);
	});
}

function Comparator(a,b){
		a = a.split('\\');
		b = b.split('\\');
		a = a[a.length-1];
		b = b[b.length-1];
		a = a.split('.');
		b = b.split('.');
		a = a[0];
		b = b[0];
		var aRight = 0;
		var bRight = 0;
		if(a.length <= 6)
			aRight = 1;
		else
			aRight = 2;
		if(b.length <= 6)
			bRight = 1;
		else
			bRight = 2;

		a = S(a).right(aRight).toInt();
		b = S(b).right(bRight).toInt();
		if (a < b) return -1;
		if (a > b) return 1;
		return 0;
	}

function readPpt(dirPath, callback){
	var abs_dest = __dirname + "\\" + dirPath;
	var dir = fs.readdirSync(abs_dest);
	var appendedDir = dir;
	for(var i=0; i<dir.length; i++){
		appendedDir[i] = dirPath + "\\" + dir[i];
	}
	callback(appendedDir.sort(Comparator));
}
exports.doJob = doJob;
exports.readPpt = readPpt;


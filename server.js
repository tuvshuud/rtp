var conv = require('./converter');//*converter js iig import hiij baina
var admin = require('./admin');
var fs = require('fs');
var S = require('string');
var dl = require('delivery');
var util = require('util');
var express = require('express');
var app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

server.listen(8091);

var srvr = "192.168.1.4";

var slides = new Array();
var it = 0;

var usernames = {};
var chat_usernames = {};

//shalgah dundiin function
function checkAuth(req, res, next) {
   var whereTo = '';
   var whois = '';
   switch(req.path){
    case '/home': whereTo ='/login';
    				whois = 'user_id';
    				break;
   	case '/host': whereTo ='/host/login';
   					whois = 'host_id';
   					break;
   	case '/admin': whereTo ='/admin/login';
   					whois = 'admin_id'
   					break; 
  }
  console.log('>>>>>>>>>' + req.session['host_id']);
  if (!req.session[whois]) {
    res.send('Хандах эрх байхгүй байна. <a href="' + whereTo + '">Энэ</a> хуудас руу орж нэвтэрнэ үү.');
  } else {
    next();
  }
}

app.use(express.bodyParser({
	keepExtensions: true,
	uploadDir: __dirname + '/public/host_public/tmp',
	limit: '50mb'
}));
app.use(express.cookieParser()); 
app.use(express.session({secret: 'mongolia'}));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.configure('development', function(){
  app.use(express.errorHandler());
  app.locals.pretty = true;
});

// routing
app.get('/home', checkAuth, function (req, res) {
  res.render('client', {
  	user: req.session.user_id,
  	server: srvr
  });
});

app.get('/', function (req, res){
	res.render('index', {});
});

app.get('/login', function(req, res){
	res.render('login',
	{
		status: '',
		type: 'u'
	});
});

app.get('/logout', function (req, res) {
  delete req.session.user_id;
  delete req.session.host_id;
  delete req.session.admin_id;
  res.redirect('/');
});

app.post('/auth', function (req, res){
	var post = req.body;
	var data = {username: post.user, password: post.pwd};
	var table = '';
	var redirectURL = '';
	switch(post.type){
		case 'u': table='user';
				  redirectURL='/home';
				  break;
		case 'a': table='admin';
				  redirectURL='/admin'
				  break;
		case 'h': table='host';
				  redirectURL='/host'
				  break;
	}
	admin.select(table, data, function(collection){
		if(collection.length > 0){
			switch(post.type){
				case 'u': req.session.user_id = post.user;
						  usernames[post.user] = post.user;
						  break;
				case 'a': req.session.admin_id = post.user;
						  break;
				case 'h': req.session.host_id = post.user;
						  break;
			}
			res.redirect(redirectURL);			
		} else {
			res.render('login',{
				status: 'Нэвтрэх нэр/нууц үг буруу байна',
				type: post.type
			});
		}
	});
});

app.get('/host', checkAuth, function (req, res) {
	admin.select('ppts', '', function(data){
		console.log('>>$>>' + util.inspect(data));
		res.render('host', {
		  	server: srvr,
		  	user: req.session.host_id,
		  	ppts: JSON.stringify(data)
		  });
	});
});

app.post('/host', checkAuth, function(req, res){
	var post = req.body;
	var title = S(req.files.ppt.path).between('\\', '.').s
	var n = title.split('\\');
	var title = n[n.length-1];

	//Test to convert ppt
	//conv.doJob(<ppt path>, <ppt name>, callback)
																	//ene function tuhain ppt file zurag bolgoj zadlaad zaasan 
																	//foldert huulsan ii daraa image uudiin relative path uudiig
																	//array helbereer butsaaj bga. Odoo connection dotor bga bolohoor														//shine hun holbogdoh bolgon deer ppt iig zadlaj bn gsn ug 
	conv.doJob(req.files.ppt.path, title, function(data, url){
		slides = data;
		admin.add('ppts', {
			title: post.title,
			path: url,
			thumb: slides[0]
		}, function(isDone){
			res.redirect('/host');
		});
	});
});

app.get('/host/login', function(req, res){
	res.render('login', {
		type: 'h',
		status: ''
	})
});

app.get('/admin', checkAuth, function (req, res){
  res.render('admin', {
  	server: srvr
  });
});

app.get('/admin/login', function(req,res){
	res.render('login', {
		type: 'a',
		status: ''
	});
});
app.use("/public", express.static(__dirname + '/public'));


//Real work starts here
var adminSocket = io.of('/admin');

adminSocket.on('connection', function(socket){
	adminSocket.emit('status', 'Сервертэй холбогдлоо');
	admin.select('admin', '', function(data){
		adminSocket.emit('updateAdmin', data);
	});
	admin.select('host', '', function(data){
		adminSocket.emit('updateHost', data);
	});
	admin.select('user', '', function(data){
		adminSocket.emit('updateUser', data);
	});
	socket.on('addAdmin', function(data){
		admin.add('admin', data, function(isDone){
			if(isDone == 1){
				admin.select('admin', '', function(data){
					adminSocket.emit('updateAdmin', data);
					adminSocket.emit('status', 'Шинэ админ хэрэглэгч нэмэгдлээ');
				});	
			}
		});
	});

	socket.on('deleteAdmin', function(data){
		admin.del('admin', data, function(isDone){
				if(isDone == 1){
					admin.select('admin', '', function(data){
						adminSocket.emit('updateAdmin', data);
						adminSocket.emit('status', 'Амжилттай устгагдлаа');
					});
				}							
		});
	});

	socket.on('addUser', function(data){
		console.log('>>>>' + util.inspect(data));
		admin.add('user', data, function(isDone){
			if(isDone == 1){
				admin.select('user', '', function(data){
					adminSocket.emit('updateUser', data);
					adminSocket.emit('status', 'Шинэ хэрэглэгч нэмэгдлээ');
				});	
			}
		});
	});

	socket.on('deleteUser', function(data){
		admin.del('user', data, function(isDone){
				if(isDone == 1){
					admin.select('user', '', function(data){
						adminSocket.emit('updateUser', data);
						adminSocket.emit('status', 'Хэрэглэгч амжилттай устгагдлаа');
					});
				}							
		});
	});

	socket.on('actionHost', function(data){
		console.log('>>>>' + util.inspect(data));
		admin.del('host', '', function(isDone){
			console.log('\nStatus: ' + isDone);
			if(isDone == 1){
				admin.add('host', data, function(isDone){
					if(isDone == 1){
						admin.select('host', '', function(data){
							adminSocket.emit('updateHost', data);
							adminSocket.emit('status', 'Амжилттай шинэчлэгдлээ');
						});
					}					
				});
			}else{
				admin.select('host', '', function(collection){
					if (collection.length < 1){
						admin.add('host', data, function(isDone){
						console.log('>>>>' + util.inspect(data));
						if(isDone == 1){
							admin.select('host', '', function(data){
									adminSocket.emit('updateHost', data);
									adminSocket.emit('status', 'Амжилттай шинэчлэгдлээ');
								});
							}					
						});
					}
				});
			}
		})
	});
});
var chatSocket = io.of('/chat');
chatSocket.on('connection', function(socket){

	socket.on('sendchat', function (data) {
		console.log('CHAT' + data);
		chatSocket.emit('updatechat', socket.username, data);
	});

	socket.on('adduser', function(username){
		socket.username = username;
		chat_usernames[username] = username;
		console.log('CHAT: User added ' + socket.username);
		socket.emit('updatechat', 'SERVER', 'амжилттай холбогдлоо');
		socket.broadcast.emit('updatechat', 'SERVER', username + ' холбогдлоо');
		chatSocket.emit('updateusers', chat_usernames);
	});

	socket.on('disconnect', function(){
		delete chat_usernames[socket.username];
		chatSocket.emit('updateusers', chat_usernames);
		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' гарлаа');
	});
});

//////////////////////////////////////////////////////////////////////////////////////////////
//User bolon Host hesgiin websocket code uud
io.sockets.on('connection', function (socket) {
	
	console.log('condition apply ' + slides.length);
	if(slides.length < 1){
		console.log('condition apply');
		slides.push('\\public\\host_public\\default.JPG');
	}
	console.log('>>>>>>>>>INIT: ' + slides);
	io.sockets.emit('init', it, slides);
	
	io.sockets.emit('updateusers', usernames);

	socket.on('send_slide', function (type) {
		if(type=='next'){
			if( it < slides.length-1)
				it += 1;
			else
				it = 0;
		}
		if(type=='previous'){
			if( it > 0 )
				it -= 1;
			else
				it = slides.length-1;
		}
		if(type=='start'){
			it = 0;
		}
		if(type=='end'){
			it = slides.length - 1;
		}

		console.log("Action : " + type + " " + it);
		if(slides.length < 1){
			slides.push('\\public\\host_public\\default.JPG');
		}
		io.sockets.emit('update_slide', it, slides);
		socket.broadcast.emit('update_slide', it, slides);
	});

	socket.on('change_ppt', function(id){
		admin.select('ppts', {
			title: id
		}, function(data){
			console.log('About to change to ' + util.inspect(data));
			conv.readPpt(data[0].path, function(s){
				slides = s;
				it = 0;
				if(slides.length < 1){
					slides.push('\\public\\host_public\\default.JPG');
				}
				io.sockets.emit('update_slide', it, slides);
				socket.broadcast.emit('update_slide', it, slides);
				socket.broadcast.emit('update_title', id);
			});
		});
	});
	socket.on('delete_ppt', function(id){
		//admin.select('ppts', {title: id}, function(data){
		//	fs.unlink(data[0].path, function (err) {
		//		if (err) throw err;
		//		console.log('successfully deleted ' + pptPath);
		//	});
		//});
		admin.del('ppts', {title: id}, function(isDone){
			if(isDone==1){
				slides = [];
				slides.push('\\public\\host_public\\default.JPG');
				socket.broadcast.emit('update_slide', it, slides);
				io.sockets.emit('delete_success', id);
			}
		})
	});
	socket.on('disconnect', function(){
		delete usernames[socket.username];
		io.sockets.emit('updateusers', usernames);
	});
});



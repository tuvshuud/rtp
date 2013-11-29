function say(msg, type){
	$('.bottom-right').notify({
      message: { text: msg },
      type: type
      }).show();
}
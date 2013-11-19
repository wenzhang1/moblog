var xss = require('xss');

exports.format_date = function (date) {
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDate();
  var hour = date.getHours();
  var minute = date.getMinutes();
  var second = date.getSeconds();
  
  //month = ((month < 10) ? '0' : '') + month;
  //day = ((day < 10) ? '0' : '') + day;
  hour = ((hour < 10) ? '0' : '') + hour;
  minute = ((minute < 10) ? '0' : '') + minute;
  second = ((second < 10) ? '0': '') + second;
  
  return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
};

exports.article_tran = function(a_array){
	for(var i = 0; i < a_array.length; i++){
		a_array[i].content = a_array[i].content.replace(/<img[^>]*>/ig, "<p>[图片]</p>");
		a_array[i].content = a_array[i].content.replace(/<pre\s[^>]*>[\s\S]*?<\/pre>/ig, "<p>[代码]</p>");
		a_array[i].content = a_array[i].content.replace(/(<([^>]+)>)/gi, "");
		a_array[i].content = a_array[i].content.replace(/\s*/ig, "");
		a_array[i].content = a_array[i].content.substr(0, 55);
		a_array[i].content = a_array[i].content.concat("......");
	}
}

exports.xss = function (html) {
  return xss(html);
};
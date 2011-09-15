$(document).ready(function() {

    var user_id = $.cookie('user_id');
    var chat_id = $.cookie('chat_id');

    var href = $(location).attr('href');
    var next = href.search("next=");
    if (next > 1) {
        chat_id = href.substring(next+8);
    }

    if (user_id) {
        $("#user_id").val(user_id);
    }
    if (chat_id) {
        $("#chat_id").val(chat_id);
    }

    $("#user_id").select();

    if (!("WebSocket" in window) && !("MozWebSocket" in window)) {
        $("#websocketfail").css("display", "inline-block");
    }
    else {
        $("#startchat").live("click", startChat);
        $("#strangerchat").live("click", strangerChat);
        $("#user_id").live("keypress", function(e) {
            if (e.keyCode == 13) {
                startChat();
                return false;
            }
        });
        $("#chat_id").live("keypress", function(e) {
            if (e.keyCode == 13) {
                startChat();
                return false;
            }
        });
        $("td a").live("click", function() {
            $.cookie('user_id', $("#user_id").val(), { expires: 365 });
            return true;
        });
    }

});

function randomString(len) {
    var text = "";
    var alphanumeric = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i=0; i<len; i++) {
        text += alphanumeric.charAt(Math.floor(Math.random() * alphanumeric.length));
    }

    return text;
}

function startChat() {
    $.cookie('user_id', $("#user_id").val(), { expires: 365 });
    var chat_id = $('#chat_id').val();
    if (chat_id != "") {
        window.location.href = "/" + chat_id;
    }
    else {
        window.location.href = "/" + randomString(7);
    }
}

function strangerChat() {
    $.cookie('user_id', $("#user_id").val(), { expires: 365 });
    window.location.href = "/stranger";
}

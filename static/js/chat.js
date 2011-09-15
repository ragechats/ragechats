var has_connected = false;
var lastmessage = "";

$(document).ready(function() {

    chat_id = $(location).attr('pathname').replace("/","");
    $.cookie('chat_id', chat_id, { expires: 365 });

    $("#msgform").live("submit", function() {
        newMessage($(this));
        return false;
    });
    $("#msgform").live("keypress", function(e) {
        if (e.keyCode == 13) {
            newMessage($(this));
            return false;
        }
    });

    $("#message").keyup(function(e) {
        if (e.keyCode == 38) {
            $("#message").val(lastmessage);
            return false;
        }
    });
    $("#message").keyup(function(e) {
        if (e.keyCode == 40) {
            $("#message").val("");
            return false;
        }
    });

    $("a span.rage").click(function() {
        $("#message").val($("#message").val() + " " +$(this).parent().attr("title") + " ");
        $("#message").focus();
        return false;
    });

    $("#message").select();
    updater.start();
});

function newMessage(form) {
    var message = $("#message").val();
    if (message) {
        updater.socket.send(message);
        lastmessage = message;
        $("#message").val("").select();
    }
}

var updater = {
    socket: null,

    start: function() {
        host = $(location).attr('host');
        chat_id = $(location).attr('pathname').replace("/","");

        document.title = "ragechats.com | " + chat_id;
        if ("WebSocket" in window) {
            updater.socket = new WebSocket("ws://"+host+"/websocket/"+chat_id);
        }
        else if ("MozWebSocket" in window) {
            updater.socket = new MozWebSocket("ws://" +host+"/websocket/"+chat_id);
        }
        else {
            window.location = "http://"+host+"/";
        }

        updater.socket.onopen = function(event) {
            has_connected = true;
        }

        updater.socket.onclose = function(event) {
            html = "<div class='alert-message block-message error'>WebSocket connection closed.</div><br>";
            $("#inbox").append(html);

            if (!has_connected) {
                html = "<div class='alert-message block-message error'>If the websocket connection is closing immediately you are connecting through a proxy that does not support HTTP/1.1 keepalive requests.</div><br>";
                $("#inbox").append(html);
            }
            $("#inbox").scrollTop($("#inbox")[0].scrollHeight);
        }

        updater.socket.onmessage = function(event) {
            $("#inbox").append(processMessage(event.data));
            $("#inbox").scrollTop($("#inbox")[0].scrollHeight);

        }
    }
};

function processMessage(message) {

    message = $.parseJSON(message);

    if (message.type == "chat") {
        message = "<p><b>"+message.user_id+"</b> "+message.body+"</p>";
    }

    else if (message.type.indexOf("info") > 0) {
        message = "<div class='"+message.type+"'>"+message.body+"</div><br>";
    }

    else if (message.type.substring(0,13) == "alert-message") {
        message = "<div class='"+message.type+"'><strong>"+message.user_id+"</strong> "+message.body+"</div><br>";
    }

    // Make links open in a new tab/window
    message = message.replace(" href=", " target='_blank' href=");

    // Rage faces
    while (rageface = /\s\/[a-z0-9]+\b/g.exec(message)) {
        if (rageface[0].substring(1) in RAGEFACES) {
            message = message.replace(rageface[0], "<span class='rage "+rageface[0].substring(2)+"'></span>");
        }
        else {
            message = message.replace(rageface[0], "//" + rageface[0].substring(2));
        }
    }

    // bold+red *text*
    while (bold = /[*][A-Za-z0-9?!@#$%^&()_\[\]{}\s-]+[*]/g.exec(message)) {
        message = message.replace(bold[0], "<strong>" + bold[0].substring(1, bold[0].length-1) + "</strong>");
    }

    // italics _text_
    while (italics = /[_][A-Za-z0-9?!@#$%^&*()\[\]{}\s-]+[_]/g.exec(message)) {
        message = message.replace(italics[0], "<i>" + italics[0].substring(1, italics[0].length-1) + "</i>");
    }

    // strikeout --text--
    while (strikeout = /[-]{2}[A-Za-z0-9?!@#$%^&*()_\[\]{}\s-]+[-]{2}/g.exec(message)) {
        message = message.replace(strikeout[0], "<span class='strikeout'>" + strikeout[0].substring(2, strikeout[0].length-2) + "</span>");
    }

    return message;
}

function WebSocketClose() {
    html = "<div class='alert-message block-message error'>WebSocket connection closed.";

    if (!has_connected) {
        html += "<p>You are connecting through a proxy that does not support HTTP/1.1 websocket connections.</p>";
    }

    html += "</div><br>";

    $("#inbox").append(html);
    $("#inbox").scrollTop($("#inbox")[0].scrollHeight);
}

var RAGEFACES = {

    // 0px Neutral, Determined
    "/dude": 1,
    "/yawn": 2,
    "/quite": 3,
    "/dazed": 4,
    "/pokerface": 5,
    "/badpokerface": 6,
    "/hmmm": 7,
    "/challengeaccepted": 8,
    "/determined": 9,
    "/reallydetermined": 10,

    // -64px Happy
    "/smile": 1,
    "/blistful": 2,
    "/fakesmile": 3,
    "/excited": 4,
    "/excitedtears": 5,
    "/foreveraloneexcited": 6,
    "/ewbte": 7,
    "/awwwyeah": 8,
    "/closeenough": 9,
    "/hatersgonnahate": 10,

    // -128px Laughing
    "/fuckthatbitch": 1,
    "/lol": 2,
    "/lolright": 3,
    "/lolleft": 4,
    "/pfft": 5,
    "/pfft2": 6,
    "/high": 7,
    "/sweettears": 8,
    "/reddit":  10,

    // -192px Pleasure
    "/megusta": 1,
    "/creepymegusta": 2,
    "/fapfap": 3,
    "/fapfapquite": 4,
    "/fffffffuuuuuuuuuuuud": 5,
    "/sonmegusta": 6,
    "/sweetjesus": 7,
    "/dogsweetjesus": 8,
    "/drunk": 9,
    "/blistfulnotgiveafuck": 10,

    // -256px Surprised, Amazed
    "/ohgod": 1,
    "/surprised": 2,
    "/dumbfoundedkid": 3,
    "/dumbfounded": 4,
    "/what": 5,
    "/milk": 6,
    "/lean": 7,
    "/gasp": 8,
    "/clevergirl": 9,
    "/obamanotbad": 10,

    // -320px Sad, Stupid
    "/sad": 1,
    "/busted": 2,
    "/why": 3,
    "/crying": 4,
    "/foreveralone": 5,
    "/okay": 6,
    "/areyoukiddingme": 7,
    "/retarded": 8,
    "/thefuck": 9,
    "/seriouslychan": 10,

    // -384px Troll
    "/troll": 1,
    "/insanetroll": 2,
    "/melvin": 3,
    "/gaytroll": 4,
    "/ifeelsyabra": 5,
    "/trolldad": 6,
    "/trolldadjump": 7,
    "/ilied": 8,
    "/evilsmile": 9,
    "/hitler": 10,

    // -448px Angry
    "/mad": 1,
    "/mad2": 2,
    "/foaming": 3,
    "/pissed": 4,
    "/shaking": 5,
    "/stare": 6,
    "/yuno": 7,
    "/no": 8,
    "/dad": 9,
    "/mom": 10,

    // -512px Rage
    "/rage1": 1,
    "/rage2": 2,
    "/ragenuclear": 3,
    "/rageomega": 4,
    "/rageextreme": 5,
    "/epicbeardguy": 6,
    "/ragecanadian": 7,
    "/rageredditalien": 8,
    "/ragecat": 9,
    "/retarddog": 10,

    // -576px Misc.
    "/fumanchu": 1,
    "/beerguy": 3,
    "/cerealspitting": 4,
    "/newspaperguy": 5,
    "/newspapertear": 6,
    "/gtfo": 7,
    "/truestory": 8,
    "/grandmashit": 9,
    "/freddie": 10

};

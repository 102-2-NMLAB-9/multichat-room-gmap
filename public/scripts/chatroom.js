Array.remove = function(array, from, to) {
    var rest = array.slice((to || from) + 1 || array.length);
    array.length = from < 0 ? array.length + from : from;
    return array.push.apply(array, rest);
};

//this variable represents the total number of popups can be displayed according to the viewport width
markers = [];
var total_popups = 0;
var serverAddress = '';
var NICK_MAX_LENGTH = 15;
var ROOM_MAX_LENGTH = 10;
var socket = null;
var clientId = null;
var nickname = null;
var srverDisplayName = 'Server';
var serverDisplayColor = '#1c5380';
var tmplt = {
    room: [
        '<li data-roomId="${room}">',
            '<span class="icon"></span> ${room}',
        '</li>'
    ].join(""),
    client: [
        '<li data-clientId="${clientId}" class="cf">',
            '<div class="fl clientName"><span class="icon"></span> ${nickname}</div>',
            '<div class="fr composing"></div>',
        '</li>'
    ].join(""),
    message: [
        '<li class="cf">',
            '<div class="fl sender">${sender}: </div><div class="fl text">${text}</div><div class="fr time">${time}</div>',
        '</li>'
    ].join("")
};


//arrays of popups ids
popups = [];


function handleNickname(){
    var nick = $('#nickname-popup .input input').val().trim();
    if(nick && nick.length <= NICK_MAX_LENGTH){
        nickname = nick;
        Avgrund.hide();
        connect();
    } else {
        shake('#nickname-popup', '#nickname-popup .input input', 'tada', 'yellow');
        $('#nickname-popup .input input').val('');
    }
}

$(function(){ bindDOMEvents(); });

function createRoom(){
    var room = $('#addroom-popup .input input').val().trim();
    console.log(room);
    if(room && room.length <= ROOM_MAX_LENGTH){
        // create and subscribe to the new room

console.log("lct= "+lct);
        socket.emit('subscribe', { room: room, locat: lct });
        Avgrund.hide();
    } else {
        shake('#addroom-popup', '#addroom-popup .input input', 'tada', 'yellow');
        $('#addroom-popup .input input').val('');
    }
}

function bindDOMEvents(){
    $('#nickname-popup .input input').on('keydown', function(e){
            var key = e.which || e.keyCode;
            if(key == 13) { handleNickname(); }
            });

    $('#nickname-popup .begin').on('click', function(){
            handleNickname();
            });

    $('#addroom-popup .input input').on('keydown', function(e){
            var key = e.which || e.keyCode;
            if(key == 13) { createRoom(); }
            });
    $('#addroom-popup .create').on('click', function(){
            createRoom();
            });
    $('.chat-rooms ul').on('scroll', function(){
            $('.chat-rooms ul li.selected').css('top', $(this).scrollTop());
            });
    $('.chat-messages').on('scroll', function(){
            var self = this;
            window.setTimeout(function(){
                if($(self).scrollTop() + $(self).height() < $(self).find('ul').height()){
                $(self).addClass('scroll');
                } else {
                $(self).removeClass('scroll');
                }
                }, 50);
            });
    /*
    $('.chat-rooms ul li').live('click', function(){
            var room = $(this).attr('data-roomId');
            if(room != currentRoom){
            socket.emit('unsubscribe', { room: currentRoom });
            socket.emit('subscribe', { room: room });
            }
            });
    */
}

function bindSocketEvents(){
    // when the connection is made, the server emiting
    // the 'connect' event
    socket.on('connect', function(){
            // firing back the connect event to the server
            // and sending the nickname for the connected client
            socket.emit('connect', { nickname: nickname });
            });
    // after the server created a client for us, the ready event
    // is fired in the server with our clientId, now we can start 
    socket.on('ready', function(data){
            // hiding the 'connecting...' message
            $('.chat-shadow').animate({ 'opacity': 0 }, 200, function(){
                $(this).hide();
                $('.chat input').focus();
                });
            // saving the clientId localy
            clientId = data.clientId;
            });
    // after the initialize, the server sends a list of
    // all the active rooms
    socket.on('roomslist', function(data){
            for(var i = 0, len = data.length; i < len; i++){
            // in socket.io, their is always one default room
            // without a name (empty string), every socket is automaticaly
            // joined to this room, however, we don't want this room to be
            // displayed in the rooms list

            if(data[i].room != ''){
                // place marker on map
                addRoom(data[i].room, data[i].locat, false);
            }
            }
            });
    // when someone sends a message, the sever push it to
    // our client through this event with a relevant data
    socket.on('chatmessage', function(data){
            var nickname = data.client.nickname;
            var message = data.message;
            //display the message in the chat window
            insertMessage(nickname, message, data.room, true, false, false);
            });
    // when we subscribes to a room, the server sends a list
    // with the clients in this room
    socket.on('roomclients', function(data){
            // add the room name to the rooms list
            addRoom(data.room, data.locat, false);
            // set the current room
            //setCurrentRoom(data.room);

            // announce a welcome message
            insertMessage(serverDisplayName, 'Welcome to the room: `' + data.room + '`... enjoy!', true, false, true);
            //$('.chat-clients ul').empty();
            // add the clients to the clients list
            addClient({ nickname: nickname, clientId: clientId }, false, true);
            for(var i = 0, len = data.clients.length; i < len; i++){
            if(data.clients[i]){
            addClient(data.clients[i], false);
            }
            }
            // hide connecting to room message message
            $('.chat-shadow').animate({ 'opacity': 0 }, 200, function(){
                $(this).hide();
                $('.chat input').focus();
                });
    });
    // if someone creates a room the server updates us
    // about it
    socket.on('addroom', function(data){
            addRoom(data.room, data.locat, true);
            });
    // if one of the room is empty from clients, the server,
    // destroys it and updates us
    socket.on('removeroom', function(data){
            removeRoom(data.room, true);
            });
    // with this event the server tells us when a client
    // is connected or disconnected to the current room
    socket.on('presence', function(data){
            if(data.state == 'online'){
            addClient(data.client, true);
            } else if(data.state == 'offline'){
            removeClient(data.client, true);
            }
            });
}

function connect(){
    // creating the connection and saving the socket
    socket = io.connect(serverAddress);

    // now that we have the socket we can bind events to it
    bindSocketEvents();
}

function shake(container, input, effect, bgColor){
    lockShakeAnimation = true;
    $(container).addClass(effect);
    $(input).addClass(bgColor);
    window.setTimeout(function(){
            $(container).removeClass(effect);
            $(input).removeClass(bgColor);
            $(input).focus();
            false;
            }, 1500);
}

//this is used to close a popup
function close_popup(id)
{
    for(var iii = 0; iii < popups.length; iii++)
    {
        if(id == popups[iii])
        {
            Array.remove(popups, iii);

            document.getElementById(id).style.display = "none";

            calculate_popups();

            return;
        }
    }
}

//displays the popups. Displays based on the maximum number of popups that can be displayed on the current viewport width
function display_popups()
{
    var right = 220;

    var iii = 0;
    for(iii; iii < total_popups; iii++)
    {
        if(popups[iii] != undefined)
        {
            var element = document.getElementById(popups[iii]);
            element.style.right = right + "px";
            right = right + 320;
            element.style.display = "block";
        }
    }

    for(var jjj = iii; jjj < popups.length; jjj++)
    {
        var element = document.getElementById(popups[jjj]);
        element.style.display = "none";
    }
}

//creates markup for a new popup. Adds the id to popups array.
function register_popup(id, name)
{
    for(var iii = 0; iii < popups.length; iii++) {   
        //already registered. Bring it to front.
        if(id == popups[iii]) {
            Array.remove(popups, iii);

            popups.unshift(id);
            calculate_popups();

            return;
        }
    }               

    var element = '<div class="popup-box chat-popup" id="'+ id +'">';
    element = element + '<div class="popup-head">';
    element = element + '<div class="popup-head-left">'+ name +'</div>';
    element = element + '<div class="popup-head-right"><a href="javascript:close_popup(\''+ id +'\');">&#10005;</a></div>';
    element = element + '<div style="clear: both"></div></div>';
    element = element + '<div class="popup-messages"><ul></ul></div>';
    element = element + '<input class="popup-input" type="text" placeholder="Type here..." autofocus /></div>';

    $( "body" ).append(element);
    var tmp = '#'+id+' input';
    
    $(tmp).on('keydown', function(e){
        var key = e.which || e.keyCode;
        if(key == 13 || key == 10) { handleMessage($(tmp), name); }
    });

    popups.unshift(id);

    calculate_popups();
}

// insert a message to the chat window, this function can be
// called with some flags
function insertMessage(sender, message, roomName, showTime, isMe, isServer){
    var target = '#'+roomName+' .popup-messages';
    var $html = $.tmpl(tmplt.message, {
        sender: sender,
        text: message,
        time: showTime ? getTime() : ''
    });
    // if isMe is true, mark this message so we can
    // know that this is our message in the chat window
    if(isMe){
        $html.addClass('marker');
    }
    // if isServer is true, mark this message as a server
    // message
    if(isServer){
        $html.find('.sender').css('color', serverDisplayColor);
    }
    console.log(target+' ul');
    $html.appendTo(target+' ul');
    $(target).animate({ scrollTop: $(target+' ul').height() }, 100);
}

// handle the client messages
function handleMessage(input_obj, roomName){
    var message = input_obj.val().trim();
    if(message){
        // send the message to the server with the room name
        socket.emit('chatmessage', { message: message, room: roomName });
        // display the message in the chat window
        insertMessage(nickname, message, roomName, true, true);
        input_obj.val('');
    }
}

function click_subscribe(roomName){
    socket.emit('subscribe', {room: roomName});
}

// return a short time format for the messages
function getTime(){
    var date = new Date();
    return (date.getHours() < 10 ? '0' + date.getHours().toString() : date.getHours()) + ':' +
        (date.getMinutes() < 10 ? '0' + date.getMinutes().toString() : date.getMinutes());
}

function addRoom(name, pos, announce){
    // clear the trailing '/'
    name = name.replace('/','');
    // check if the room is not already in the list
    var isCreated = false;
    for(var i=0; i<popups.length; i++) {
        if(popups[i] == name) isCreated = true;
    }
    if(!isCreated){
        console.log(name);
        console.log(pos);
        newmap_marker(pos, name);
//        $.tmpl(tmplt.room, { room: name }).appendTo('.chat-rooms ul');
        // if announce is true, show a message about this room
        if(announce){
            insertMessage(serverDisplayName, 'The room `' + name + '` created...', true, false, true);
        }
    }
}

// remove a room from the rooms list
function removeRoom(name, announce){
    $('.chat-rooms ul li[data-roomId="' + name + '"]').remove();
    // if announce is true, show a message about this room
    if(announce){
        insertMessage(serverDisplayName, 'The room `' + name + '` destroyed...', true, false, true);
    }
}
// add a client to the clients list
function addClient(client, announce, isMe){
    var $html = $.tmpl(tmplt.client, client);
    // if this is our client, mark him with color
    if(isMe){
        $html.addClass('me');
    }
    // if announce is true, show a message about this client
    if(announce){
        insertMessage(serverDisplayName, client.nickname + ' has joined the room...', true, false, true);
    }
    $html.appendTo('.chat-clients ul')
}

function removeClient(client, announce){
    $('.chat-clients ul li[data-clientId="' + client.clientId + '"]').remove();
    // if announce is true, show a message about this room
    if(announce){
        insertMessage(serverDisplayName, client.nickname + ' has left the room...', true, false, true);
    }
}

//calculate the total number of popups suitable and then populate the toatal_popups variable.
function calculate_popups()
{
    var width = window.innerWidth;
    if(width < 540)
    {
        total_popups = 0;
    }
    else
    {
        width = width - 200;
        //320 is width of a single popup box
        total_popups = parseInt(width/320);
    }

    display_popups();

}

//recalculate when window is loaded and also when window is resized.
window.addEventListener("resize", calculate_popups);
window.addEventListener("load", calculate_popups);

Array.remove = function(array, from, to) {
    var rest = array.slice((to || from) + 1 || array.length);
    array.length = from < 0 ? array.length + from : from;
    return array.push.apply(array, rest);
};

//this variable represents the total number of popups can be displayed according to the viewport width
var total_popups = 0;

//arrays of popups ids
var popups = [];

function handleNickname(){
    $('#nickname-popup .input input').val('');
    Avgrund.show('#nickname-popup');
    window.setTimeout(function(){
            $('#nickname-popup .input input').focus();
            },100);
    var nick = $('#nickname-popup .input input').val().trim();
    console.log(nick);
    if(nick && nick.length <= NICK_MAX_LENGTH){
        nickname = nick;
        Avgrund.hide();
        connect();
    } else {
        shake('#nickname-popup', '#nickname-popup .input input', 'tada', 'yellow');
        $('#nickname-popup .input input').val('');
    }
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
            for(var i = 0, len = data.rooms.length; i < len; i++){
            // in socket.io, their is always one default room
            // without a name (empty string), every socket is automaticaly
            // joined to this room, however, we don't want this room to be
            // displayed in the rooms list
            if(data.rooms[i] != ''){
            addRoom(data.rooms[i], false);
            }
            }
            });
    // when someone sends a message, the sever push it to
    // our client through this event with a relevant data
    socket.on('chatmessage', function(data){
            var nickname = data.client.nickname;
            var message = data.message;
            //display the message in the chat window
            insertMessage(nickname, message, true, false, false);
            });
    // when we subscribes to a room, the server sends a list
    // with the clients in this room
    socket.on('roomclients', function(data){
            // add the room name to the rooms list
            addRoom(data.room, false);
            // set the current room
            setCurrentRoom(data.room);

            // announce a welcome message
            insertMessage(serverDisplayName, 'Welcome to the room: `' + data.room + '`... enjoy!', true, false, true);
            $('.chat-clients ul').empty();
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
            addRoom(data.room, true);
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
    // show connecting message
    $('.chat-shadow .content').html('Connecting...');

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

    for(var iii = 0; iii < popups.length; iii++)
    {   
        //already registered. Bring it to front.
        if(id == popups[iii])
        {
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
    element = element + '<div style="clear: both"></div></div><div class="popup-messages"></div></div>';

    document.getElementsByTagName("body")[0].innerHTML = document.getElementsByTagName("body")[0].innerHTML + element;  

    popups.unshift(id);

    calculate_popups();

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

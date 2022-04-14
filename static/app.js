class Belay extends React.Component {
    constructor(props) {
         super(props);
         this.state = {
            path: window.location.pathname,
            view: "home",
            isLoggedIn: true,
            username: "",
            channels: [],
            channel: "",
            messages: [],
            replies: [],
            messageId: "",
            message: {}, 
            unreadMessages: {}
        };

        window.addEventListener("popstate", (event)=>{
            let newPath;
            if (event.state) {
                newPath = event.state.path;
            } else {
                newPath = window.location.pathname;
            }
            this.changeUrl(newPath, false);
        });

    }

    componentDidMount() {
        this.changeUrl(this.state.path);
        this.checkLoggedIn();
        this.getChannels();
        this.getMessages(this.state.channel);
        this.getReplies(this.state.messageId); 
    }
    

    newPathSetter = (newPath, pushToHistory=false) => { 
        this.setState({path: newPath});
        if(pushToHistory) {
            window.history.pushState({path: newPath},"", newPath);
        }
    }

    changeUrl(url, push=true) {
        let urlPieces = url.split("/");
        let lenUrl = urlPieces.length;
        this.newPathSetter(url, push);
        if (lenUrl == 2) {
            let channel = urlPieces[lenUrl - 1];
            if (!channel) {
                //home view
                this.setState({
                    path: url,
                    view: "home"
                    });
            }
            else {
                //channel view
                this.setState({
                    path: url,
                    view: "channel",
                    channel: channel
                    });
            }
        }
        else if (lenUrl == 3 ) {
            //replies view
            let messageId = urlPieces[lenUrl - 1];
            let belay = this;
            fetch(`/api/get_msg_body/${messageId}`, {
                    method: 'GET', 
                    headers: {
                    'Content-Type': 'application/json'
                    }
            }).then(function (response) {
                return response.json();
            }).then(function (msg_info) {
                belay.setState({
                path: url,
                view: "replies",
                channel: urlPieces[lenUrl - 2],
                messageId: messageId,
                message: msg_info.message
                });
            });   
        } 
    }

    checkLoggedIn() {
        const belay = this;
        let cnetId = "cbrewster";
        let authKey = window.localStorage.getItem("auth_key");

        // check if logged in already
        if (authKey && authKey.includes(cnetId)) {
                //logged in - get username 
                fetch(`/api/check_loggedin`, {
                    method: 'GET', 
                    headers: {
                    'Content-Type': 'application/json',
                    'auth_key': authKey, 
                    }
                }).then(function (response) {
                    return response.json();
                }).then(function (user_info) {
                    if (user_info.username == "invalid auth key") {
                        window.localStorage.removeItem("auth_key");
                        belay.setState({isLoggedIn: false}); 
                    }
                    else {
                        belay.setState({username: user_info.username, 
                                        isLoggedIn: true}); 
                    }
                })
        } else {
            belay.setState({isLoggedIn: false}); 
        }
    }

    createAccount() {
        const belay = this;
        let login_block = document.querySelector(".form-page");

        let usernameBox = document.getElementById("username");
        let username = usernameBox.value;
        usernameBox.value = "";

        let passwordBox = document.getElementById("password");
        let password = passwordBox.value;
        passwordBox.value = "";

        fetch(`/api/new_user/${username}`, {
            method: 'POST', 
            headers: {
            'Content-Type': 'application/json',
            'password': password, 
            }
        }).then(function (response) {
            return response.json();
        }).then(function (user_info) {
            if (user_info.username_valid == false) {
                //username taken
                let error = document.createElement("error");
                error.append("Username already taken");
                login_block.appendChild(error);
                setTimeout(function() {
                    login_block.removeChild(login_block.lastChild);
                }, 2000);
            } else {
                //can proceed - save info
                window.localStorage.setItem("auth_key", user_info.auth_key);
                belay.setState({
                    isLoggedIn: true,
                    username: username}); 
            }
        })
    }


    login() {
        const belay = this;
        let loginBlock = document.querySelector(".form-page");

        let usernameBox = document.getElementById("username");
        let username = usernameBox.value;
        usernameBox.value = "";

        let passwordBox = document.getElementById("password");
        let password = passwordBox.value;
        passwordBox.value = "";

        fetch(`/api/existing_user/${username}`, {
            method: 'POST', 
            headers: {
            'Content-Type': 'application/json',
            'password': password, 
            }
        }).then(function (response) {
            return response.json();
        }).then(function (user_info) {
            if (user_info.username_found == false) {
                // username not found
                let error = document.createElement("error");
                error.append("Username not found");
                loginBlock.appendChild(error);
                setTimeout(function() {
                    loginBlock.removeChild(loginBlock.lastChild);
                }, 2000);
            } else if (user_info.correct_pw == false) {
                // incorrect password
                let error = document.createElement("error");
                error.append("Incorrect password");
                loginBlock.appendChild(error);
                setTimeout(function() {
                    loginBlock.removeChild(loginBlock.lastChild);
                }, 2000);
            } else {
                // can proceed - save info
                window.localStorage.setItem("auth_key", user_info.auth_key);
                belay.setState({
                    isLoggedIn: true,
                    username: username}); 
            }
        });
    }
    
    getChannels() {
        const belay = this;
        let authKey = window.localStorage.getItem("auth_key");
        fetch(`/api/get_channels`, {
                    method: 'GET', 
                    headers: {
                    'Content-Type': 'application/json',
                    'auth_key': authKey, 
                    }
        }).then(function (response) {
            return response.json();
        }).then(function (channel_info) {
            belay.setState({channels: channel_info.channels,
                            unreadMessages: channel_info.unread_messages});  
        }).then(function () {
            belay.getChannels();
        });
    }
            
    triggerChannelForm() {
        this.setState({view: "new channel",
                       path: "/"})
        this.newPathSetter(`/`, true); 
    }

    createChannel() {
        const belay = this;
        let channelBlock =  document.querySelector(".form-page");
        let channelBox = document.getElementById("newchannel");
        let ch_value = channelBox.value;
        let lower_ch_value= ch_value.toLowerCase();
        let hyphen_ch_value= lower_ch_value.replace(/ /g, '-');
        let newChannelName= hyphen_ch_value.replace(/[^\w-]+/g, '')
        channelBox.value = "";

        let auth_key = window.localStorage.getItem("auth_key");
        fetch(`/api/create/${newChannelName}`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'auth_key': auth_key
            }
        }).then(function (response) {
            return response.json();
        }).then(function (newchannel) {
            if (newchannel.name_valid == false) {
                // username not found
                let error = document.createElement("error");
                error.append("Channel Already Exists");
                channelBlock.appendChild(error);
                setTimeout(function() {
                    channelBlock.removeChild(channelBlock.lastChild);
                }, 2000);
            }
            else {
                //update list of channels in state
                let curChannels = belay.state.channels.slice();
                curChannels.push(newChannelName);
                belay.setState({
                    path:`/${newChannelName}`,
                    channels: curChannels,
                    view: "channel",
                    channel: newChannelName
                });
                belay.newPathSetter(`/${newChannelName}`, true);    
            }
        });
    }

    getMessages(channel){
        const belay = this;
        let authKey = window.localStorage.getItem("auth_key");
        if (this.state.view == "channel" && channel && this.state.isLoggedIn) {
            //make sure we are on channel view, have a state channel set, and are logged in
            fetch(`/api/${channel}/get_messages`, {
                    method: 'POST', 
                    headers: {
                    'Content-Type': 'application/json',
                    'auth_key': authKey
                    }
            }).then(function (response) {
                return response.json();
            }).then(function (msg_info) {
                //only update if messages have changed
                if (JSON.stringify(msg_info.messages) != JSON.stringify(belay.state.messages)) {
                    belay.setState({messages: msg_info.messages});  
                }
            }).then(function () {
                belay.getMessages(belay.state.channel);
            });
        } else {
            setTimeout(function() {
                belay.getMessages(belay.state.channel);
            }, 2);
        }    
    }

    postNewMessage = (channel) => {
        const belay = this;
        let authKey = window.localStorage.getItem("auth_key");

        let message = document.getElementById("new message").value;       
        let encoded_message = encodeURI(message);

        fetch(`/api/${channel}/post_message`, {
                    method: 'POST', 
                    headers: {
                    'Content-Type': 'application/json',
                    'auth_key': authKey, 
                    'body': encoded_message, 
                    'author': belay.state.username
                    }
            }).then(function (){
            // update list of messages in state
            document.getElementById("new message").value = "";
            let curMessages = belay.state.messages.slice();
            curMessages.push({"body": message, "author": belay.state.username});
            belay.setState({messages: curMessages});
        })
    }

    getReplies(messageId){
        const belay = this;
        let authKey = window.localStorage.getItem("auth_key");

        if (messageId) {
            //only fetch if in message reply view (i.e. have messageId)
            fetch(`/api/get_replies/${messageId}`, {
                    method: 'GET', 
                    headers: {
                    'Content-Type': 'application/json',
                    'auth_key': authKey
                    }
            }).then(function (response) {
                return response.json();
            }).then(function (reply_info) {
                // only update replies if they have changed
                if (JSON.stringify(reply_info.replies) != JSON.stringify(belay.state.replies)) {
                    belay.setState({replies: reply_info.replies});
                }
            }).then(function () {
                belay.getReplies(belay.state.messageId);
            });
        } else {
            setTimeout(function() {
                belay.getReplies(belay.state.messageId);
            }, 2);
        }
    }

    postNewReply = (messageId) => {
        const belay = this;
        let authKey = window.localStorage.getItem("auth_key");

        let reply = document.getElementById("new message").value;       
        let encoded_reply = encodeURI(reply);

        fetch(`/api/post_reply/${messageId}`, {
                    method: 'POST', 
                    headers: {
                    'Content-Type': 'application/json',
                    'auth_key': authKey, 
                    'body': encoded_reply, 
                    'author': belay.state.username
                    }
            }).then(function (){
            // update list of replies in state
            document.getElementById("new message").value = "";
            let curReplies = belay.state.replies.slice();
            curReplies.push({"body": reply, "author": belay.state.username});
            belay.setState({replies: curReplies});
        })
    }

    render() {
        console.log("state at render belay:", this.state);

        // need to login
        if (!this.state.isLoggedIn){
            return (
            <LogInBox 
                loginHandler={()=>this.login()}
                newUserHandler = {()=>this.createAccount()}/>
                
            );
        }   
        //home view
       if (this.state.view == "home") {

           return (
                <div className="channel-view">
                <ChannelMenu 
                    channel = {this.state.channel}
                    channels = {this.state.channels}
                    unreadMessages = {this.state.unreadMessages}
                    clickChannelHandler = {(i)=>this.changeUrl(i)}
                    triggerFormHandler = {()=>this.triggerChannelForm()}/> 
                <div className="message-view"></div>
                </div>
            );
        }
        //channel view
        else if (this.state.view == "channel"){
            return (
                <div className="channel-view">
                <ChannelMenu 
                    channel = {this.state.channel}
                    channels = {this.state.channels}
                    unreadMessages = {this.state.unreadMessages}
                    clickChannelHandler = {(i)=>this.changeUrl(i)}
                    triggerFormHandler = {()=>this.triggerChannelForm()}/> 
                <div className="message-view">
                <MessageView 
                    channel = {this.state.channel}
                    messages = {this.state.messages}
                    seeRepliesHandler = {(i)=> this.changeUrl(i)}/> 
                <PostMessage 
                    postMessageHandler = {()=>this.postNewMessage(this.state.channel)} 
                    unReadHandler = {()=>this.updateUnRead(this.state.channel)}/> 
                </div>
                </div>
            );
        }
        //new channel form view
        else if (this.state.view == "new channel") {
            return (
                <ChannelForm
                    createChannelHandler={()=>this.createChannel()}/>
            )
        }       
        //reply view
        else if (this.state.view == "replies") {
            return(
                <div className="channel-view">
                <ChannelMenu 
                    channel = {this.state.channel}
                    channels = {this.state.channels}
                    unreadMessages = {this.state.unreadMessages}
                    clickChannelHandler = {(i)=>this.changeUrl(i)}
                    triggerFormHandler = {()=>this.triggerChannelForm()}/> 
                <div className="message-view">
                <ReplyView 
                    channel = {this.state.channel}
                    //messageId = {this.state.messageId}
                    message = {this.state.message}
                    replies = {this.state.replies} 
                    backButtonHandler = {(i)=> this.changeUrl(i)}/> 
                <PostMessage 
                    postMessageHandler = {()=>this.postNewReply(this.state.messageId)} /> 
                </div>
                </div>
            );
        }

        else {
            return(
                <div> Error </div>
            );
        }  
    }
}


function LogInBox(props) {
    return (
        <div className="form-page">
            <h3>Please enter a username and password</h3>
            <p className="username"> username: <input id="username"></input> </p>
            <p className="password"> password: <input id="password"></input></p>
            <div className="login-buttons">
                <button className="login" onClick={props.loginHandler}>Login</button>
                <button className="create-user" onClick={props.newUserHandler}>Create Account</button>
            </div>
        </div>
    );
}


function ChannelForm(props) {
    return (
        <div className="form-page">
            <p><h3>What would you like to call your new channel?</h3></p>
            <p>Note: non-alphanumeric values will be removed</p>
            <p className="newchannel"> new channel name: <input id="newchannel"></input> </p>
            <button className="newchannel-button" onClick={props.createChannelHandler}>Submit</button>  
        </div>
    );
}


function ChannelMenu(props) {
    let buttonList = [];
    props.channels.forEach((name,index)=>{
        if (name == props.channel) {
            buttonList.push(<p key={index}><a id="selected" onClick={()=>props.clickChannelHandler(`/${name}`)}># {name}</a></p>)
        }
        else {
            if (props.unreadMessages[`${name}`] > 0) {
                buttonList.push(<p key={index}><a onClick={()=>props.clickChannelHandler(`/${name}`)}># {name} ({props.unreadMessages[`${name}`]})</a></p>)
            } else {
                buttonList.push(<p key={index}><a onClick={()=>props.clickChannelHandler(`/${name}`)}># {name}</a></p>)
            }
        }
    })
    return (
        <div className="channel-menu">
            <h2>Channels</h2>
            <div className="all-buttons"> 
                {buttonList}
                <button id = "final_button" onClick={props.triggerFormHandler}> 
                    + Create New Channel
                </button>
            </div>
        </div>
    );
}


function MessageView(props) {
    let messageList = [];
    props.messages.forEach((message,index)=>{
        let decoded_msg = decodeURI(message.body);
        //get images
        let urls = decoded_msg.match(/\bhttps?:\/\/\S+/gi);
        let imgList = [];
        let final_msg = decoded_msg;
        if (urls) {
            urls.forEach((url,url_index)=>{
                if (url.match(/^http[^\?]*.(jpg|jpeg|gif|png|tiff|bmp)(\?(.*))?$/gmi)) {
                    final_msg = final_msg.replace(url, '');
                    imgList.push(
                        <img key={url_index} src={url}></img>
                    )
                }
            });
        }
        if (message.num_replies > 0) {
                messageList.push(
                <div key={index}>
                    <p><auth id="author">{message.author}</auth> : <msg id="body">{final_msg}</msg></p>
                    {imgList}
                    <p><a id="reply_count" onClick={()=>props.seeRepliesHandler(`/${props.channel}/${message.id}`)}> {message.num_replies} replies </a></p>
                </div>
                )
            } else {
                messageList.push(
                <div key={index}>
                    <p><auth id="author">{message.author}</auth> : <msg id="body">{final_msg}</msg></p>
                    {imgList}
                    <p><a id="reply_count" onClick={()=>props.seeRepliesHandler(`/${props.channel}/${message.id}`)}> reply </a></p>
                    
                </div>
                )
            }
            
        })
    return (
        <div className="posted-messages">
            {messageList}
        </div>
    );
}


function PostMessage(props) {
    return (
        <div className="post-message"> 
            <form>
                <textarea id="new message" name="comment"></textarea>
                <button type="button" value="Post" onClick={props.postMessageHandler}>Post</button>
            </form>
        </div>
    )
}


function ReplyView(props) {
    let repliesList = [];
    //prep message replying to - get images
    let decoded_msg = decodeURI(props.message.msg_body);
    let urls = decoded_msg.match(/\bhttps?:\/\/\S+/gi);
    let msg_imgList = [];
    let final_msg = decoded_msg;
    if (urls) {
        urls.forEach((url,url_index)=>{
            if (url.match(/^http[^\?]*.(jpg|jpeg|gif|png|tiff|bmp)(\?(.*))?$/gmi)) {
                final_msg = final_msg.replace(url, '');
                msg_imgList.push(
                    <img key={url_index} src={url}></img>
                )
            }
        });
    }
    //prep replies list
    props.replies.forEach((reply,index)=>{
        let decoded_reply = decodeURI(reply.body);
        //get images
        let urls = decoded_reply.match(/\bhttps?:\/\/\S+/gi);
        let imgList = [];
        let final_reply = decoded_reply;
        if (urls) {
            urls.forEach((url,url_index)=>{
                if (url.match(/^http[^\?]*.(jpg|jpeg|gif|png|tiff|bmp)(\?(.*))?$/gmi)) {
                    final_reply = final_reply.replace(url, '');
                    imgList.push(
                        <img key={url_index} src={url}></img>
                    )
                }
            });
        }
        repliesList.push(
            <p key={index}>
                <auth id="author">{reply.author}</auth> : <msg id="body">{final_reply}</msg>
                <p>{imgList}</p>
            </p>)
    })
    return (
        <div className="posted-messages">
            <p id="message-for-replies">
                <span className="material-icons md-12" onClick={()=>props.backButtonHandler(`/${props.channel}`)}>arrow_back</span>
                <auth id="author">{props.message.msg_author}</auth>  : {final_msg}
                <p>{msg_imgList}</p>
            </p>
            <br />
            <br />
            Replies: 
            {repliesList}
        </div>
    );
}


ReactDOM.render(
    <Belay />,
    document.getElementById('root')
);


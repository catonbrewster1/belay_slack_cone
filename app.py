import string
from flask import Flask, render_template, request, session, jsonify, redirect
from functools import wraps
from uuid import uuid1
import time
import sqlite3
import bcrypt

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
CNET_ID = "cbrewster"

def valid_auth_key(auth_key):
    if not auth_key:
        return False
    connection = sqlite3.connect("db/belay.db")
    cursor = connection.cursor() 
    cursor.execute(
        "SELECT COUNT(*) from users WHERE auth_key == ?",
        (auth_key,))
    if cursor.fetchone()[0] == 0: 
        return False
    return True

def get_username(auth_key):
    connection = sqlite3.connect("db/belay.db")
    cursor = connection.cursor()
    cursor.execute(
            "SELECT username, count(*) FROM users WHERE auth_key == ?", 
            (auth_key,))
    user = cursor.fetchone()
    return user[0]


@app.route('/')
@app.route('/<channel>')
@app.route('/<channel>/<int:msg_id>')
def index(channel=None, msg_id=None):
    connection = sqlite3.connect("db/belay.db")
    cursor = connection.cursor()
    if channel: 
        #check valid channel
        cursor.execute(
            "SELECT COUNT(*) from channels WHERE channel_name == ?",
            (channel,))
        if cursor.fetchone()[0] == 0: 
            error_dict = {'code': 404, 
                    'status': 'error', 
                    "message": f"{channel} is not a valid channel"}
            return jsonify(error_dict), 404
    if msg_id: 
        #check valid message
        cursor.execute(
            "SELECT COUNT(*) from messages WHERE message_id == ?",
            (msg_id,))
        if cursor.fetchone()[0] == 0: 
            error_dict = {'code': 405, 
                    'status': 'error', 
                    "message": f"message ID {msg_id} not found"}
            return jsonify(error_dict), 405
        
    return app.send_static_file('index.html')


@app.route('/api/new_user/<username>', methods = ['POST'])
def add_new_user(username):
    auth_key = CNET_ID + str(uuid1())
    password = request.headers['password']
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    connection = sqlite3.connect("db/belay.db")
    cursor = connection.cursor()
    #add to users table
    try:     
        cursor.execute(
            "INSERT INTO users (username,password,auth_key) VALUES (?,?,?)", 
            (username, hashed_pw, auth_key))
    except sqlite3.IntegrityError as e: 
        print(f'in integrity error: {e}')
        return jsonify({"username_valid": False})
      
    #add to users_last_read table
    cursor.execute("INSERT INTO users_last_read (channel, username, last_read) " +  
                        "SELECT channel_name, ?, 0 from channels",
                    (username,))
    connection.commit()

    return jsonify({"username_valid": True, 
                        "auth_key": auth_key})

@app.route('/api/existing_user/<username>', methods = ['POST'])
def login_user(username):
    #get user info
    connection = sqlite3.connect("db/belay.db")
    cursor = connection.cursor()
    cursor.execute(
            "SELECT * FROM users WHERE username == ?", 
            (username,))
    user = cursor.fetchone()

    if not user:
        # username not found
        return jsonify({"username_found": False})
    
    _, saved_password, auth_key = user
    submitted_password = request.headers['password']
    if not bcrypt.checkpw(submitted_password.encode('utf-8'), saved_password):
        # wrong password
        return jsonify({"username_found": True,
                        "correct_pw": False})

    # logged in - return all info
    return jsonify({"username_found": True,
                    "correct_pw": True,
                    "auth_key": auth_key})

@app.route('/api/check_loggedin', methods = ['GET'])
def check_loggedin():
    auth_key = request.headers['auth_key']
    username = get_username(auth_key)
    if username: 
        return jsonify({"username": username})
    else: 
        return jsonify({"username": "invalid auth key"})
    
@app.route('/api/get_channels', methods = ['GET'])
def get_channels():
    auth_key = request.headers['auth_key']
    username = get_username(auth_key)
    
    #query database for channels
    time.sleep(0.5)
    connection = sqlite3.connect("db/belay.db")
    cursor = connection.cursor()
    cursor.execute(
            "SELECT channel_name FROM channels"
            )
    channels_tuples = cursor.fetchall()
    channels = [x[0] for x in channels_tuples]

    #query database for unread messages
    cursor.execute(
                "SELECT " +
                    "t.channel, " + 
                    "case when message_id is 0 then 0 else count(*) end num_read, " +
                    "t.last_read " +
                "FROM ( " +
                    "SELECT " + 
                        "case when m.message_id is null then 0 else (m.message_id) end message_id, " +
                        "ulr.channel, " +
                        "ulr.username, " + 
                        "ulr.last_read " +
                    "FROM users_last_read ulr " +
                    "LEFT JOIN messages as m " +
                    "ON ulr.channel = m.channel " +
                    "WHERE ulr.username = ?" +
                    ") as t "
                "WHERE t.message_id > t.last_read " +
                "GROUP BY t.channel",
                (username,))
    unread_tuples = cursor.fetchall()
    unread_messages = {}
    for x in unread_tuples:
        unread_messages[x[0]] = x[1]
    
    return jsonify({"channels": channels,
                    "unread_messages": unread_messages})

@app.route('/api/<channel>/get_messages', methods = ['POST'])
def get_messages(channel):
    auth_key = request.headers['auth_key']
    
    #check valid auth key
    if not valid_auth_key(auth_key):
        return 403

    #query database for messages
    time.sleep(0.5)
    connection = sqlite3.connect("db/belay.db")
    cursor = connection.cursor()
    cursor.execute(
            "SELECT m.message_id, m.author, m.body, r.thread_id, COUNT(*) " +
            "FROM messages as m LEFT JOIN replies as r ON m.message_id=r.message_id " + 
            "WHERE m.channel == ?" + 
            "GROUP BY m.message_id",
            (channel,))
    msg_tuples = cursor.fetchall()

    #if messages exist, since on channel currently, update user's last read message
    messages = []  
    if msg_tuples: 
        username = get_username(auth_key)
        last_read = msg_tuples[-1][0]
        cursor.execute(
                "UPDATE users_last_read SET last_read = ? where channel = ? and username = ?",
                (last_read, channel, username))
        messages = [{"id": x[0], 
                    "author": x[1], 
                    "body": x[2], 
                    "num_replies": x[4] if x[3] else 0} 
                for x in msg_tuples]
        connection.commit()

    return jsonify({"messages": messages})

@app.route('/api/get_msg_body/<int:msg_id>', methods = ['GET'])
def get_message_body(msg_id):
    #get message that replies are for
    connection = sqlite3.connect("db/belay.db")
    cursor = connection.cursor()
    cursor.execute(
            "SELECT author, body FROM messages WHERE message_id == ?",
            (msg_id,))
    msg_author, msg_body = cursor.fetchone()
    message = {"msg_author": msg_author,
                "msg_body": msg_body}
    return jsonify({"message": message})

@app.route('/api/get_replies/<int:msg_id>', methods = ['GET'])
def get_replies(msg_id):
    auth_key = request.headers['auth_key']
    #query database for messages
    time.sleep(0.5)
    connection = sqlite3.connect("db/belay.db")
    cursor = connection.cursor()
    cursor.execute(
            "SELECT author, body FROM replies WHERE message_id == ?",
            (msg_id,))
    reply_tuples = cursor.fetchall()
    replies = [{"author": x[0], 
                "body": x[1]} 
                for x in reply_tuples]
    return jsonify({"replies": replies})

@app.route('/api/<channel>/post_message', methods = ['POST'])
def post_message(channel):
    auth_key = request.headers['auth_key']
    if valid_auth_key(auth_key):
        body = request.headers['body']
        username = request.headers['author']
        
        #add new message to messages table
        connection = sqlite3.connect("db/belay.db")
        cursor = connection.cursor()
        cursor.execute(
                "INSERT INTO messages (author, body, channel) VALUES (?,?,?)", 
                (username, body, channel))
        connection.commit()
        return jsonify({"posted_message": True})
    return 403

@app.route('/api/post_reply/<int:msg_id>', methods = ['POST'])
def post_reply(msg_id):
    auth_key = request.headers['auth_key']
    if valid_auth_key(auth_key):
        body = request.headers['body']
        username = request.headers['author']
        
        #add new reply to replies table
        connection = sqlite3.connect("db/belay.db")
        cursor = connection.cursor()
        cursor.execute(
                "INSERT INTO replies (message_id, author, body) VALUES (?,?,?)", 
                (msg_id, username, body))
        connection.commit()
        return jsonify({"posted_reply": True})
    return 403

@app.route('/api/create/<channel_name>', methods = ['POST'])
def create_channel(channel_name):
    auth_key = request.headers['auth_key']
    if valid_auth_key(auth_key):
        username = get_username(auth_key)
        connection = sqlite3.connect("db/belay.db")
        cursor = connection.cursor()
        #add new channel to channels
        try:     
            cursor.execute(
                "INSERT INTO channels (channel_name) VALUES (?)", 
                (channel_name,))
        except sqlite3.IntegrityError as e: 
            print(f"in integriy error: {e}")
            return jsonify({"name_valid": False})
        
        #add new channel to users_last_read
        cursor.execute("INSERT INTO users_last_read (channel, username, last_read) " +  
                        "SELECT ?, username, 0 from users",
                    (channel_name,))
        connection.commit()
        return jsonify({"name_valid": True})
    return 403


# Run the app server
app.run(debug=True)
DROP TABLE IF EXISTS channels;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS replies;
DROP TABLE IF EXISTS users_last_read;


CREATE TABLE channels (
  channel_name VARCHAR(30) PRIMARY KEY
);


CREATE TABLE users (
  username VARCHAR(30) PRIMARY KEY,
  password VARCHAR(30) NOT NULL,
  auth_key VARCHAR(30) NOT NULL
);


CREATE TABLE messages (
  message_id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel VARCHAR(30) NOT NULL,
  author VARCHAR(30) NOT NULL,
  body TEXT NOT NULL,
  FOREIGN KEY(channel) REFERENCES channels(channel_name)
  FOREIGN KEY(author) REFERENCES users(username)
);


CREATE TABLE replies (
  thread_id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  author VARCHAR(30) NOT NULL,
  body TEXT NOT NULL,
  
  FOREIGN KEY(message_id) REFERENCES messages(message_id)
  FOREIGN KEY(author) REFERENCES users(username)
);


CREATE TABLE users_last_read (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel VARCHAR(30) NOT NULL,
  username VARCHAR(30) NOT NULL,
  last_read INTEGER NOT NULL,

  FOREIGN KEY(channel) REFERENCES channel(channel_name)
  FOREIGN KEY(username) REFERENCES users(username)
  FOREIGN KEY(last_read) REFERENCES messages(message_id)
);

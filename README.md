# Belay (a Slack clone)
Author: Caton Brewster


## How to Launch 
From within the project directory:
1. Run the following code in the command line to create the necessary tables in the database: 
    ```
    sqlite3 db/belay.db < db/20220307T160000_create_tables.sql
    ```

2. Run the following code in the command line to launch the server: 
    ```
    python app.py
    ```

3. Select the URL returned on the console to visit the site, e.g. "* Running on http://127.0.0.1:5000/ (Press CTRL+C to quit)"

## About Belay
Belay is a website that lets users send and read real-time chat messages that are organized into rooms called Channels. Any user can create a new channel by supplying a display name. The channel menu indicates how many new messages have been posted to that channel that the user hasn't read yet. Messages may be threaded as Replies in response to a message in a channel. Messages in the channel will display how many replies they have if that number is greater than zero. 

## Features of the Website
- Belay is a single-page web application. It serves a single HTML request on load
  and does not refresh the page as the user navigates the site. 
- Belay is served by a Flask API.
- All data about users, channels, and messages is stored in a SQLite database.
- Other than loading the initial page and serving static content like scripts,
  stylesheets, and images, all interaction with the Belay server is handled via
  JSON API requests. 
- Users must sign up and login using a unique username and password. User authentication persists even when browser is closed and reopened.
- Asynchronous Request Handling: Belay automatically sends non-blocking requests to the server to check for new channels and new messages in a channel. 
- Users can use the Back button to navigate to a previous channel or thread

## References
* https://stackoverflow.com/questions/49684217/how-to-use-fetch-api-in-react-to-setstate
* https://hackersandslackers.com/flask-sqlalchemy-database-models/
* https://pythonbasics.org/flask-sqlalchemy/
* https://hackersandslackers.com/flask-sqlalchemy-database-models/
* https://flask-sqlalchemy.palletsprojects.com/en/2.x/queries/#querying-records
* https://stackoverflow.com/questions/13613037/is-this-python-code-vulnerable-to-sql-injection-sqlite3
* https://www.digitalocean.com/community/tutorials/how-to-use-the-sqlite3-module-in-python-3
* https://www.pluralsight.com/guides/how-to-implement-a-component-%22loop%22-with-react
* https://stackoverflow.com/questions/19848697/css-grid-where-one-column-shrinks-to-fit-content-the-other-fills-the-remaning-s
* https://www.pluralsight.com/guides/how-to-send-state-of-current-component-as-a-parameter-to-another-external-method-using-react
* https://stackoverflow.com/questions/33211233/how-to-detect-and-get-url-on-string-javascript
* https://thewebdev.info/2021/08/15/how-to-verify-that-an-url-is-an-image-url-with-javascript/![image](https://user-images.githubusercontent.com/84205874/157917209-bc292747-2b03-4d75-9444-377fa9125be9.png)

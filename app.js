/**
 * @desc This file is for starting the backend in Express for our Senior Project design
 * @authors David Naumann and Mackenzie Wisdom
 *
 */

// Variables for starting http server
const app = require('express');
const httpServer = require("http").createServer(app);


// Database variables
const mysql = require('mysql');
let useMySQL = true;

// Arduino control variables
const SerialPort  = require('serialport');
const serial_port = new SerialPort('/dev/ttyACM0');


// Setups socket.io to run across the http server and be setup to accept requests from localhost:3000 origin
const io = require("socket.io")(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
  }
});

// Uses either default mysql values or uses production values from .env file (if it exists)
const connection_info = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'test',
  port: process.env.DB_PORT || '3306'
};

const DB_TABLE = process.env.DB_TABLE || 'files';

// creates mysql connection
// TODO: possibly local file caching if mySQL isn't working
// TODO: change sql_files to dictionary by uuid instead
let connection = mysql.createConnection(connection_info);


console.log("Starting initial connection to database.");

// start initial connection to mySQL database
connection.connect(function (error) {
  if (error) {
    return console.error("Error connecting to initial connection to database!");
  }

  console.log("Successful connection to database.");
});


let sql_files = [];

console.log("Calling SELECT on " + DB_TABLE + " table.");

// Initial connection to receive current mySQL table
connection.query('SELECT * FROM ' + DB_TABLE, function (error, res) {
  if (error) {
    return console.error("Error on SELECT on " + DB_TABLE + " table!");
  }

  console.log("Successful initial SELECT from " + DB_TABLE + " table.");
  let res_string = JSON.stringify(res);
  let res_json = JSON.parse(res_string);

  sql_files = res_json;
});

// Gets that the user connected
io.on('connection', (socket) => {
  console.log('User connected. Hi User :)');

  /** General socket functions **/

  // On initial connection get files is called to keep front end up to date
  socket.on('get files', () => {
    socket.emit('receive files', sql_files);
  });

  // Updates all of sockets to the newest files object
  socket.on('sent files', (files) => {
    sql_files = files;
    io.sockets.emit('receive files', files);
  });

  /** Direct MySQL functions **/

  // Inserts file object into the mySQL table
  socket.on('insert file', (file) => {
    // TODO: POST to Arduino
    console.log('Inserting file.');

    const mysql_arr = [[file.name, file.category, file.date, file.uuid]];

    serial_port.write('insert', function(serial_error) {

      if (serial_error) {
        return console.error("Error on INSERT function on serial connection");
      }

      //  serial connection successful insert into database

      connection.query("INSERT INTO " + DB_TABLE + " (name, category, date, uuid) VALUES (?)", mysql_arr, (error) => {
        if (error) {
          return console.error("Error on INSERT INTO on " + DB_TABLE + " table!");
        }

        console.log('File successfully inserted.');

        sql_files.push(file);
        io.sockets.emit('receive files', sql_files);
      });
    });

  });

  // Deletes file that has uuid
  socket.on('delete file', (uuid) => {
    // TODO: DELETE to Arduino
    console.log("Deleting file with uuid: ", uuid);

    const SQL = "DELETE FROM "+ DB_TABLE +" WHERE uuid = ?";


    serial_port.write('delete', function(serial_error) {


      if (serial_error) {
        return console.error("Error on DELETE function on serial connection");
      }

      connection.query(SQL, uuid, (error) => {
        if (error) {
          return console.error("Error on DELETE FROM on " + DB_TABLE + " table!");
        }

        console.log("File successfully deleted with uuid: ", uuid);

        // Filters sql_files to get rid of object with given uuid
        sql_files = sql_files.filter(function (e) {
          return e.uuid !== uuid
        });

        io.sockets.emit('receive files', sql_files);
      });
    });

  });

  // logs that user disconnected (for debugging sake)
  socket.on('disconnect', () => {
    console.log('User disconnected. Bye user :(');
  });

});

// Starts httpServer on port 4001 for the backend
const port = 4001;
httpServer.listen(port, () => console.log('Starting HTTP listening server on port ' + port.toString() + '.'));


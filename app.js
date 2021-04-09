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
// TODO: local caching
// let useMySQL = true;

// Arduino control variables (port and position of file)
const SerialPort  = require('serialport');
const serial_port = new SerialPort('COM4');
let pos = 0;

let sql_files = [];

// create arrays and max positions available
let rows = new Array(2).fill([]);
const MAX_POS = 3;

// push that all positions are available
for(let i = 0; i < MAX_POS; i++)
{
  rows[0].push(i);
}


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


console.log("Calling SELECT on " + DB_TABLE + " table.");

// Initial connection to receive current mySQL table
connection.query('SELECT * FROM ' + DB_TABLE, function (error, res) {
  if (error) {
    return console.error("Error on SELECT on " + DB_TABLE + " table!");
  }

  console.log("Successful initial SELECT from " + DB_TABLE + " table.");
  let res_string = JSON.stringify(res);

  sql_files = JSON.parse(res_string);

  let len = sql_files.length;

  for(let i = 0; i < len; i++) {
    rows[0] = rows[0].filter(function (item) {
      return item !== sql_files[i].pos;
    });
  }

});

// Gets that the user connected
io.on('connection', (socket) => {
  console.log('User connected. Hi User :)');

  /** General socket functions **/

  // On initial connection get files is called to keep front end up to date
  socket.on('get files', () => {
    console.log(sql_files);
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

    console.log("inserting file");

    let drawer = file.drawer - 1;
    let len = rows[drawer].length;
    let mode = "0";

    // calculate rows and position based on drawer

    if (len !== 0) {
      pos = rows[0][0];
    } else {
      return console.error("DRAWER FULL");
    }

    file["pos"] = pos;

    // create array with all of data in it for the row
    const mysql_arr = [[file.name, file.category, file.date, file.creation_date, file.uuid, file.drawer, pos]];


    // Insert query on to database
    connection.query("INSERT INTO " + DB_TABLE + " (name, category, date, creation_date, uuid, drawer, pos) VALUES (?)", mysql_arr, (error) => {
      if (error) {
        return console.log("Error on INSERT INTO on " + DB_TABLE + " table!");
      }

      //  serial connection successful insert into database
      let serial_string = mode + "\n" + pos.toString() + "\n";
      console.log(serial_string);
      serial_port.write(serial_string, function (serial_error) {

        if (serial_error) {
          return console.log("Error on INSERT function on serial connection");
        }


        console.log('File successfully inserted.');

        // push to sql_files array, remove position from available positions and emit sql_files
        sql_files.push(file);

        rows[0] = rows[0].filter(item => item !== pos);
        io.sockets.emit('receive files', sql_files);
      });
    });
  });

  // Deletes file that has uuid
  socket.on('delete file', (uuid) => {

    // SQL statement prep
    const SQL = "DELETE FROM " + DB_TABLE + " WHERE uuid = ?";

    let sql_file = sql_files.find(element => element.uuid === uuid);
    pos = sql_file.pos;
    const drawer = sql_file.drawer;
    const mode = "0";

    connection.query(SQL, uuid, (error, results) => {
      if (error) {
        return console.log("Error on DELETE FROM on " + DB_TABLE + " table!");
      }

      // prep serial string for writing to serial
      let serial_string = mode + "\n" + pos.toString() + "\n";

      serial_port.write(serial_string, function(serial_error) {
        if (serial_error) {
          return console.log("Error on DELETE function on serial connection");
        }

        console.log("File successfully deleted with uuid: ", uuid);

        // Filters sql_files to get rid of object with given uuid
        sql_files = sql_files.filter(function (e) {
          return e.uuid !== uuid
         });


        // push position back to rows and sort!
        rows[0].push(pos);
        rows[0].sort();

        // emit new sql_files to front end for user consumption
        io.sockets.emit('receive files', sql_files);
      });
    });
  });

  socket.on('close', () => {
    // set mode to close mode
    let mode = "1";
    // grab led position
    let led = pos.toString();

    // create serial string
    let serial_str = mode + '\n' + led + '\n';

    serial_port.write(serial_str, function (serial_error) {
      if(serial_error){
        return console.log(serial_error);
      }

      console.log('closing drawer');

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


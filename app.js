const app = require('express');
const httpServer = require("http").createServer(app);
const mysql = require('mysql');
//TODO: johnny-five for serial connections


/*
  Notes:
    Schema:

 */


// Setups socket.io to run across the http server and be setup to accept requests from localhost:3000 origin
const io = require("socket.io")(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
  }
});

// TODO: make connection info more private
const connection_info = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'test',
  port: process.env.DB_PORT || '3306'
};

const DB_TABLE = process.env.DB_TABLE || 'files';

console.log(connection_info);

let connection = mysql.createConnection(connection_info);

const port = 4001;

connection.connect();

// TODO: possibly local file caching if mySQL isn't working
// TODO: change sql_files to dictionary by uuid instead

let sql_files = [];

// Initial connection to receive current mySQL table
connection.query('SELECT * FROM ' + DB_TABLE, function (error, res, req) {
  if (error) throw error;
  let res_string = JSON.stringify(res);
  let res_json = JSON.parse(res_string);

  sql_files = res_json;
});

// Gets that the user connected
io.on('connection', (socket) => {
  console.log('user connected');

  /** General socket functions **/

  // On initial connection get files is called to keep front end up to date
  socket.on('get files', () => {
    console.log('got files from front end');

    socket.emit('receive files', sql_files);
  });

  // Updates all of sockets to the newest files object
  socket.on('sent files', (files) => {
    sql_files = files;
    io.sockets.emit('receive files', files);
  });

  /** Direct mySQL functions **/

  // Inserts file object into the mySQL table
  socket.on('insert file', (file) => {
    // TODO: POST to Arduino
    console.log('file inserted');

    const mysql_arr = [[file.name, file.category, file.date, file.uuid]];

    connection.query("INSERT INTO "+ DB_TABLE +" (name, category, date, uuid) VALUES (?)", mysql_arr, (error, results) => {
      if (error) throw error;

      sql_files.push(file);
      console.log(sql_files);
      io.sockets.emit('receive files', sql_files);
    });

  });

  // Deletes file that has uuid
  socket.on('delete file', (uuid) => {

    console.log("deleting file with uuid: ", uuid);

    const SQL = "DELETE FROM "+ DB_TABLE +" WHERE uuid = ?";

    connection.query(SQL, uuid, (error, results, fields) => {
      if (error) throw error;

      sql_files = sql_files.filter(function(e) { return e.uuid !== uuid});

      io.sockets.emit('receive files', sql_files);
    });

  });

  // logs that user disconnected (for debugging sake)
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

});

httpServer.listen(port, () => console.log('listening on port ' + port.toString()));


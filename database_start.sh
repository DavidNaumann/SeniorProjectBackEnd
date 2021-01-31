#!/bin/bash
# Bash script written by Saad Ismail - me@saadismail.net

echo "Please enter main username (most likely root)"
read -r mainuser
echo "Please enter root user MySQL password!"
echo "Note: password will be hidden when typing"
read -r rootpasswd

echo "Please enter host (most likely localhost)"
read -r DB_HOST
echo "Please enter port (most likely 3306)"
read -r DB_PORT

echo "Please enter the NAME of the new MySQL database! (example: database1)"
read -r DB_NAME
echo "Creating new MySQL database..."
mysql -u ${mainuser} -p ${rootpasswd} -e "CREATE DATABASE ${DB_NAME} /*\!40100 DEFAULT CHARACTER SET latin1 */;"
echo "Database successfully created!"
echo "Showing existing databases..."
mysql -u ${mainuser} -p ${rootpasswd} -e "show databases;"
echo ""
echo "Please enter the NAME of the new MySQL database user! (example: user1)"
read -r DB_USER
echo "Please enter the PASSWORD for the new MySQL database user!"
echo "Note: password will be hidden when typing"
read -r -s DB_PASSWORD
echo "Creating new user..."
mysql -u ${mainuser} -p ${rootpasswd} -e "CREATE USER ${username}@localhost IDENTIFIED BY '${userpass}';"
echo "User successfully created!"
echo ""
echo "Granting ALL privileges on ${dbname} to ${username}!"
mysql -u ${mainuser} -p ${rootpasswd} -e "GRANT ALL PRIVILEGES ON ${dbname}.* TO '${username}'@'localhost';"
mysql -u ${mainuser} -p ${rootpasswd} -e "FLUSH PRIVILEGES;"

echo "Please enter name of database table that will be used"
read -r DB_TABLE;


mysql -u ${mainuser} -p ${rootpasswd} -e "CREATE TABLE '${DB_TABLE}' ( 'id' int(11) NOT NULL, 'name' varchar(40) NOT NULL, 'category' varchar(40) NOT NULL, 'date' varchar(40) NOT NULL, 'uuid' varchar(40) NOT NULL) DEFAULT CHARSET=latin1;"
mysql -u ${mainuser} -p ${rootpasswd} -e "ALTER TABLE '${DB_TABLE}' ADD PRIMARY KEY ('id');"
mysql -u ${mainuser} -p ${rootpasswd} -e "ALTER TABLE '${DB_TABLE}' MODIFY 'id' int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=0; COMMIT;"


export DB_HOST;
export DB_USER;
export DB_PASSWORD;
export DB_NAME;
export DB_TABLE;
export DB_PORT;
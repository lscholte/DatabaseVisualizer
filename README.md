# The Best DB Visualizer Tool Ever Made Ever. Period.

This is a pretty cool db visualization tool. It lets you visualize a db. Yup.

## Node Setup

1. Install the latest version of [Node](https://nodejs.org/) (at the time of writing, 7.4.0).
2. Clone the repo with git.
3. Navigate to the repo folder and run `npm install`
4. Once that finishes, run `node index.js`
5. The console should show a message that it is listening on port 3000, go to <http://localhost:3000/> and verify that you can see the test page.

Note, to run app on a different port, add a command line argument for the port you want. For instance, `node index.js 80` would run the app on port 80.

## DB Setup

1. Ensure that MySQL is installed and functional on your local machine (the mechanism for this differs by OS).

2. Create a new superuser - it's not a good practice to routinely use `root` as a user.<br>
  `mysql -uroot -p;`<br>
  `CREATE USER 'seng371'@'localhost' IDENTIFIED BY 'seng_pass';`<br>
  `GRANT ALL PRIVILEGES ON *.* TO 'seng371'@'localhost' WITH GRANT OPTION;`

3. Download and extract database information<br>
  `wget https://github.com/datacharmer/test_db/archive/master.zip;`<br>
  `unzip master.zip;`

4. Create and populate the sample MySQL **employees** database:<br>
  `cd test_db-master/`<br>
  `mysql -useng371 -pseng_pass -t < ./employees.sql`

5. Verify data integrity<br>
  `time mysql -useng371 -pseng_pass -t < ./test_employees_sha.sql`<br>
  `time mysql -useng371 -pseng_pass -t < ./test_employees_md5.sql`

6. Start the node app<br>
  `node index.js`

7. Open your browser to <http://localhost:3000/> and verify that you can use the tool. Try making a new project using `localhost` as the database ip, `3306` as the port, `seng371` as the username, `seng_pass` as the password, and `employees` as the database. If everything is set up properly you should be able to view that project without issues.

The `employees` database has the following schema (note, this is not generated with this tool, but was provided by the creators of the database):

![](media/employees-schema.png)

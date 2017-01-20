# The Best DB Visualizer Tool Ever Made Ever. Period.

This is a pretty cool db visualization tool. It lets you visualize a db. Yup.

## Node Setup

1. Install the latest version of [Node](https://nodejs.org/) (at the time of writing, 7.4.0).
2. Clone the repo with git.
3. Navigate to the repo folder and run `npm install`
4. Once that finishes, run `node index.js`
5. The console should show a message that it is listening on port 3000, go to <http://localhost:3000/> and see if you can see the test page.


## DB Setup

1. Ensure that MySQL is installed and functional on your local machine (the mechanism for this differs by OS).

2. Download and extract database information
`wget https://github.com/datacharmer/test_db/archive/master.zip;`
`unzip master.zip;`

3. Create and populate the sample MySQL **employees** database:
`cd test_db-master/;`
`mysql -p -uroot -t < employees.sql;` <-- you should probably use a non-root user, but meh.

4.  Verify data integrity
`time mysql -p -uroot -t < test_employees_sha.sql;`
`time mysql -p -uroot -t < test_employees_md5.sql;`

The `employees` database has the following schema:

![](employees-schema.png)

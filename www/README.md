## Architecture:

1. Apache: exposes server to internet by forwarding requests to the server which listens on `localhost:8000`, as well as handling NetID authentication. Apache files and confs are in `etc/apache2/` in the production server.
2. Server: implemented in GoLang, in `home/dzy4/go/pathways-vis/www/` on the production server. Data is stored in JSON format. 
3. Client: makes several types of requests to the server, such as: load core courses, generate recommendations, logging (our logging flow requires the client to tell the server to log something). The frontend is built using webpack, and uses SASS, Bootstrap/JQuery, and D3 in addition to several other JS libraries.

#### Source Files:

- Server: `pathways_server.go` gets compiled to the `pathways_server` executable.

- Client: Javascript `src/*.js` and SCSS `style/*.scss` get bundled by Webpack  into `static/dist/*.bundle.js` and `static/style/*.css` which is what gets actually loaded by the webapp. Making changes to the client code requires rebuilding. HTML source files are in `static/` as well; changing those does not require rebuilding.

## Requirements:

- Node.js
- all required javascript packages in `package.json`
- GoLang
- SQlite3
- Golang SQLITE3 package (`go get github.com/mattn/go-sqlite3` then `go install github.com/mattn/go-sqlite3`) (note that you need GCC and cgo needs to be enabled, for details see https://github.com/mattn/go-sqlite3)

### Note: due to the odd permissions setup on the server, it is probably best to run `sudo bash` after you log in and use the root shell for everything

## To set up SQL database for logging: (THIS ONLY NEEDS TO BE DONE ONCE)
- create a new DB in `www/logging` using `sqlite3 pathways_logging.db`
- run `.databases` and verify the DB exists, then use `.quit` to exit the sqlite CLI; also verify that the DB file actually exists
- compile using `go build logging_setup.go` and run `./logging_setup`
- open the DB again (`sqlite3 pathways_logging.db`) and run `.tables` to make sure the logs table exists
- if the logs table does not exist then you can create it manually using `CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, user TEXT, log TEXT)`

## To inspect logs (note: DB is not shared, so to read user data you need to inspect the log on production server)
- cd into `www/logging`
- `sqlite3 pathways_logging.db`
- `select * from logs;`
- exit with `.quit`

## To Re-deploy the Site:
1. push your changes
2. ssh into the server `ssh <netid>@pathway.cis.cornell.edu`
3. make sure apache is running and no processes with name `pathways_server` are running (loading the page should yield 403) - you do NOT need to do anything to apache if no changes were made to the config file (to kill the running server, you can do `sudo killall pathways_server`)
4. go to `home/dzy4/go/pathways-vis/www` and pull the changes from Github
5. `make clean` and `make build` to compile the changes (note that the `make` commands may need to be prefixed with sudo)
6. `tmux`
7. `make run` to start the server
8. `ctrl+b` then `d` (detach the terminal) to exit without killing the process. Verify that the new version is running; it is now safe to exit the ssh session.

## Troubleshooting:
- various permission denied errors: use the root shell or prefix commands with sudo/give yourself permissions for files using `sudo chmod +rwx <filename>`
- logging_setup segfaults if the DB doesn't exist
- logging fails (without crashing the server) if the logs table does not exist
- tmux detaching: the keypresses need to be `ctrl+b` at the same time, with `ctrl` being pressed first. then let go of both keys and press `d`


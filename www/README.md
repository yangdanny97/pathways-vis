Architecture:

1. Apache: exposes server to internet by forwarding requests to the server which listens on `localhost:8000`, as well as handling NetID authentication. Apache files and confs are in `etc/apache2/`.
2. Server: implemented in GoLang, in `home/dzy4/go/pathways-vis/www/`. Data is stored in JSON format. 
3. Client: makes several types of requests to the server, such as: load core courses, generate recommendations, logging (our logging flow requires the client to tell the server to log something, then the server logs it to StackDriver).

Requirements:
- Node.js
- whatever packages we listed in the `package.json`
- GoLang
- Google Cloud logging package (install with `go get -u cloud.google.com/go/logging`)

To Re-deploy the Site:
1. push your changes
2. ssh into the server `ssh <netid>@pathway.cis.cornell.edu`
3. make sure apache is running and no processes with name `pathways_server` are running (if both are true, then loading the page should yield 403) - apache does not need to be restarted if no changes were made to the config file
4. go to `home/dzy4/go/pathways-vis/www` and pull the changes
5. `make clean` and `make build` to compile the changes (note that the `make` commands may need to be prefixed with sudo)
6. `tmux`
7. `make run` to start the server
8. `ctrl+b d` (detach the terminal) to exit the tmux without killing the process. It is now safe to exit the ssh session.


package main

import (
	"database/sql"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	database, _ := sql.Open("sqlite3", "./pathways_logging.db")
	statement, _ := database.Prepare("CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, user TEXT, log TEXT)")
	statement.Exec()
}
